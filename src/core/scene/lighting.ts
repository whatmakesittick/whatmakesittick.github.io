import { DirectionalLight, PMREMGenerator } from 'three';
import type { Scene, WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface Lighting {
  key: DirectionalLight;
  fill: DirectionalLight;
  rim: DirectionalLight;
  dispose(): void;
}

const ENVIRONMENT_BLUR = 0.04;
const ENVIRONMENT_INTENSITY = 0.32;

const LIGHTS = {
  key: { color: '#fff1e0', intensity: 2.4, position: [45, 80, 60] },
  fill: { color: '#bcd6ff', intensity: 0.55, position: [-70, 25, 35] },
  rim: { color: '#9cc3ff', intensity: 1.6, position: [-25, 55, -90] },
} as const;

type LightName = keyof typeof LIGHTS;

function addLight(scene: Scene, name: LightName): DirectionalLight {
  const { color, intensity, position } = LIGHTS[name];
  const light = new DirectionalLight(color, intensity);
  light.name = name;
  light.position.fromArray(position);
  scene.add(light);
  return light;
}

export function createLighting(scene: Scene, renderer: WebGLRenderer): Lighting {
  const generator = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = generator.fromScene(room, ENVIRONMENT_BLUR);
  room.dispose();
  generator.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = ENVIRONMENT_INTENSITY;
  const key = addLight(scene, 'key');
  const fill = addLight(scene, 'fill');
  const rim = addLight(scene, 'rim');
  return {
    key,
    fill,
    rim,
    dispose: () => {
      [key, fill, rim].forEach((light) => {
        light.removeFromParent();
        light.dispose();
      });
      scene.environment = null;
      environment.dispose();
    },
  };
}
