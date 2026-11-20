import type { Material, WebGLProgramParametersWithUniforms } from 'three';
import { FULL_TURN } from '@core/math';
import { addPatch, glslFloat, inject } from './shaderChunks';

export interface PerforationLayout {
  readonly from: number;
  readonly to: number;
  readonly radius: number;
  readonly pitch: number;
  readonly holeShare: number;
}

export interface RivetRow {
  readonly x: number;
  readonly radius: number;
  readonly count: number;
  readonly size: number;
}

export interface AccessDoor {
  readonly x: readonly [number, number];
  readonly angle: readonly [number, number];
  readonly radius: number;
}

export interface DoorFrame {
  readonly centreX: number;
  readonly halfX: number;
  readonly centreArc: number;
  readonly halfArc: number;
}

const PERFORATION_KEY = 'ge9x-perforation';
const WEAVE_KEY = 'ge9x-weave';
const BRUSH_KEY = 'ge9x-brushed';
const RIVET_KEY = 'ge9x-rivets';
const DOOR_KEY = 'ge9x-doors';

const HOLE_DARKEN = 0.6;
const HOLE_ROUGHEN = 0.35;
const HOLE_FADE_FROM = 0.22;
const HOLE_FADE_TO = 0.6;

const WEAVE_PITCH = 0.011;
const WEAVE_FADE_FROM = 0.2;
const WEAVE_FADE_TO = 0.55;
const WEAVE_SHADE = 0.1;
const WEAVE_ROUGHNESS = 0.14;

const BRUSH_FREQUENCY = 520;
const BRUSH_FADE_FROM = 0.3;
const BRUSH_FADE_TO = 0.8;
const BRUSH_ROUGHNESS = 0.2;
const BRUSH_SHADE = 0.07;

const RIVET_DARKEN = 0.45;
const RIVET_LIFT = 0.22;
const RIVET_BUMP = 1;
const RIVET_HEIGHT = 0.0004;
const RIVET_FADE_FROM = 0.25;
const RIVET_FADE_TO = 0.7;

const SEAM_METRES = 0.0035;
const SEAM_SHADE = 0.5;
const LATCH_LENGTH = 0.045;
const LATCH_WIDTH = 0.012;
const LATCH_INSET = 0.035;
const LATCH_SHADE = 0.4;

export function wrapAngle(angle: number): number {
  return angle - FULL_TURN * Math.floor((angle + Math.PI) / FULL_TURN);
}

export function doorFrame(door: AccessDoor): DoorFrame {
  const [x0, x1] = door.x;
  const first = wrapAngle(door.angle[0]);
  const span = wrapAngle(door.angle[1] - door.angle[0]);
  const middle = first + span / 2;
  return {
    centreX: (x0 + x1) / 2,
    halfX: Math.abs(x1 - x0) / 2,
    centreArc: wrapAngle(middle) * door.radius,
    halfArc: (Math.abs(span) * door.radius) / 2,
  };
}

export function holeCount(radius: number, pitch: number): number {
  return Math.max(1, Math.round((FULL_TURN * radius) / pitch));
}

function varyingPosition(
  shader: WebGLProgramParametersWithUniforms,
  name: string,
  fragmentHead: string,
): void {
  shader.vertexShader = inject(shader.vertexShader, '#include <common>', `varying vec3 ${name};`);
  shader.vertexShader = inject(
    shader.vertexShader,
    '#include <begin_vertex>',
    `${name} = position;`,
  );
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <common>',
    `varying vec3 ${name};\n${fragmentHead}`,
  );
}

function afterColor(shader: WebGLProgramParametersWithUniforms, body: string): void {
  shader.fragmentShader = inject(shader.fragmentShader, '#include <color_fragment>', body);
}

function afterRoughness(shader: WebGLProgramParametersWithUniforms, body: string): void {
  shader.fragmentShader = inject(shader.fragmentShader, '#include <roughnessmap_fragment>', body);
}

const ANGLE_HEAD = /* glsl */ `
float detailGap(float angle, float target) {
  float gap = angle - target;
  return gap - 6.2831853 * floor((gap + 3.1415927) / 6.2831853);
}
float detailFootprint(vec2 cell) {
  vec2 plain = fwidth(cell);
  vec2 shifted = fwidth(vec2(cell.x, fract(cell.y + 0.5)));
  return max(min(plain.x, shifted.x), min(plain.y, shifted.y));
}
`;

