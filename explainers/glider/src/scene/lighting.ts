import type { DirectionalLight } from 'three';
import { KEY_LIGHT } from './constants';

export function warmKeyLight(key: DirectionalLight): () => void {
  const color = key.color.clone();
  const intensity = key.intensity;
  const position = key.position.clone();
  key.color.set(KEY_LIGHT.color);
  key.intensity = KEY_LIGHT.intensity;
  key.position.fromArray(KEY_LIGHT.position);
  return () => {
    key.color.copy(color);
    key.intensity = intensity;
    key.position.copy(position);
  };
}
