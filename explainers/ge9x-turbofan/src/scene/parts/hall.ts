import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  DoubleSide,
  Color,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import type { Blending, Group, IUniform } from 'three';
import { activeScheme } from '@core/theme';
import { AXIS_HEIGHT_M, PERSON_POSITION } from '../../model/scale';
import { HALL, HALL_LOOK } from '../constants';
import { STATION_X, nacelleOuterAt } from '../geometry/profiles';
import type { PartContext } from './context';
import { UNDIMMED_GROUP, registered } from './context';
import { glslColor, glslFloat } from './shaderChunks';

const NOISE = /* glsl */ `
float hallHash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float hallNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hallHash(i), hallHash(i + vec2(1.0, 0.0)), u.x), mix(hallHash(i + vec2(0.0, 1.0)), hallHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

const OUTPUT = /* glsl */ `
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;

const look = HALL_LOOK;
const TAU = Math.PI * 2;

interface HallDress {
  readonly edge: number;
  readonly lowerShade: number;
  readonly panelLift: number;
  readonly beamShade: number;
  readonly doorShade: number;
  readonly coneGain: number;
  readonly coneBlending: Blending;
  readonly hazeGain: number;
  readonly hazeBlending: Blending;
  readonly glowAdd: number;
  readonly glowMix: number;
}

const HALL_DRESS: Readonly<Record<ReturnType<typeof activeScheme>, HallDress>> = {
  dark: {
    edge: 0.05,
    lowerShade: 0.35,
    panelLift: 0.05,
    beamShade: 0.5,
    doorShade: 0.35,
    coneGain: 0.032,
    coneBlending: AdditiveBlending,
    hazeGain: 0.07,
    hazeBlending: AdditiveBlending,
    glowAdd: 1,
    glowMix: 0,
  },
  light: {
    edge: -0.085,
    lowerShade: 0.16,
    panelLift: 0.04,
    beamShade: 0.2,
    doorShade: 0.12,
    coneGain: 0.06,
    coneBlending: NormalBlending,
    hazeGain: 0.1,
    hazeBlending: NormalBlending,
    glowAdd: 0.12,
    glowMix: 0.5,
  },
};

const dress = HALL_DRESS[activeScheme()];

const BAY_COLUMN_HALF = 0.05;
const LOWER_WALL = { from: 0.05, to: 0.16 } as const;
const PANEL_WALL = { from: 0.17, to: 0.36 } as const;
const BEAM = { rise: 0.315, half: 0.018, railRise: 0.285, railHalf: 0.006 } as const;
const PANEL_JOINTS_PER_BAY = 3;
const DOORS = [
  { centre: -1.57, halfWidth: 0.32, top: 0.27 },
  { centre: 0.7, halfWidth: 0.2, top: 0.22 },
  { centre: 2.45, halfWidth: 0.26, top: 0.25 },
] as const;
const DOOR_SOFT = 0.006;

const CONE = {
  rows: [-6, 0, 6],
  firstCell: -2,
  lastCell: 1,
  offsetX: 2.3,
  topRadiusX: 2.2,
  topRadiusZ: 0.35,
  bottomRadiusX: 4.6,
  bottomRadiusZ: 2.4,
  segments: 14,
  floorY: 0.02,
} as const;
const CONE_FADE_POWER = 2.6;

const FOG = {
  size: 80,
  layers: [0.3, 0.85],
  fadeFrom: 8,
  fadeTo: 34,
  noiseScale: 0.18,
} as const;

const EXHAUST = {
  heatPower: 1.5,
  startX: 2.7,
  coreX: 3.4,
  lengthIdle: 0.7,
  lengthFull: 3.4,
  widthIdle: 0.55,
  widthFull: 1.55,
  gain: 0.85,
  halo: 0.35,
  haloLength: 2.2,
  haloWidth: 2.2,
  grazing: 1.6,
  hot: '#ffd9a0',
} as const;

function band(value: string, from: number, to: number, soft: number): string {
  return `(smoothstep(${glslFloat(from - soft)}, ${glslFloat(from + soft)}, ${value}) * (1.0 - smoothstep(${glslFloat(to - soft)}, ${glslFloat(to + soft)}, ${value})))`;
}

