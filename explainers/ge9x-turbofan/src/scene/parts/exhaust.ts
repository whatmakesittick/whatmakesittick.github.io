import {
  AdditiveBlending,
  Color,
  Float32BufferAttribute,
  NormalBlending,
  Sprite,
  SpriteMaterial,
} from 'three';
import type { BufferGeometry, Group, Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lerp, toRadians } from '@core/math';
import { EFFECT_LOOK, HEAT_LOOK, LOOK, SEGMENTS } from '../constants';
import { HEAT_IDLE } from '../../model/heat';
import { THEME } from '../../theme';
import { FINISHES } from '../finishes';
import { HOT_NOZZLE, STATION_X, cowlAt, reversed, sampled } from '../geometry/profiles';
import { line, revolve, smooth } from '../geometry/revolve';
import type { ProfilePoint, Strand } from '../geometry/revolve';
import type { PartContext } from './context';
import {
  coreMaterial,
  glowScale,
  material,
  label,
  mesh,
  namedGroup,
  polar,
  registered,
} from './context';
import { plumeMaterial } from './effects';
import { NOZZLE_PANELS, PLUG_PANELS, applyPanels } from './panels';
import { applyHeat, withHeatProfile } from './heat';

const NOZZLE_FRONT = 2.1;
const PLUME_GLOW = {
  offset: 0.22,
  shortest: 0.62,
  longest: 1.55,
  thinnest: 0.88,
  smallest: 0.7,
  largest: 1.9,
  dimmest: 0.25,
  brightest: 0.85,
} as const;
const PLUG_FRONT = 2.05;
const NOZZLE_SAMPLES = 12;

const PLUG_SURFACE: readonly ProfilePoint[] = [
  [PLUG_FRONT, HOT_NOZZLE.plugFront],
  [2.35, 0.525],
  [STATION_X.hotExit, HOT_NOZZLE.plugExit],
  [3.08, 0.25],
  [STATION_X.plugTip, 0.002],
];

const HOT_PLUME_OUTER: readonly ProfilePoint[] = [
  [STATION_X.hotExit, 0.58],
  [3.3, 0.6],
  [3.9, 0.68],
  [4.6, 0.8],
];

const HOT_PLUME_CORE: readonly ProfilePoint[] = [
  [STATION_X.hotExit, 0.46],
  [3.2, 0.36],
  [3.7, 0.3],
  [4.3, 0.26],
];

const COLD_PLUME_OUTER: readonly ProfilePoint[] = [
  [STATION_X.coldExit, 1.42],
  [2.7, 1.39],
  [3.4, 1.4],
  [4.0, 1.44],
];

const COLD_PLUME_INNER: readonly ProfilePoint[] = [
  [STATION_X.coldExit, 0.99],
  [2.5, 0.87],
  [3.0, 0.78],
  [3.8, 0.82],
];

const REVERSE_CURL: readonly (readonly ProfilePoint[])[] = [
  [
    [1.56, 1.84],
    [1.5, 2.1],
    [1.3, 2.42],
    [0.85, 2.7],
    [0.1, 2.86],
    [-0.8, 2.92],
  ],
  [
    [1.42, 1.86],
    [1.3, 2.06],
    [1.05, 2.3],
    [0.6, 2.5],
    [-0.1, 2.6],
    [-0.9, 2.64],
  ],
];

function curlSurface(paths: readonly (readonly ProfilePoint[])[]): BufferGeometry {
  const pieces = paths.map((path) => revolve([smooth(path, 24)], SEGMENTS.core));
  const merged = mergeGeometries(pieces);
  pieces.forEach((piece) => piece.dispose());
  if (!merged) throw new Error('Cannot merge the reverse sheet');
  const travelled = merged.getAttribute('uv');
  const longest = Math.max(
    ...Array.from({ length: travelled.count }, (_, index) => travelled.getY(index)),
  );
  const along = Array.from(
    { length: travelled.count },
    (_, index) => travelled.getY(index) / longest,
  );
  merged.setAttribute('along', new Float32BufferAttribute(along, 1));
  return merged;
}

function hotNozzleStrands(): Strand[] {
  const outer = sampled(cowlAt, NOZZLE_FRONT, STATION_X.hotExit, NOZZLE_SAMPLES);
  const inner = reversed(
    smooth(
      [
        [NOZZLE_FRONT, HOT_NOZZLE.innerFront],
        [2.45, 0.8],
        [STATION_X.hotExit, HOT_NOZZLE.innerExit],
      ],
      NOZZLE_SAMPLES,
    ),
  );
  return [
    outer,
    line(outer[outer.length - 1], inner[0]),
    inner,
    line(inner[inner.length - 1], outer[0]),
  ];
}

function plugStrands(): Strand[] {
  const surface = smooth(PLUG_SURFACE, NOZZLE_SAMPLES);
  const tip = surface[surface.length - 1];
  return [line([PLUG_FRONT, 0.001], surface[0]), surface, line(tip, [PLUG_FRONT, 0.001])];
}

