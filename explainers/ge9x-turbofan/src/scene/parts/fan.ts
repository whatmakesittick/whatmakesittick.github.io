import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { FULL_TURN, clamp, lerp, toRadians } from '@core/math';
import type { MaterialFinish } from '@core/scene/materials';
import { FAN_BLADES } from '../../model/engineFacts';
import { FAN_BLADE_MIN_OPACITY } from '../../model/spools';
import { SPIN_SENSE } from '../../model/scale';
import { EASE, FAN, GUIDE_VANES, SEGMENTS, SPIRAL } from '../constants';
import { FINISHES } from '../finishes';
import { bladeGeometry } from '../geometry/blade';
import type { BladeSpec, ChordRange } from '../geometry/blade';
import { cowlAt, ductOuterAt } from '../geometry/profiles';
import { line, revolve, smooth } from '../geometry/revolve';
import type { ProfilePoint } from '../geometry/revolve';
import { appendRing, emptyRing, handed, ringGeometry } from '../geometry/rows';
import type { PartContext } from './context';
import { cutMaterial, label, material, mesh, namedGroup, polar, registered } from './context';
import { blurMaterial } from './effects';
import { applyCarbonWeave } from './detailPatches';

const OPACITY_STEPS = 5;
const XYZ = 3;

const SPINNER_PROFILE: readonly ProfilePoint[] = [
  [-2.79, 0],
  [-2.775, 0.06],
  [-2.74, 0.15],
  [-2.68, 0.25],
  [-2.6, 0.34],
  [-2.5, 0.41],
  [-2.42, 0.445],
];

const HUB_PROFILE: readonly ProfilePoint[] = [
  [-2.42, 0.445],
  [-2.3, 0.47],
  [-2.16, 0.5],
  [-2.1, 0.505],
];

const HUB_BORE = 0.12;
const SPINNER_SAMPLES = 32;

export const FAN_BLADE_SPEC: BladeSpec = {
  hub: FAN.hub,
  tip: FAN.tip,
  stations: FAN.stations,
  samples: FAN.samples,
  chord: (share) =>
    0.4 + 0.4 * Math.sin((Math.min(1, share / 0.82) * Math.PI) / 2) - 0.03 * share ** 4,
  stagger: (share) => lerp(toRadians(20), toRadians(63), share ** 0.9),
  camber: (share) => lerp(0.09, 0.025, share),
  thickness: (share) => lerp(0.11, 0.028, share ** 0.7),
  sweep: (share) => 0.05 * share ** 3 - 0.02 * share,
  lean: (share) => -0.05 * share ** 2,
};

const EDGE_RANGE: ChordRange = {
  from: 0,
  to: FAN.edgeShare,
  inflate: FAN.edgeInflate,
  lift: FAN.edgeLift,
};

const GUIDE_VANE_SPEC = (hub: number, tip: number): BladeSpec => ({
  hub,
  tip,
  stations: 4,
  samples: 6,
  chord: () => GUIDE_VANES.width / Math.cos(toRadians(18)),
  stagger: () => toRadians(18),
  camber: () => 0.1,
  thickness: () => 0.07,
});

function opacityFinishes(base: MaterialFinish): MaterialFinish[] {
  return Array.from({ length: OPACITY_STEPS }, (_, index) => {
    const opacity = lerp(1, FAN_BLADE_MIN_OPACITY, index / (OPACITY_STEPS - 1));
    return index === 0 ? base : { ...base, transparent: true, opacity };
  });
}

const BLADE_STEPS = opacityFinishes(FINISHES.fanBlade);
const EDGE_STEPS = opacityFinishes(FINISHES.bladeEdge);

function bladeRing(range?: ChordRange): BufferGeometry {
  const spec = range ? { ...FAN_BLADE_SPEC, samples: FAN.edgeSamples } : FAN_BLADE_SPEC;
  const blade = bladeGeometry(spec, range);
  blade.translate(FAN.stackX, 0, 0);
  const buffers = emptyRing();
  appendRing(buffers, handed(blade, 'rotor'), FAN_BLADES, 0);
  blade.dispose();
  return ringGeometry(buffers);
}

