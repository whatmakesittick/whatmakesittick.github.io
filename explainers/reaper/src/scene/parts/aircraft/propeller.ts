import { CircleGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial } from 'three';
import type { BufferGeometry } from 'three';
import { FULL_TURN, smoothstep } from '@core/math';
import { latheAlongX, sampleProfile } from '@core/scene/geometry/lathe';
import { PROPELLER } from '../../constants';
import { FINISHES } from '../../finishes';
import { airfoilSurface } from '../../geometry/airfoilSurface';
import type { LoopPoint, Station } from '../../geometry/airfoilSurface';
import { discTexture } from '../../geometry/surfaceMaps';
import { mergeParts, partMesh, registered } from '../context';
import type { PartContext } from '../context';

const BLADE_CAMBER = 0.04;
const DISC_SEGMENTS = 48;
const DISC_TINT = '#9aa1aa';

function bladeStation(radius: number, chord: number, pitch: number, thickness: number): Station {
  const chordAxis = [Math.sin(pitch), 0, -Math.cos(pitch)] as const;
  const lead = PROPELLER.pitchAxisShare * chord;
  return {
    leadingEdge: [-chordAxis[0] * lead, radius, -chordAxis[2] * lead],
    chordAxis,
    normalAxis: [Math.cos(pitch), 0, Math.sin(pitch)],
    chord,
    thickness,
    camber: BLADE_CAMBER,
  };
}

function bladesGeometry(loop: readonly LoopPoint[]): BufferGeometry {
  const stations = PROPELLER.stations.map(({ radius, chord, pitch, thickness }) =>
    bladeStation(radius, chord, pitch, thickness),
  );
  return mergeParts(
    Array.from({ length: PROPELLER.blades }, (_, index) => {
      const blade = airfoilSurface(stations, loop);
      blade.rotateX((index / PROPELLER.blades) * FULL_TURN);
      return blade;
    }),
  );
}

function spinnerGeometry(): BufferGeometry {
  const centre = PROPELLER.centre[0];
  const profile = sampleProfile(
    PROPELLER.spinner.map(([x, radius]) => [x - centre, radius] as const),
    PROPELLER.spinnerSamples,
  );
  return latheAlongX(profile, PROPELLER.spinnerSegments);
}

export class PropellerPart {
  readonly object = new Group();
  private readonly blades: Mesh;
  private readonly disc: Mesh;
  private readonly discMaterial: MeshBasicMaterial;
  private rate = 0;

  constructor(context: PartContext, loop: readonly LoopPoint[]) {
    this.object.position.set(...PROPELLER.centre);
    this.blades = partMesh(context, bladesGeometry(loop), 'propeller', FINISHES.blade);
    this.discMaterial = registered(
      context,
      'propeller',
      new MeshBasicMaterial({
        color: DISC_TINT,
        map: context.tracker.track(discTexture(PROPELLER.disc)),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    const disc = context.tracker.track(new CircleGeometry(PROPELLER.radius, DISC_SEGMENTS));
    disc.rotateY(Math.PI / 2);
    this.disc = new Mesh(disc, this.discMaterial);
    this.object.add(
      this.blades,
      partMesh(context, spinnerGeometry(), 'propeller', FINISHES.spinner),
      this.disc,
    );
  }

  setRate(rate: number): void {
    this.rate = rate;
    const blur = smoothstep(rate, PROPELLER.blurFrom, 1);
    this.discMaterial.opacity = PROPELLER.blurOpacity * blur;
    this.disc.visible = blur > 0;
  }

  advance(deltaSeconds: number): void {
    this.blades.rotation.x =
      (this.blades.rotation.x + PROPELLER.spinRate * this.rate * deltaSeconds) % FULL_TURN;
  }
}
