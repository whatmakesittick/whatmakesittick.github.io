import {
  BackSide,
  CircleGeometry,
  Color,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import type { Group, IUniform } from 'three';
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

function band(value: string, from: number, to: number, soft: number): string {
  return `(smoothstep(${glslFloat(from - soft)}, ${glslFloat(from + soft)}, ${value}) * (1.0 - smoothstep(${glslFloat(to - soft)}, ${glslFloat(to + soft)}, ${value})))`;
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

        float plume = exp(-pow(length((p - vec2(${glslFloat(HALL.glowX)}, 0.0)) / vec2(2.4, 1.3)), 2.0));
        colour += ${glslColor(look.glow)} * plume * uHeat * ${glslFloat(look.glowGain)};

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

  const vignette = new Mesh(
    context.tracker.track(new PlaneGeometry(2, 2)),
    registered(context, UNDIMMED_GROUP, vignetteShader()),
  );
  vignette.name = 'hallVignette';
  vignette.frustumCulled = false;
  vignette.renderOrder = 1000;
  root.add(vignette);
}
