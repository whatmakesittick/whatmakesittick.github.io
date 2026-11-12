import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import type { Object3D, Sprite } from 'three';
import type { AssemblyState, Point } from '../../../ids';
import {
  BEAM_TRANSPORT,
  BEAM_WAYPOINTS,
  COLLECTOR,
  mirrorSizeM,
  waypoint,
} from '../../../model/layout';
import { legLengths } from '../../../model/path';
import { THEME } from '../../../theme';
import { BEAM_GROUP } from '../../sceneOptions';
import { namedGroup, registeredMaterial } from '../context';
import { glowSprite, pipe } from '../kit';
import type { PartContext } from '../context';
import { BOUNCE_GLOW, CONE, EUV, GUIDE_LEVEL, LASER, MAIN_PULSE_UNITS } from './dims';
import { chainMetres, coneLevel, displayLevel, laserLevel } from './levels';
import { LegSet } from './segments';

const CHAIN: readonly Point[] = BEAM_WAYPOINTS.slice(1).map((entry) => entry.point);
const LEG_STARTS: readonly number[] = legLengths(CHAIN).map((_, leg, lengths) =>
  lengths.slice(0, leg).reduce((sum, length) => sum + length, 0),
);
const MIRRORS = CHAIN.map((point, index) => ({
  point,
  index,
  id: BEAM_WAYPOINTS[index + 1].id,
})).filter((_, index) => BEAM_WAYPOINTS[index + 1].bounce);
const BEND_M = 0.25;
const EUV_COLOR = new Color('#8fa0ff');
const LASER_COLOR = new Color(THEME.laser);
const WHITE = new Color('#ffffff');
const GLOW_SHARE = 0.7;
const LASER_GLOW_SHARE = 0.45;
const HALF = 0.5;

function additive(color: Color, extra: Partial<MeshBasicMaterial> = {}): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    ...extra,
  });
}

export class BeamPart {
  readonly object: Object3D = namedGroup('beam');
  private readonly laserMaterials: MeshBasicMaterial[];
  private readonly core: LegSet;
  private readonly glow: LegSet;
  private readonly coneMaterial: MeshBasicMaterial;
  private readonly bounceGlows: Sprite[];
  private closeUp = 1;

  constructor(context: PartContext) {
    const { laser, materials } = this.buildLaser(context);
    this.laserMaterials = materials;
    this.core = new LegSet(CHAIN, EUV.coreRadius, EUV.sides);
    this.glow = new LegSet(CHAIN, EUV.glowRadius, EUV.sides);
    [this.core, this.glow].forEach((set) => {
      const material = registeredMaterial(
        context,
        BEAM_GROUP,
        additive(WHITE, { vertexColors: true }),
      );
      this.object.add(new Mesh(context.tracker.track(set.geometry), material));
    });
    this.coneMaterial = additive(EUV_COLOR, { side: DoubleSide, vertexColors: true, opacity: 0 });
    const cone = this.buildCone(context);
    this.bounceGlows = MIRRORS.map(({ point }) => {
      const sprite = glowSprite(context, BEAM_GROUP, BOUNCE_GLOW.color, 1);
      sprite.position.set(...point);
      return sprite;
    });
    this.object.add(...laser, cone, ...this.bounceGlows);
  }

  setState(state: AssemblyState): void {
    this.object.visible = state.view.beam;
    this.paintLaser(laserLevel(state.flash.units));
    this.paintLegs(state);
    this.sizeGlows(state);
    this.coneMaterial.opacity = coneLevel(state.flash.units) * CONE.peak;
  }

  fit(closeUp: number, state: AssemblyState): void {
    this.closeUp = closeUp;
    this.core.thin(closeUp);
    this.glow.thin(closeUp);
    this.sizeGlows(state);
  }

  private buildLaser(context: PartContext): { laser: Mesh[]; materials: MeshBasicMaterial[] } {
    const radii = [LASER.coreRadius, LASER.glowRadius];
    const colors = [LASER_COLOR.clone().lerp(WHITE, LASER.coreMix), LASER_COLOR];
    const materials = colors.map((color) =>
      registeredMaterial(context, BEAM_GROUP, additive(color, { opacity: 0 })),
    );
    const laser = radii.map(
      (radius, index) =>
        new Mesh(context.tracker.track(pipe(BEAM_TRANSPORT, radius, BEND_M)), materials[index]),
    );
    return { laser, materials };
  }

  private buildCone(context: PartContext): Mesh {
    const rim: Point = [COLLECTOR.rimX, waypoint('plasma')[1], 0];
    const focus = waypoint('focus');
    const height = focus[0] - rim[0];
    const geometry = new ConeGeometry(COLLECTOR.rimRadius, height, CONE.sides, 1, true);
    const positions = geometry.getAttribute('position');
    const colors = new Float32BufferAttribute(positions.count * 3, 3);
    for (let index = 0; index < positions.count; index += 1) {
      const level = CONE.floor + (1 - CONE.floor) * (positions.getY(index) / height + HALF);
      colors.setXYZ(index, level, level, level);
    }
    geometry.setAttribute('color', colors);
    const cone = new Mesh(
      context.tracker.track(geometry),
      registeredMaterial(context, BEAM_GROUP, this.coneMaterial),
    );
    cone.rotation.z = -Math.PI / 2;
    cone.position.set(rim[0] + height * HALF, rim[1], 0);
    return cone;
  }

  private paintLaser(level: number): void {
    this.laserMaterials[0].opacity = level;
    this.laserMaterials[1].opacity = level * LASER_GLOW_SHARE;
  }

  private paintLegs(state: AssemblyState): void {
    const flashed = state.flash.units >= MAIN_PULSE_UNITS;
    const reached = chainMetres(state);
    const lit = LEG_STARTS.map((start) => flashed && reached >= start);
    const levels = lit.map((on, leg) => (on ? displayLevel(leg) : GUIDE_LEVEL));
    this.core.paint(levels, EUV_COLOR.clone().lerp(WHITE, EUV.coreMix));
    this.glow.paint(levels, EUV_COLOR, GLOW_SHARE);
    MIRRORS.forEach(({ index }, spot) => {
      const glow = this.bounceGlows[spot];
      glow.visible = lit[index];
      glow.material.opacity = displayLevel(index) * BOUNCE_GLOW.peak;
    });
  }

  private sizeGlows(state: AssemblyState): void {
    MIRRORS.forEach(({ id }, spot) =>
      this.bounceGlows[spot].scale.setScalar(
        mirrorSizeM(id, state.optics) * BOUNCE_GLOW.share * this.closeUp,
      ),
    );
  }
}
