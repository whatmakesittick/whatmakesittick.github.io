import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import type { Box3, Texture } from 'three';
import { THEME } from '../theme';

const GRID = {
  cellSize: 2,
  majorEvery: 5,
  opacity: 0.55,
  sizeFactor: 6,
  fadeFactor: 2.6,
  color: new Color(THEME.muted).lerp(new Color(THEME.background), 0.55),
} as const;
const SHADOW = { sizeFactor: 1.35, opacity: 0.9, lift: 0.02, minDepthRatio: 0.5 } as const;

const vertexShader = `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = `
  const float MINOR_WEIGHT = 0.35;
  const float MAJOR_WEIGHT = 0.8;
  const float FADE_START = 0.25;
  uniform vec3 uColor;
  uniform float uCell;
  uniform float uMajor;
  uniform vec2 uCenter;
  uniform float uRadius;
  uniform float uOpacity;
  varying vec3 vWorld;

  float gridLine(vec2 position, float size) {
    vec2 scaled = position / size;
    vec2 distance = abs(fract(scaled - 0.5) - 0.5) / fwidth(scaled);
    return 1.0 - min(min(distance.x, distance.y), 1.0);
  }

  void main() {
    vec2 position = vWorld.xz;
    float minor = gridLine(position, uCell) * MINOR_WEIGHT;
    float major = gridLine(position, uCell * uMajor) * MAJOR_WEIGHT;
    float fade = 1.0 - smoothstep(FADE_START, 1.0, length(position - uCenter) / uRadius);
    gl_FragColor = vec4(uColor, max(minor, major) * fade * uOpacity);
    #include <colorspace_fragment>
  }
`;

function gridMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: GRID.color.clone() },
      uCell: { value: GRID.cellSize },
      uMajor: { value: GRID.majorEvery },
      uCenter: { value: new Vector2() },
      uRadius: { value: 1 },
      uOpacity: { value: GRID.opacity },
    },
  });
}

export class Stage {
  readonly group = new Group();
  private readonly plane = new PlaneGeometry(1, 1);
  private readonly grid: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly shadow: Mesh<PlaneGeometry, MeshBasicMaterial>;

  constructor(shadowTexture: Texture) {
    this.plane.rotateX(-Math.PI / 2);
    this.grid = new Mesh(this.plane, gridMaterial());
    this.shadow = new Mesh(
      this.plane,
      new MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: SHADOW.opacity,
        color: new Color(0, 0, 0),
      }),
    );
    this.shadow.position.y = SHADOW.lift;
    this.group.add(this.grid, this.shadow);
  }

  fit(bounds: Box3, floorHeight: number): void {
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const footprint = Math.max(size.x, size.z);
    const reach = Math.max(size.x, size.y, size.z);
    this.group.position.set(0, floorHeight, 0);
    this.grid.position.set(center.x, 0, center.z);
    this.grid.scale.setScalar(reach * GRID.sizeFactor);
    this.grid.material.uniforms.uCenter.value.set(center.x, center.z);
    this.grid.material.uniforms.uRadius.value = reach * GRID.fadeFactor;
    this.shadow.position.set(center.x, SHADOW.lift, center.z);
    this.shadow.scale.set(
      size.x * SHADOW.sizeFactor,
      1,
      Math.max(size.z, footprint * SHADOW.minDepthRatio) * SHADOW.sizeFactor,
    );
  }

  dispose(): void {
    this.plane.dispose();
    this.grid.material.dispose();
    this.shadow.material.dispose();
  }
}
