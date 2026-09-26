import { DirectionalLight, PMREMGenerator } from 'three';
import type { Scene, WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface Lighting {
  dispose(): void;
}

const ENVIRONMENT_BLUR = 0.04;
const ENVIRONMENT_INTENSITY = 0.32;

const LIGHTS = [
  { name: 'key', color: '#fff1e0', intensity: 2.4, position: [45, 80, 60] },
  { name: 'fill', color: '#bcd6ff', intensity: 0.55, position: [-70, 25, 35] },
  { name: 'rim', color: '#9cc3ff', intensity: 1.6, position: [-25, 55, -90] },
] as const;

export function createLighting(scene: Scene, renderer: WebGLRenderer): Lighting {
  const generator = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = generator.fromScene(room, ENVIRONMENT_BLUR);
  room.dispose();
  generator.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = ENVIRONMENT_INTENSITY;
  const lights = LIGHTS.map(({ name, color, intensity, position }) => {
    const light = new DirectionalLight(color, intensity);
    light.name = name;
    light.position.fromArray(position);
    scene.add(light);
    return light;
  });
  return {
    dispose: () => {
      lights.forEach((light) => {
        light.removeFromParent();
        light.dispose();
      });
      scene.environment = null;
      environment.dispose();
    },
  };
}