function doorCode(): string {
  return DOORS.map((door, index) => {
    const across = `doorAcross${index}`;
    return `
        float ${across} = abs(mod(azimuth - ${glslFloat(door.centre)} + 3.1415927, 6.2831853) - 3.1415927);
        float inside${index} = (1.0 - smoothstep(${glslFloat(door.halfWidth - DOOR_SOFT)}, ${glslFloat(door.halfWidth + DOOR_SOFT)}, ${across})) * (1.0 - smoothstep(${glslFloat(door.top - DOOR_SOFT)}, ${glslFloat(door.top + DOOR_SOFT)}, rise));
        float outline${index} = max(exp(-pow((${across} - ${glslFloat(door.halfWidth)}) / ${glslFloat(DOOR_SOFT)}, 2.0)) * step(rise, ${glslFloat(door.top)}), exp(-pow((rise - ${glslFloat(door.top)}) / ${glslFloat(DOOR_SOFT)}, 2.0)) * step(${across}, ${glslFloat(door.halfWidth)}));
        float split${index} = exp(-pow(${across} / ${glslFloat(DOOR_SOFT)}, 2.0)) * step(rise, ${glslFloat(door.top)});
        doorSpan = max(doorSpan, inside${index});
        doorEdge = max(doorEdge, max(outline${index}, split${index} * 0.6));`;
  }).join('\n');
}

