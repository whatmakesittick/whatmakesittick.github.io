import {
  CylinderGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  PointLight,
  TorusGeometry,
  Vector2,
} from 'three';
import type { BufferGeometry, Group, Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toRadians } from '@core/math';
import { COMBUSTOR_LIGHT, FUEL_NOZZLES, HEAT_LOOK, SEGMENTS } from '../constants';
import { FINISHES } from '../finishes';
import { bladeGeometry } from '../geometry/blade';
import { COMBUSTOR } from '../geometry/profiles';
import { closedLoop, line, revolve, smooth } from '../geometry/revolve';
import type { Strand } from '../geometry/revolve';
import { appendRing, emptyRing, handed, ringGeometry } from '../geometry/rows';
import type { PartContext } from './context';
import { coreMaterial, glowScale, label, mesh, namedGroup, polar, registered } from './context';
import { flameMaterial, glowVolumeMaterial } from './effects';
import { applyHeat, withHeatProfile } from './heat';

const DOME_FRONT = 0.34;
const DOME_BACK = 0.355;
const EXIT = 0.72;
const WALL = COMBUSTOR.linerWall;
const MANIFOLD = { x: 0.25, radius: 0.875, tube: 0.014 } as const;
const STEM = { radius: 0.015, top: 0.88, bottom: 0.6 } as const;
const ARM = { radius: 0.013 } as const;
const CUP = { radius: 0.033, length: 0.035 } as const;
const FLAME = { length: 0.2, radius: 0.05, samples: 12 } as const;
const DIFFUSER_VANES = { count: 40, x: 0.172, width: 0.034, hub: 0.474, tip: 0.566 } as const;
const GAS_INSET = 0.006;

function linerStrands(): Strand[] {
  const outerTop = smooth(
    [
      [DOME_FRONT, COMBUSTOR.linerOuterFront],
      [0.52, COMBUSTOR.linerOuterFront - 0.008],
      [EXIT, COMBUSTOR.linerOuterBack],
    ],
    10,
  );
  const outerGas = outerTop
    .filter(([x]) => x >= DOME_BACK)
    .map(([x, r]) => [x, r - WALL] as const)
    .reverse();
  const innerGas = smooth(
    [
      [DOME_BACK, COMBUSTOR.linerInnerFront + WALL],
      [0.52, COMBUSTOR.linerInnerFront + 0.03],
      [EXIT, COMBUSTOR.linerInnerBack],
    ],
    10,
  );
  const innerBottom = innerGas.map(([x, r]) => [x, r - WALL] as const).reverse();
  const domeTop: [number, number] = [DOME_BACK, outerGas[outerGas.length - 1][1]];
  return [
    outerTop,
    line(outerTop[outerTop.length - 1], outerGas[0]),
    [...outerGas, domeTop],
    line(domeTop, innerGas[0]),
    innerGas,
    line(innerGas[innerGas.length - 1], innerBottom[0]),
    [...innerBottom.slice(0, -1), [DOME_FRONT, COMBUSTOR.linerInnerFront]],
    line([DOME_FRONT, COMBUSTOR.linerInnerFront], outerTop[0]),
  ];
}

function gasGeometry(): BufferGeometry {
  return withHeatProfile(
    revolve(
      closedLoop([
        [DOME_BACK + GAS_INSET, COMBUSTOR.linerOuterFront - WALL - GAS_INSET],
        [EXIT - GAS_INSET, COMBUSTOR.linerOuterBack - WALL - GAS_INSET],
        [EXIT - GAS_INSET, COMBUSTOR.linerInnerBack + GAS_INSET],
        [DOME_BACK + GAS_INSET, COMBUSTOR.linerInnerFront + WALL + GAS_INSET],
      ]),
      SEGMENTS.core,
    ),
  );
}

function nozzleGeometry(): BufferGeometry {
  const stem = new CylinderGeometry(STEM.radius, STEM.radius, STEM.top - STEM.bottom, 8);
  stem.translate(COMBUSTOR.nozzleStemX, (STEM.top + STEM.bottom) / 2, 0);
  const armLength = Math.hypot(
    DOME_FRONT - COMBUSTOR.nozzleStemX,
    STEM.bottom - COMBUSTOR.nozzleRadius,
  );
  const arm = new CylinderGeometry(ARM.radius, ARM.radius, armLength, 8);
  arm.rotateZ(
    -Math.atan2(DOME_FRONT - COMBUSTOR.nozzleStemX, STEM.bottom - COMBUSTOR.nozzleRadius),
  );
  arm.translate(
    (DOME_FRONT + COMBUSTOR.nozzleStemX) / 2,
    (STEM.bottom + COMBUSTOR.nozzleRadius) / 2,
    0,
  );
  const cup = new CylinderGeometry(CUP.radius, CUP.radius * 0.8, CUP.length, 12);
  cup.rotateZ(Math.PI / 2);
  cup.translate(DOME_FRONT + CUP.length / 2 - 0.005, COMBUSTOR.nozzleRadius, 0);
  const parts = [stem, arm, cup].map((part) => {
    part.deleteAttribute('uv');
    return part;
  });
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('Cannot merge fuel nozzle');
  return merged;
}

