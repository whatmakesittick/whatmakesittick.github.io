import { DirectionalLight, PMREMGenerator } from 'three';
import type { Scene, WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Scheme } from '../scheme';

export interface Lighting {
  key: DirectionalLight;
  fill: DirectionalLight;
  rim: DirectionalLight;
  dispose(): void;
}

type LightName = 'key' | 'fill' | 'rim';

interface LightTone {
  color: string;
  intensity: number;
}

interface LightingLook {
  environment: number;
  lights: Readonly<Record<LightName, LightTone>>;
}

const ENVIRONMENT_BLUR = 0.04;

const POSITIONS: Readonly<Record<LightName, readonly [number, number, number]>> = {
  key: [45, 80, 60],
  fill: [-70, 25, 35],
  rim: [-25, 55, -90],
};

const KEY: LightTone = { color: '#fff1e0', intensity: 2.4 };

const LIGHTING: Readonly<Record<Scheme, LightingLook>> = {
  dark: {
    environment: 0.32,
    lights: {
      key: KEY,
      fill: { color: '#dde4f0', intensity: 0.55 },
      rim: { color: '#c4d6f3', intensity: 1.6 },
    },
  },
  light: {
    environment: 0.55,
    lights: {
      key: KEY,
      fill: { color: '#eef1f6', intensity: 0.85 },
      rim: { color: '#c4d6f3', intensity: 0.9 },
    },
  },
};

function addLight(scene: Scene, name: LightName, tone: LightTone): DirectionalLight {
  const light = new DirectionalLight(tone.color, tone.intensity);
  light.name = name;
  light.position.fromArray(POSITIONS[name]);
  scene.add(light);
  return light;
}

export function createLighting(scene: Scene, renderer: WebGLRenderer, scheme: Scheme): Lighting {
  const look = LIGHTING[scheme];
  const generator = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = generator.fromScene(room, ENVIRONMENT_BLUR);
  room.dispose();
  generator.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = look.environment;
  const key = addLight(scene, 'key', look.lights.key);
  const fill = addLight(scene, 'fill', look.lights.fill);
  const rim = addLight(scene, 'rim', look.lights.rim);
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