export function applyPerforation<M extends Material>(material: M, layout: PerforationLayout): M {
  const holes = holeCount(layout.radius, layout.pitch);
  const rimRadius = layout.holeShare / 2;
  const key = `${PERFORATION_KEY}-${layout.from}-${layout.to}-${layout.pitch}`;
  return addPatch(material, key, (shader) => {
    varyingPosition(
      shader,
      'vPerforation',
      `float perforationEdge(float footprint, float distanceFromCentre) {
  return 1.0 - smoothstep(${glslFloat(rimRadius)} - footprint, ${glslFloat(rimRadius)} + footprint, distanceFromCentre);
}
${ANGLE_HEAD}`,
    );
    const body = /* glsl */ `
float perforationAngle = atan(vPerforation.z, vPerforation.y);
vec2 perforationCell = vec2(vPerforation.x / ${glslFloat(layout.pitch, 5)}, perforationAngle * ${glslFloat(holes / FULL_TURN, 5)});
float perforationFootprint = detailFootprint(perforationCell);
float perforationSpan = step(${glslFloat(layout.from)}, vPerforation.x) * step(vPerforation.x, ${glslFloat(layout.to)});
float perforationDistance = length(fract(perforationCell) - 0.5);
float perforationSharp = perforationEdge(perforationFootprint * 0.7, perforationDistance);
float perforationMean = 3.1415927 * ${glslFloat(rimRadius ** 2)};
float perforationMask = mix(perforationSharp, perforationMean, smoothstep(${glslFloat(HOLE_FADE_FROM)}, ${glslFloat(HOLE_FADE_TO)}, perforationFootprint)) * perforationSpan;
`;
    afterColor(
      shader,
      `${body}\ndiffuseColor.rgb *= 1.0 - perforationMask * ${glslFloat(HOLE_DARKEN)};`,
    );
    afterRoughness(
      shader,
      `roughnessFactor = mix(roughnessFactor, 1.0, perforationMask * ${glslFloat(HOLE_ROUGHEN)});`,
    );
  });
}

export function applyCarbonWeave<M extends Material>(material: M): M {
  return addPatch(material, WEAVE_KEY, (shader) => {
    varyingPosition(
      shader,
      'vWeave',
      /* glsl */ `
float weaveValue(vec3 local) {
  vec2 cell = vec2(local.x, length(local.yz)) / ${glslFloat(WEAVE_PITCH, 5)};
  vec2 id = floor(cell);
  vec2 inside = fract(cell);
  float warpOver = step(mod(id.x + id.y, 4.0), 1.5);
  float tow = mix(sin(inside.y * 3.1415927), sin(inside.x * 3.1415927), warpOver);
  float fade = 1.0 - smoothstep(${glslFloat(WEAVE_FADE_FROM)}, ${glslFloat(WEAVE_FADE_TO)}, max(fwidth(cell.x), fwidth(cell.y)));
  return (tow - 0.7) * fade * mix(-0.6, 1.0, warpOver);
}
`,
    );
    afterColor(
      shader,
      `float weave = weaveValue(vWeave);\ndiffuseColor.rgb *= 1.0 + weave * ${glslFloat(WEAVE_SHADE)};`,
    );
    afterRoughness(
      shader,
      `roughnessFactor = clamp(roughnessFactor + weave * ${glslFloat(WEAVE_ROUGHNESS)}, 0.04, 1.0);`,
    );
  });
}

export function applyBrushed<M extends Material>(material: M): M {
  return addPatch(material, BRUSH_KEY, (shader) => {
    varyingPosition(
      shader,
      'vBrush',
      /* glsl */ `
float brushHash(float cell) {
  return fract(sin(cell * 127.1 + 311.7) * 43758.5453);
}
float brushStreak(float line) {
  float whole = floor(line);
  float inside = fract(line);
  return mix(brushHash(whole), brushHash(whole + 1.0), inside * inside * (3.0 - 2.0 * inside)) - 0.5;
}
float brushValue(vec3 local) {
  float line = (local.x + length(local.yz)) * ${glslFloat(BRUSH_FREQUENCY)};
  float fade = 1.0 - smoothstep(${glslFloat(BRUSH_FADE_FROM)}, ${glslFloat(BRUSH_FADE_TO)}, fwidth(line));
  return (brushStreak(line) + 0.5 * brushStreak(line * 2.7)) * fade;
}
`,
    );
    afterColor(
      shader,
      `float brush = brushValue(vBrush);\ndiffuseColor.rgb *= 1.0 + brush * ${glslFloat(BRUSH_SHADE)};`,
    );
    afterRoughness(
      shader,
      `roughnessFactor = clamp(roughnessFactor + brush * ${glslFloat(BRUSH_ROUGHNESS)}, 0.04, 1.0);`,
    );
  });
}

function rivetTerm(row: RivetRow): string {
  return /* glsl */ `
{
  float rowAngle = rivetAngle * ${glslFloat(row.count / FULL_TURN, 5)};
  float rowGap = (fract(rowAngle + 0.5) - 0.5) * ${glslFloat((FULL_TURN * row.radius) / row.count, 5)};
  float rowDistance = length(vec2(vRivet.x - ${glslFloat(row.x, 5)}, rowGap));
  float rowFootprint = max(fwidth(vRivet.x), fwidth(rowGap));
  float rowFade = smoothstep(${glslFloat(RIVET_FADE_FROM)}, ${glslFloat(RIVET_FADE_TO)}, ${glslFloat(row.size, 5)} / max(rowFootprint, 1e-5));
  rivet = max(rivet, (1.0 - smoothstep(${glslFloat(row.size, 5)} - rowFootprint, ${glslFloat(row.size, 5)} + rowFootprint, rowDistance)) * rowFade);
}`;
}

