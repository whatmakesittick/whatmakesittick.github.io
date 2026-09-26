import { Color, PointLight } from 'three';
import { THEME } from '../theme';
import { GAS, SCENE_UNITS_PER_MM } from './constants';

const SPARK_COLOR = new Color('#cfe6ff');
const FLAME_COLOR = new Color(THEME.flame);
const LIGHT_DECAY = 2;

export class CombustionLight {
  readonly light: PointLight;

  constructor(z: number) {
    this.light = new PointLight(FLAME_COLOR, 0, GAS.lightRange * SCENE_UNITS_PER_MM, LIGHT_DECAY);
    this.light.position.z = z;
  }

  update(height: number, heat: number, spark: number): void {
    const heatPower = heat * GAS.heatLightIntensity;
    const sparkPower = spark * GAS.sparkLightIntensity;
    const total = heatPower + sparkPower;
    this.light.position.y = height;
    this.light.intensity = total;
    if (total > 0) this.light.color.copy(SPARK_COLOR).lerp(FLAME_COLOR, heatPower / total);
  }
}