function nozzleRing(): BufferGeometry {
  const buffers = emptyRing();
  const nozzle = nozzleGeometry();
  appendRing(buffers, nozzle, FUEL_NOZZLES, 0);
  nozzle.dispose();
  const manifold = new TorusGeometry(MANIFOLD.radius, MANIFOLD.tube, 8, SEGMENTS.core);
  manifold.rotateY(Math.PI / 2);
  manifold.translate(MANIFOLD.x, 0, 0);
  appendRing(buffers, manifold, 1, 0);
  manifold.dispose();
  return ringGeometry(buffers);
}

function flameGeometry(): BufferGeometry {
  const points = Array.from({ length: FLAME.samples + 1 }, (_, index) => {
    const share = index / FLAME.samples;
    const radius = FLAME.radius * Math.sin(Math.PI * share ** 0.6) * (1 - share * 0.35);
    return new Vector2(Math.max(0.001, radius), share * FLAME.length);
  });
  const flame = new LatheGeometry(points, 12);
  flame.rotateZ(-Math.PI / 2);
  flame.translate(DOME_BACK, COMBUSTOR.nozzleRadius, 0);
  const buffers = emptyRing();
  appendRing(buffers, flame, FUEL_NOZZLES, 0);
  flame.dispose();
  const ring = ringGeometry(buffers);
  const position = ring.getAttribute('position');
  const shares = Array.from({ length: position.count }, (_, index) =>
    Math.min(1, Math.max(0, (position.getX(index) - DOME_BACK) / FLAME.length)),
  );
  ring.setAttribute('flameShare', new Float32BufferAttribute(shares, 1));
  return ring;
}

function diffuserGeometry(): BufferGeometry {
  const vane = bladeGeometry({
    hub: DIFFUSER_VANES.hub,
    tip: DIFFUSER_VANES.tip,
    stations: 3,
    samples: 5,
    chord: () => DIFFUSER_VANES.width / Math.cos(toRadians(20)),
    stagger: () => toRadians(20),
    camber: () => 0.08,
    thickness: () => 0.08,
  });
  vane.translate(DIFFUSER_VANES.x, 0, 0);
  const buffers = emptyRing();
  appendRing(buffers, handed(vane, 'stator'), DIFFUSER_VANES.count, 0);
  vane.dispose();
  const vanes = ringGeometry(buffers);
  vanes.deleteAttribute('heatProfile');
  const walls = revolve(
    [
      ...closedLoop([
        [0.19, 0.566],
        [0.3, 0.64],
        [0.3, 0.625],
        [0.19, 0.552],
      ]),
      ...closedLoop([
        [0.19, 0.488],
        [0.3, 0.445],
        [0.3, 0.43],
        [0.19, 0.474],
      ]),
    ],
    SEGMENTS.core,
  );
  walls.deleteAttribute('uv');
  const merged = mergeGeometries([vanes, walls]);
  vanes.dispose();
  walls.dispose();
  if (!merged) throw new Error('Cannot merge diffuser');
  return merged;
}

export class CombustorPart {
  readonly light: PointLight;
  readonly gas: Mesh;
  readonly flames: Mesh;
  private readonly flame = { value: 0 };

  constructor(context: PartContext, engine: Group) {
    const diffuser = namedGroup('diffuser', engine);
    mesh(
      context,
      diffuser,
      diffuserGeometry(),
      coreMaterial(context, 'diffuser', FINISHES.diffuser),
    );
    label(context, 'diffuser', diffuser, polar(0.24, 0.6, toRadians(46)));

    const nozzles = namedGroup('fuelNozzles', engine);
    mesh(
      context,
      nozzles,
      nozzleRing(),
      coreMaterial(context, 'fuelNozzles', FINISHES.fuelNozzles),
    );
    label(context, 'fuelNozzles', nozzles, polar(COMBUSTOR.nozzleStemX, 0.86, toRadians(40)));

    const liner = namedGroup('combustorLiner', engine);
    const linerSurface = applyHeat(
      coreMaterial(context, 'combustorLiner', FINISHES.combustorLiner),
      context.heat,
      glowScale(context, 'combustorLiner'),
      HEAT_LOOK.linerGain,
    );
    mesh(context, liner, withHeatProfile(revolve(linerStrands(), SEGMENTS.core)), linerSurface);
    label(context, 'combustorLiner', liner, polar(0.56, 0.69, toRadians(50)));
    label(
      context,
      'combustor',
      namedGroup('combustorLabel', engine),
      polar(0.46, 0.83, toRadians(56)),
    );

    const gasShader = registered(
      context,
      'combustorLiner',
      glowVolumeMaterial(
        context.heat,
        glowScale(context, 'combustorLiner'),
        context.cut,
        context.time,
      ),
    );
    this.gas = mesh(context, liner, gasGeometry(), gasShader);
    this.gas.renderOrder = 1;
    const flameShader = registered(
      context,
      'fuelNozzles',
      flameMaterial(this.flame, glowScale(context, 'fuelNozzles'), context.cut, context.time),
    );
    this.flames = mesh(context, nozzles, flameGeometry(), flameShader);
    this.flames.renderOrder = 2;

    this.light = new PointLight(
      COMBUSTOR_LIGHT.colour,
      0,
      COMBUSTOR_LIGHT.distance,
      COMBUSTOR_LIGHT.decay,
    );
    this.light.position.set(COMBUSTOR_LIGHT.x, 0, 0);
    engine.add(this.light);
  }

  setState(heat: number, flame: number): void {
    this.flame.value = flame;
    this.light.intensity = COMBUSTOR_LIGHT.intensity * heat;
    this.gas.visible = heat > 0;
  }
}