export function applyRivets<M extends Material>(material: M, rows: readonly RivetRow[]): M {
  const key = `${RIVET_KEY}-${rows.map((row) => `${row.x}-${row.count}`).join('-')}`;
  return addPatch(material, key, (shader) => {
    varyingPosition(shader, 'vRivet', '');
    afterColor(
      shader,
      `
float rivetAngle = atan(vRivet.z, vRivet.y);
float rivet = 0.0;
${rows.map(rivetTerm).join('\n')}
float rivetRim = rivet * (1.0 - rivet) * 4.0;
diffuseColor.rgb *= 1.0 - rivet * ${glslFloat(RIVET_DARKEN)} + rivetRim * ${glslFloat(RIVET_LIFT)};
`,
    );
    shader.fragmentShader = inject(
      shader.fragmentShader,
      '#include <normal_fragment_maps>',
      /* glsl */ `
vec3 rivetDx = dFdx(-vViewPosition);
vec3 rivetDy = dFdy(-vViewPosition);
vec3 rivetR1 = cross(rivetDy, normal);
vec3 rivetR2 = cross(normal, rivetDx);
float rivetDet = dot(rivetDx, rivetR1);
vec3 rivetGrad = sign(rivetDet) * (dFdx(rivet) * rivetR1 + dFdy(rivet) * rivetR2);
normal = normalize(abs(rivetDet) * normal - ${glslFloat(RIVET_BUMP * RIVET_HEIGHT, 6)} * rivetGrad);
`,
    );
  });
}

function doorTerm(door: AccessDoor): string {
  const frame = doorFrame(door);
  return /* glsl */ `
{
  vec2 doorLocal = vec2(vDoor.x - ${glslFloat(frame.centreX, 5)}, doorGap(doorAngle, ${glslFloat(frame.centreArc / door.radius, 5)}) * doorRadius);
  vec2 doorHalf = vec2(${glslFloat(frame.halfX, 5)}, ${glslFloat(frame.halfArc, 5)});
  float doorEdge = abs(doorBox(doorLocal, doorHalf));
  float doorLine = max(${glslFloat(SEAM_METRES, 5)}, fwidth(doorEdge) * 1.2);
  float doorStrength = min(1.0, ${glslFloat(SEAM_METRES, 5)} / (fwidth(doorEdge) * 1.2 + 1e-5));
  doorSeam = max(doorSeam, (1.0 - smoothstep(0.0, doorLine, doorEdge)) * doorStrength);
  vec2 latchHalf = vec2(${glslFloat(LATCH_LENGTH / 2)}, ${glslFloat(LATCH_WIDTH / 2)});
  for (int side = 0; side < 2; side++) {
    float latchSide = side == 0 ? 1.0 : -1.0;
    vec2 latchCentre = vec2(0.0, latchSide * (doorHalf.y - ${glslFloat(LATCH_INSET)}));
    float latchDistance = doorBox(doorLocal - latchCentre, latchHalf);
    float latchLine = max(${glslFloat(SEAM_METRES * 0.6, 5)}, fwidth(latchDistance) * 1.2);
    latch = max(latch, (1.0 - smoothstep(0.0, latchLine, latchDistance)) * min(1.0, ${glslFloat(LATCH_WIDTH / 2)} / (fwidth(latchDistance) * 2.0 + 1e-5)));
  }
}`;
}

export function applyAccessDoors<M extends Material>(material: M, doors: readonly AccessDoor[]): M {
  const key = `${DOOR_KEY}-${doors.map((door) => `${door.x[0]}-${door.angle[0]}`).join('-')}`;
  return addPatch(material, key, (shader) => {
    varyingPosition(
      shader,
      'vDoor',
      /* glsl */ `
float doorGap(float angle, float target) {
  float gap = angle - target;
  return gap - 6.2831853 * floor((gap + 3.1415927) / 6.2831853);
}
float doorBox(vec2 point, vec2 extent) {
  vec2 edge = abs(point) - extent;
  return length(max(edge, 0.0)) + min(max(edge.x, edge.y), 0.0);
}
`,
    );
    afterColor(
      shader,
      `
float doorAngle = atan(vDoor.z, vDoor.y);
float doorRadius = length(vDoor.yz);
float doorSeam = 0.0;
float latch = 0.0;
${doors.map(doorTerm).join('\n')}
diffuseColor.rgb *= 1.0 - doorSeam * ${glslFloat(SEAM_SHADE)};
diffuseColor.rgb *= 1.0 - latch * ${glslFloat(LATCH_SHADE)};
`,
    );
  });
}
