import { Float32BufferAttribute } from 'three';
import type { BufferGeometry, Group, Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toRadians } from '@core/math';
import { EFFECT_LOOK, HEAT_LOOK, SEGMENTS } from '../constants';
import { FINISHES } from '../finishes';
import { HOT_NOZZLE, STATION_X, cowlAt, reversed, sampled } from '../geometry/profiles';
import { line, revolve, smooth } from '../geometry/revolve';
import type { ProfilePoint, Strand } from '../geometry/revolve';
import type { PartContext } from './context';
import { coreMaterial, glowScale, label, mesh, namedGroup, polar, registered } from './context';
import { plumeMaterial } from './effects';
import { applyHeat, withHeatProfile } from './heat';

const NOZZLE_FRONT = 2.1;
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
  private readonly hotStrength = { value: 0 };
  private readonly coldStrength = { value: 0 };

  constructor(context: PartContext, engine: Group) {
    const nozzle = namedGroup('hotNozzle', engine);
    const metal = applyHeat(
      coreMaterial(context, 'hotNozzle', FINISHES.hotNozzle),
      context.heat,
      glowScale(context, 'hotNozzle'),
      HEAT_LOOK.nozzleGain,
    );
    mesh(context, nozzle, withHeatProfile(revolve(hotNozzleStrands(), SEGMENTS.shell), 0.6), metal);
    const plug = applyHeat(
      coreMaterial(context, 'hotNozzle', FINISHES.plug),
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
    this.hotPlume = mesh(
      context,
      engine,
      plumeSurface([HOT_PLUME_OUTER, HOT_PLUME_CORE]),
      hotShader,
    );
    this.hotPlume.renderOrder = 3;
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
    this.coldStrength.value = coldOut * coldSpeed;
    this.coldPlume.visible = coldShown && coldOut > 0;
  }
}