function plumeSurface(paths: readonly (readonly ProfilePoint[])[]): BufferGeometry {
  const pieces = paths.map((path) => {
    const piece = revolve([smooth(path, 24)], SEGMENTS.core);
    piece.deleteAttribute('uv');
    return piece;
  });
  const merged = mergeGeometries(pieces);
  pieces.forEach((piece) => piece.dispose());
  if (!merged) throw new Error('Cannot merge plume');
  const position = merged.getAttribute('position');
  const start = paths[0][0][0];
  const end = Math.max(...paths.map((path) => path[path.length - 1][0]));
  const along = Array.from({ length: position.count }, (_, index) =>
    Math.min(1, Math.max(0, (position.getX(index) - start) / (end - start))),
  );
  merged.setAttribute('along', new Float32BufferAttribute(along, 1));
  return merged;
}

export class ExhaustPart {
  readonly hotPlume: Mesh;
  readonly coldPlume: Mesh;
  readonly reverseSheet: Mesh;
  private readonly plumePivot: Group;
  private readonly exitGlow: Sprite;
  private readonly reverseStrength = { value: 0 };
  private readonly hotStrength = { value: 0 };
  private readonly coldStrength = { value: 0 };

  constructor(context: PartContext, engine: Group) {
    const nozzle = namedGroup('hotNozzle', engine);
    const metal = applyHeat(
      applyPanels(coreMaterial(context, 'hotNozzle', FINISHES.hotNozzle), NOZZLE_PANELS, 'nozzle'),
      context.heat,
      glowScale(context, 'hotNozzle'),
      HEAT_LOOK.nozzleGain,
    );
    mesh(context, nozzle, withHeatProfile(revolve(hotNozzleStrands(), SEGMENTS.shell), 0.6), metal);
    const plug = applyHeat(
      applyPanels(material(context, 'hotNozzle', FINISHES.plug), PLUG_PANELS, 'plug'),
      context.heat,
      glowScale(context, 'hotNozzle'),
      HEAT_LOOK.nozzleGain,
    );
    mesh(context, nozzle, withHeatProfile(revolve(plugStrands(), SEGMENTS.core), 0.8), plug);
    label(context, 'hotNozzle', nozzle, polar(2.62, 0.72, toRadians(66)));

    const hotShader = registered(
      context,
      'hotStream',
      plumeMaterial(this.hotStrength, glowScale(context, 'hotStream'), context.time, {
        hot: true,
        alpha: EFFECT_LOOK.hotPlumeAlpha,
      }),
    );
    this.plumePivot = namedGroup('plumePivot', engine);
    this.plumePivot.position.x = STATION_X.hotExit;
    const plumeShape = plumeSurface([HOT_PLUME_OUTER, HOT_PLUME_CORE]);
    plumeShape.translate(-STATION_X.hotExit, 0, 0);
    this.hotPlume = mesh(context, this.plumePivot, plumeShape, hotShader);
    this.hotPlume.renderOrder = 3;
    this.exitGlow = new Sprite(
      registered(
        context,
        'hotStream',
        new SpriteMaterial({
          map: context.textures.glow,
          color: new Color(THEME.fire),
          blending: LOOK.additive ? AdditiveBlending : NormalBlending,
          transparent: true,
          depthWrite: false,
        }),
      ),
    );
    this.exitGlow.position.x = PLUME_GLOW.offset;
    this.exitGlow.renderOrder = 4;
    this.plumePivot.add(this.exitGlow);
    const coldShader = registered(
      context,
      'coldStream',
      plumeMaterial(this.coldStrength, glowScale(context, 'coldStream'), context.time, {
        hot: false,
        alpha: EFFECT_LOOK.coldPlumeAlpha,
      }),
    );
    this.coldPlume = mesh(
      context,
      engine,
      plumeSurface([COLD_PLUME_OUTER, COLD_PLUME_INNER]),
      coldShader,
    );
    this.coldPlume.renderOrder = 3;
    const reverseShader = registered(
      context,
      'coldStream',
      plumeMaterial(this.reverseStrength, glowScale(context, 'coldStream'), context.time, {
        hot: false,
        alpha: EFFECT_LOOK.reversePlumeAlpha,
      }),
    );
    this.reverseSheet = mesh(context, engine, curlSurface(REVERSE_CURL), reverseShader);
    this.reverseSheet.renderOrder = 3;
    this.reverseSheet.visible = false;
  }

  setState(
    heat: number,
    hotShown: boolean,
    coldShown: boolean,
    coldOut: number,
    coldSpeed: number,
  ): void {
    this.hotStrength.value = heat;
    this.hotPlume.visible = hotShown && heat > 0;
    const power = Math.max(0, (heat - HEAT_IDLE) / (1 - HEAT_IDLE));
    const reach = lerp(PLUME_GLOW.shortest, PLUME_GLOW.longest, power);
    const girth = lerp(PLUME_GLOW.thinnest, 1, power);
    this.plumePivot.scale.set(reach, girth, girth);
    this.exitGlow.visible = hotShown;
    this.exitGlow.scale.setScalar(lerp(PLUME_GLOW.smallest, PLUME_GLOW.largest, power));
    this.exitGlow.material.opacity = lerp(PLUME_GLOW.dimmest, PLUME_GLOW.brightest, power);
    this.coldStrength.value = coldOut * coldSpeed;
    this.coldPlume.visible = coldShown && coldOut > 0;
    this.reverseStrength.value = (1 - coldOut) * coldSpeed;
    this.reverseSheet.visible = coldShown && coldOut < 1;
  }
}