function spinnerRadiusToX(radius: number): number {
  for (let index = 1; index < SPINNER_PROFILE.length; index += 1) {
    const [x1, r1] = SPINNER_PROFILE[index];
    if (radius <= r1) {
      const [x0, r0] = SPINNER_PROFILE[index - 1];
      return lerp(x0, x1, (radius - r0) / (r1 - r0));
    }
  }
  return SPINNER_PROFILE[SPINNER_PROFILE.length - 1][0];
}

function spinnerNormal(radius: number, angle: number, target: Vector3): Vector3 {
  const step = 0.01;
  const dx = spinnerRadiusToX(radius + step) - spinnerRadiusToX(radius);
  const length = Math.hypot(dx, step);
  const outward = dx / length;
  return target.set(-step / length, outward * Math.cos(angle), outward * Math.sin(angle));
}

function spiralGeometry(): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const centre = new Vector3();
  const normal = new Vector3();
  const tangent = new Vector3();
  const side = new Vector3();
  const previous = new Vector3();
  for (let index = 0; index <= SPIRAL.samples; index += 1) {
    const share = index / SPIRAL.samples;
    const radius = lerp(SPIRAL.startRadius, SPIRAL.endRadius, share);
    const angle = -SPIN_SENSE * SPIRAL.turns * FULL_TURN * share;
    previous.copy(centre);
    spinnerNormal(radius, angle, normal);
    centre.set(spinnerRadiusToX(radius), radius * Math.cos(angle), radius * Math.sin(angle));
    centre.addScaledVector(normal, SPIRAL.lift);
    if (index === 0) {
      const ahead = lerp(SPIRAL.startRadius, SPIRAL.endRadius, 1 / SPIRAL.samples);
      const nextAngle = -SPIN_SENSE * SPIRAL.turns * FULL_TURN * (1 / SPIRAL.samples);
      tangent
        .set(spinnerRadiusToX(ahead), ahead * Math.cos(nextAngle), ahead * Math.sin(nextAngle))
        .sub(centre);
    } else {
      tangent.subVectors(centre, previous);
    }
    side.crossVectors(tangent, normal).normalize();
    const width = lerp(SPIRAL.widthStart, SPIRAL.widthEnd, Math.sin(share * Math.PI * 0.5)) / 2;
    const taper = clamp(share * 12, 0.35, 1);
    positions.push(
      ...centre
        .clone()
        .addScaledVector(side, width * taper)
        .toArray(),
    );
    positions.push(
      ...centre
        .clone()
        .addScaledVector(side, -width * taper)
        .toArray(),
    );
    if (index > 0) {
      const a = (index - 1) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function blurGeometry(): BufferGeometry {
  return revolve(
    [
      [
        [FAN.blurX - 0.05, FAN.hub + 0.04],
        [FAN.blurX - 0.02, (FAN.hub + FAN.tip) / 2],
        [FAN.blurX - 0.06, FAN.tip - 0.01],
      ],
    ],
    SEGMENTS.shell,
  );
}

function guideVaneRing(): BufferGeometry {
  const hub = cowlAt(GUIDE_VANES.x) - 0.01;
  const tip = ductOuterAt(GUIDE_VANES.x) + 0.01;
  const vane = bladeGeometry(GUIDE_VANE_SPEC(hub, tip));
  vane.translate(GUIDE_VANES.x, 0, 0);
  const buffers = emptyRing();
  appendRing(buffers, handed(vane, 'stator'), GUIDE_VANES.count, 0);
  vane.dispose();
  return ringGeometry(buffers);
}

export class FanPart {
  readonly rotor: Group;
  readonly blur: Mesh;
  private readonly blades: Mesh;
  private readonly edges: Mesh;
  private readonly bladeMaterials: MeshStandardMaterial[];
  private readonly edgeMaterials: MeshStandardMaterial[];
  private readonly blurUniforms = { uBlur: { value: 0 }, uAngle: { value: 0 } };
  private blurTarget = 0;

  constructor(context: PartContext, engine: Group, innerSpool: Group) {
    this.rotor = namedGroup('fanRotor', innerSpool);
    this.bladeMaterials = BLADE_STEPS.map((finish) =>
      applyCarbonWeave(material(context, 'fanBlades', finish)),
    );
    this.edgeMaterials = EDGE_STEPS.map((finish) => material(context, 'fanBlades', finish));
    this.blades = mesh(context, this.rotor, bladeRing(), this.bladeMaterials[0]);
    this.edges = mesh(context, this.rotor, bladeRing(EDGE_RANGE), this.edgeMaterials[0]);
    mesh(
      context,
      this.rotor,
      revolve(
        [
          smooth(HUB_PROFILE, 8),
          line(HUB_PROFILE[HUB_PROFILE.length - 1], [-2.1, HUB_BORE]),
          line([-2.1, HUB_BORE], [-2.42, HUB_BORE]),
          line([-2.42, HUB_BORE], HUB_PROFILE[0]),
        ],
        SEGMENTS.core,
      ),
      material(context, 'fanBlades', FINISHES.fanHub),
    );
    const spinner = namedGroup('spinner', this.rotor);
    const spinnerTip = SPINNER_PROFILE[0];
    const spinnerBase = SPINNER_PROFILE[SPINNER_PROFILE.length - 1];
    mesh(
      context,
      spinner,
      revolve(
        [
          smooth(SPINNER_PROFILE, SPINNER_SAMPLES),
          line(spinnerBase, [spinnerBase[0], 0]),
          line([spinnerBase[0], 0], spinnerTip),
        ],
        SEGMENTS.core,
      ),
      material(context, 'spinner', FINISHES.spinner),
    );
    mesh(context, spinner, spiralGeometry(), material(context, 'spinner', FINISHES.spinnerMark));
    const blurShader = registered(
      context,
      'fanBlades',
      blurMaterial(this.blurUniforms.uBlur, this.blurUniforms.uAngle, FAN_BLADES),
    );
    this.blur = mesh(context, engine, blurGeometry(), blurShader);
    this.blur.renderOrder = 2;
    this.blur.visible = false;
    const fixed = namedGroup('fanLabels', engine);
    label(context, 'fanBlades', fixed, polar(-2.44, 1.25, toRadians(62)));
    label(context, 'spinner', fixed, polar(-2.66, 0.27, toRadians(72)));
    const vanes = namedGroup('guideVanes', engine);
    mesh(context, vanes, guideVaneRing(), cutMaterial(context, 'guideVanes', FINISHES.guideVanes));
    label(context, 'guideVanes', vanes, polar(GUIDE_VANES.x, 1.42, toRadians(58)));
  }

  setState(fanBlur: number, bladeOpacity: number): void {
    this.blurTarget = fanBlur;
    const step = Math.round(
      ((1 - bladeOpacity) / (1 - FAN_BLADE_MIN_OPACITY)) * (OPACITY_STEPS - 1),
    );
    const chosen = clamp(step, 0, OPACITY_STEPS - 1);
    this.blades.material = this.bladeMaterials[chosen];
    this.edges.material = this.edgeMaterials[chosen];
  }

  update(deltaSeconds: number, fanAngle: number): boolean {
    const uniforms = this.blurUniforms;
    uniforms.uAngle.value = fanAngle * SPIN_SENSE;
    const gap = this.blurTarget - uniforms.uBlur.value;
    const moving = Math.abs(gap) > EASE.settle;
    uniforms.uBlur.value = moving
      ? uniforms.uBlur.value + gap * Math.min(1, deltaSeconds * EASE.blurRate)
      : this.blurTarget;
    this.blur.visible = uniforms.uBlur.value > EASE.settle;
    return moving;
  }

  snapBlur(): void {
    this.blurUniforms.uBlur.value = this.blurTarget;
    this.blur.visible = this.blurTarget > EASE.settle;
  }

  warmUpTargets(): Mesh[] {
    return [this.blur];
  }
}