function floorShader(heat: IUniform<number>): ShaderMaterial {
  const outline = HALL.outline;
  const shadowRadiusX = (STATION_X.coldExit - STATION_X.lip) / 2 + HALL.shadowSpread;
  const shadowCentreX = (STATION_X.coldExit + STATION_X.lip) / 2;
  const reflectFrom = STATION_X.lip;
  const reflectTo = STATION_X.coldExit;
  const reflectRadius = nacelleOuterAt(HALL.reflectSampleX);
  return new ShaderMaterial({
    uniforms: { uHeat: heat },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uHeat;
      varying vec3 vWorld;
      ${NOISE}
      float rectLine(vec2 p, vec2 lo, vec2 hi, float width) {
        vec2 centre = (lo + hi) * 0.5;
        vec2 halfSize = (hi - lo) * 0.5;
        vec2 d = abs(p - centre) - halfSize;
        float edge = abs(max(d.x, d.y));
        float aa = fwidth(edge) + 0.004;
        return 1.0 - smoothstep(width - aa, width + aa, edge);
      }
      float strips(vec2 q, float blur) {
        float rows = 0.0;
        for (int row = -1; row <= 1; row++) {
          float z = float(row) * ${glslFloat(HALL.stripRowGap)};
          float across = 1.0 - smoothstep(${glslFloat(HALL.stripWidth)}, ${glslFloat(HALL.stripWidth)} + blur, abs(q.y - z));
          float cell = fract(q.x / ${glslFloat(HALL.stripPitch)});
          float along = smoothstep(0.0, 0.05 + blur * 0.1, cell) * (1.0 - smoothstep(0.62, 0.67 + blur * 0.1, cell));
          rows = max(rows, across * along);
        }
        return rows;
      }
      void main() {
        vec2 p = vWorld.xz;
        float far = length(p);
        float grain = hallNoise(p * 0.45) * 0.6 + hallNoise(p * 2.3) * 0.28 + hallNoise(p * 9.0) * 0.12;
        vec3 colour = mix(${glslColor(look.floorDark)}, ${glslColor(look.floorLight)}, grain);
        vec2 joint = abs(fract(p / ${glslFloat(HALL.slab)} + 0.5) - 0.5) * ${glslFloat(HALL.slab)};
        float jointLine = 1.0 - smoothstep(0.0, 0.012 + fwidth(p.x) * 1.5, min(joint.x, joint.y));
        colour *= 1.0 - jointLine * 0.18;

        float wear = 0.75 + 0.25 * hallNoise(p * 6.0);
        float safety = rectLine(p, vec2(${glslFloat(outline.fromX)}, ${glslFloat(-outline.halfZ)}), vec2(${glslFloat(outline.toX)}, ${glslFloat(outline.halfZ)}), ${glslFloat(HALL.lineWidth)});
        float centre = (1.0 - smoothstep(${glslFloat(HALL.lineWidth * 0.6)}, ${glslFloat(HALL.lineWidth * 0.6)} + fwidth(p.y) + 0.003, abs(p.y)))
          * step(fract(p.x / ${glslFloat(HALL.dash)}), 0.55)
          * ${band('p.x', outline.fromX + 0.4, outline.toX - 0.4, 0.01)};
        float hazardZone = ${band('p.y', -HALL.hazardHalfZ, HALL.hazardHalfZ, 0.01)}
          * max(${band('p.x', outline.fromX - HALL.hazardDepth - 0.15, outline.fromX - 0.15, 0.01)}, ${band('p.x', outline.toX + 0.15, outline.toX + HALL.hazardDepth + 0.15, 0.01)});
        float hazardStripe = step(0.5, fract((p.x + p.y) * ${glslFloat(HALL.hazardFrequency)}));
        colour = mix(colour, ${glslColor(look.paint)}, max(safety, hazardZone * hazardStripe) * wear);
        colour = mix(colour, ${glslColor(look.hazardDark)}, hazardZone * (1.0 - hazardStripe) * wear * 0.85);
        colour = mix(colour, ${glslColor(look.centreLine)}, centre * wear * 0.8);

        vec3 view = normalize(vWorld - cameraPosition);
        vec3 bounce = reflect(view, vec3(0.0, 1.0, 0.0));
        float fresnel = ${glslFloat(look.reflectBase)} + (1.0 - ${glslFloat(look.reflectBase)}) * pow(1.0 - max(0.0, -view.y), 5.0);
        vec3 reflection = vec3(0.0);
        vec2 oc = vec2(vWorld.y - ${glslFloat(AXIS_HEIGHT_M)}, vWorld.z);
        vec2 dir = vec2(bounce.y, bounce.z);
        float a = dot(dir, dir);
        float b = 2.0 * dot(oc, dir);
        float c = dot(oc, oc) - ${glslFloat(reflectRadius * reflectRadius)};
        float disc = b * b - 4.0 * a * c;
        if (disc > 0.0 && a > 0.0001) {
          float t = (-b - sqrt(disc)) / (2.0 * a);
          float hitX = vWorld.x + bounce.x * t;
          float blur = 0.25 + t * 0.35;
          float span = smoothstep(${glslFloat(reflectFrom)} - blur, ${glslFloat(reflectFrom)} + blur, hitX) * (1.0 - smoothstep(${glslFloat(reflectTo)} - blur, ${glslFloat(reflectTo)} + blur, hitX));
          float soft = smoothstep(0.0, 1.0 + t * 1.5, disc);
          reflection += ${glslColor(look.reflectTint)} * span * soft * step(0.0, t) * exp(-t * 0.18);
        }
        float toCeiling = (${glslFloat(HALL.ceiling)} - vWorld.y) / max(bounce.y, 0.05);
        vec2 ceilingHit = vWorld.xz + bounce.xz * toCeiling;
        reflection += ${glslColor(look.strip)} * strips(ceilingHit, 0.3 + toCeiling * 0.06) * ${glslFloat(look.stripReflect)};
        colour += reflection * fresnel;

        vec2 shadowAxis = vec2((p.x - ${glslFloat(shadowCentreX)}) / ${glslFloat(shadowRadiusX)}, p.y / ${glslFloat(HALL.shadowHalfZ)});
        float shadow = pow(1.0 - smoothstep(0.15, 1.0, length(shadowAxis)), 1.6);
        float personShadow = 1.0 - smoothstep(0.08, ${glslFloat(HALL.personShadow)}, length(p - vec2(${glslFloat(PERSON_POSITION[0])}, ${glslFloat(PERSON_POSITION[2])})));
        colour *= 1.0 - ${glslFloat(look.shadow)} * max(shadow, personShadow * 0.8);

        float level = pow(uHeat, ${glslFloat(EXHAUST.heatPower)});
        float reach = mix(${glslFloat(EXHAUST.lengthIdle)}, ${glslFloat(EXHAUST.lengthFull)}, level);
        float spread = mix(${glslFloat(EXHAUST.widthIdle)}, ${glslFloat(EXHAUST.widthFull)}, level);
        float behind = smoothstep(${glslFloat(EXHAUST.startX)}, ${glslFloat(EXHAUST.startX + 0.7)}, p.x);
        float run = max(p.x - ${glslFloat(EXHAUST.coreX)}, 0.0);
        float flicker = 0.88 + 0.12 * hallNoise(p * 1.7);
        float core = behind * exp(-pow(run / reach, 2.0)) * exp(-pow(p.y / spread, 2.0)) * flicker;
        float halo = behind * exp(-pow(run / (reach * ${glslFloat(EXHAUST.haloLength)}), 2.0)) * exp(-pow(p.y / (spread * ${glslFloat(EXHAUST.haloWidth)}), 2.0));
        float amount = (core + halo * ${glslFloat(EXHAUST.halo)}) * level * ${glslFloat(EXHAUST.gain)};
        amount *= 1.0 + fresnel * ${glslFloat(EXHAUST.grazing)};
        vec3 glowTone = mix(${glslColor(look.glow)}, ${glslColor(EXHAUST.hot)}, core * level);
        colour = mix(colour, glowTone, min(amount, 1.0) * ${glslFloat(dress.glowMix)});
        colour += glowTone * amount * ${glslFloat(dress.glowAdd)};

        float haze = smoothstep(${glslFloat(HALL.fadeFrom)}, ${glslFloat(HALL.fadeTo)}, far);
        colour = mix(colour, ${glslColor(look.horizon)}, haze);
        gl_FragColor = vec4(colour, 1.0);
        ${OUTPUT}
      }
    `,
  });
}

function domeShader(): ShaderMaterial {
  return new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vDirection;
      ${NOISE}
      void main() {
        float rise = vDirection.y;
        float azimuth = atan(vDirection.z, vDirection.x);
        vec3 colour = mix(${glslColor(look.horizon)}, ${glslColor(look.wall)}, smoothstep(0.0, 0.18, rise));
        colour = mix(colour, ${glslColor(look.ceiling)}, smoothstep(0.25, 0.75, rise));
        float bays = abs(fract(azimuth * ${glslFloat(HALL.bays)} / 6.2831853) - 0.5);
        colour *= 1.0 - (1.0 - smoothstep(0.0, 0.04, bays)) * ${glslFloat(look.bayShade)} * smoothstep(0.02, 0.2, rise);
        float wallFade = smoothstep(0.03, 0.09, rise) * (1.0 - smoothstep(0.45, 0.75, rise));
        float lowerWall = (1.0 - smoothstep(${glslFloat(LOWER_WALL.from)}, ${glslFloat(LOWER_WALL.to)}, rise)) * smoothstep(0.0, 0.04, rise);
        colour *= 1.0 - lowerWall * ${glslFloat(dress.lowerShade)};
        float upperWall = smoothstep(${glslFloat(PANEL_WALL.from)}, ${glslFloat(PANEL_WALL.from + 0.04)}, rise) * (1.0 - smoothstep(${glslFloat(PANEL_WALL.to - 0.04)}, ${glslFloat(PANEL_WALL.to)}, rise));
        colour += ${glslColor(look.strip)} * upperWall * ${glslFloat(dress.panelLift)} * wallFade;
        float joint = 1.0 - smoothstep(0.0, 0.035, abs(fract(azimuth * ${glslFloat(HALL.bays * PANEL_JOINTS_PER_BAY)} / 6.2831853) - 0.5) - 0.465);
        colour += vec3(${glslFloat(dress.edge)}) * joint * upperWall * 0.5 * wallFade;
        float column = 1.0 - smoothstep(${glslFloat(BAY_COLUMN_HALF - 0.02)}, ${glslFloat(BAY_COLUMN_HALF)}, bays);
        float columnEdge = exp(-pow((bays - ${glslFloat(BAY_COLUMN_HALF)}) / 0.018, 2.0));
        colour += vec3(${glslFloat(dress.edge)}) * columnEdge * wallFade * smoothstep(0.05, 0.1, rise);
        float beam = ${band('rise', BEAM.rise - BEAM.half, BEAM.rise + BEAM.half, 0.006)};
        float beamTop = exp(-pow((rise - ${glslFloat(BEAM.rise + BEAM.half)}) / 0.004, 2.0));
        float rail = ${band('rise', BEAM.railRise - BEAM.railHalf, BEAM.railRise + BEAM.railHalf, 0.004)};
        colour *= 1.0 - beam * ${glslFloat(dress.beamShade)};
        colour += vec3(${glslFloat(dress.edge)}) * (beamTop * 1.4 + rail * 0.8);
        float doorSpan = 0.0;
        float doorEdge = 0.0;
        ${doorCode()}
        colour *= 1.0 - doorSpan * ${glslFloat(dress.doorShade)} * wallFade;
        colour += vec3(${glslFloat(dress.edge)}) * doorEdge * wallFade;
        float row = smoothstep(${glslFloat(HALL.lampRise - 0.02)}, ${glslFloat(HALL.lampRise)}, rise) * (1.0 - smoothstep(${glslFloat(HALL.lampRise + 0.03)}, ${glslFloat(HALL.lampRise + 0.05)}, rise));
        float lamp = smoothstep(0.12, 0.3, bays) * row;
        float high = smoothstep(${glslFloat(HALL.panelRise - 0.04)}, ${glslFloat(HALL.panelRise)}, rise) * (1.0 - smoothstep(${glslFloat(HALL.panelRise + 0.06)}, ${glslFloat(HALL.panelRise + 0.12)}, rise));
        float panels = high * smoothstep(0.18, 0.32, bays);
        colour += ${glslColor(look.strip)} * (lamp * ${glslFloat(look.lampGain)} + panels * ${glslFloat(look.panelGain)});
        float glowBand = exp(-pow(rise / 0.06, 2.0));
        colour += ${glslColor(look.haze)} * glowBand * ${glslFloat(look.hazeGain)};
        colour += (hallNoise(vDirection.xz * 40.0) - 0.5) * 0.012;
        gl_FragColor = vec4(colour, 1.0);
        ${OUTPUT}
      }
    `,
  });
}

function coneGeometry(): BufferGeometry {
  const cells = CONE.lastCell - CONE.firstCell + 1;
  const count = cells * CONE.rows.length;
  const ring = CONE.segments + 1;
  const positions = new Float32Array(count * ring * 2 * 3);
  const heights = new Float32Array(count * ring * 2);
  const outward = new Float32Array(count * ring * 2 * 2);
  const indices: number[] = [];
  let cone = 0;
  for (let cell = CONE.firstCell; cell <= CONE.lastCell; cell++) {
    for (const rowZ of CONE.rows) {
      const centreX = cell * HALL.stripPitch + CONE.offsetX;
      for (let i = 0; i < ring; i++) {
        const angle = (i / CONE.segments) * TAU;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        for (let end = 0; end < 2; end++) {
          const top = end === 1;
          const vertex = (cone * ring + i) * 2 + end;
          positions.set(
            [
              centreX + c * (top ? CONE.topRadiusX : CONE.bottomRadiusX),
              top ? HALL.ceiling : CONE.floorY,
              rowZ + s * (top ? CONE.topRadiusZ : CONE.bottomRadiusZ),
            ],
            vertex * 3,
          );
          heights[vertex] = top ? 1 : 0;
          outward.set([c, s], vertex * 2);
        }
        if (i < CONE.segments) {
          const a = (cone * ring + i) * 2;
          indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      }
      cone++;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aHeight', new BufferAttribute(heights, 1));
  geometry.setAttribute('aOutward', new BufferAttribute(outward, 2));
  geometry.setIndex(indices);
  return geometry;
}

function coneShader(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: dress.coneBlending,
    vertexShader: /* glsl */ `
      attribute float aHeight;
      attribute vec2 aOutward;
      varying float vHeight;
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vHeight = aHeight;
        vNormal = normalize(vec3(aOutward.x, 0.25, aOutward.y));
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vHeight;
      varying vec3 vNormal;
      varying vec3 vWorld;
      ${NOISE}
      void main() {
        vec3 view = normalize(cameraPosition - vWorld);
        float facing = pow(abs(dot(normalize(vNormal), view)), 1.5);
        float dust = 0.7 + 0.6 * hallNoise(vWorld.xz * 0.6 + vWorld.y * 0.35);
        float strength = pow(vHeight, ${glslFloat(CONE_FADE_POWER)}) * facing * dust * ${glslFloat(dress.coneGain)};
        gl_FragColor = vec4(${glslColor(look.strip)}, strength);
        ${OUTPUT}
      }
    `,
  });
}

function fogGeometry(): BufferGeometry {
  const half = FOG.size / 2;
  const positions = new Float32Array(FOG.layers.length * 4 * 3);
  const indices: number[] = [];
  FOG.layers.forEach((y, layer) => {
    positions.set([-half, y, -half, half, y, -half, half, y, half, -half, y, half], layer * 12);
    const base = layer * 4;
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

function fogShader(heat: IUniform<number>): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uHeat: heat },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: dress.hazeBlending,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uHeat;
      varying vec3 vWorld;
      ${NOISE}
      void main() {
        vec2 p = vWorld.xz;
        vec3 view = normalize(cameraPosition - vWorld);
        float grazing = 1.0 - abs(view.y);
        float cloud = hallNoise(p * ${glslFloat(FOG.noiseScale)} + vWorld.y * 7.0) * 0.65 + hallNoise(p * ${glslFloat(FOG.noiseScale * 3)}) * 0.35;
        float reach = 1.0 - smoothstep(${glslFloat(FOG.fadeFrom)}, ${glslFloat(FOG.fadeTo)}, length(p));
        float warm = exp(-pow(length((p - vec2(${glslFloat(EXHAUST.coreX + 1)}, 0.0)) / vec2(5.0, 3.0)), 2.0))
          * pow(uHeat, ${glslFloat(EXHAUST.heatPower)});
        vec3 tone = mix(${glslColor(look.haze)}, ${glslColor(look.glow)}, warm * 0.6);
        float strength = cloud * grazing * grazing * reach * ${glslFloat(dress.hazeGain)} * (1.0 + warm * 2.0);
        gl_FragColor = vec4(tone, strength);
        ${OUTPUT}
      }
    `,
  });
}

function vignetteShader(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: NormalBlending,
    uniforms: { uTint: { value: new Color(look.vignette) } },
    vertexShader: /* glsl */ `
      varying vec2 vScreen;
      void main() {
        vScreen = position.xy;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTint;
      varying vec2 vScreen;
      void main() {
        float edge = smoothstep(0.55, 1.45, length(vScreen * vec2(0.9, 1.0)));
        gl_FragColor = vec4(uTint, edge * ${glslFloat(look.vignetteStrength)});
        ${OUTPUT}
      }
    `,
  });
}

export function buildHall(context: PartContext, root: Group): void {
  const hall = new Mesh(
    context.tracker.track(new CircleGeometry(HALL.radius, HALL.floorSegments)),
    registered(context, UNDIMMED_GROUP, floorShader(context.heat.uHeat)),
  );
  hall.name = 'hallFloor';
  hall.rotation.x = -Math.PI / 2;
  hall.renderOrder = -2;
  root.add(hall);

  const dome = new Mesh(
    context.tracker.track(
      new SphereGeometry(HALL.radius, HALL.domeSegments, HALL.domeSegments / 2),
    ),
    registered(context, UNDIMMED_GROUP, domeShader()),
  );
  dome.name = 'hallWalls';
  dome.renderOrder = -3;
  dome.frustumCulled = false;
  root.add(dome);

  const cones = new Mesh(
    context.tracker.track(coneGeometry()),
    registered(context, UNDIMMED_GROUP, coneShader()),
  );
  cones.name = 'hallLightCones';
  cones.renderOrder = -1;
  cones.frustumCulled = false;
  root.add(cones);

  const fog = new Mesh(
    context.tracker.track(fogGeometry()),
    registered(context, UNDIMMED_GROUP, fogShader(context.heat.uHeat)),
  );
  fog.name = 'hallFloorHaze';
  fog.renderOrder = -1;
  fog.frustumCulled = false;
  root.add(fog);

  const vignette = new Mesh(
    context.tracker.track(new PlaneGeometry(2, 2)),
    registered(context, UNDIMMED_GROUP, vignetteShader()),
  );
  vignette.name = 'hallVignette';
  vignette.frustumCulled = false;
  vignette.renderOrder = 1000;
  root.add(vignette);
}
