import { Color } from 'three';
import { burnedFraction } from '../model';
import type { EngineSpec, GasPhase, GasState } from '../model';
import { THEME } from '../theme';

export interface GasAppearance {
  color: Color;
  emissive: Color;
  emissiveIntensity: number;
  opacity: number;
  glow: number;
}

const COLORS = {
  intake: new Color(THEME.intake),
  air: new Color(THEME.air),
  compressed: new Color(THEME.compressed),
  burn: new Color(THEME.burn),
  flame: new Color(THEME.flame),
  exhaust: new Color(THEME.exhaust),
} as const;

const FRESH = { baseOpacity: 0.28, fillOpacity: 0.34, glow: 0.6 } as const;
const COMPRESSED = { baseOpacity: 0.55, gainOpacity: 0.3, glow: 0.6, glowGain: 0.7 } as const;
const BURNING = { opacity: 0.9, baseGlow: 0.45, heatGlow: 0.55 } as const;
const BURNT = { baseOpacity: 0.12, fillOpacity: 0.42, heatThreshold: 0.08 } as const;

function displayPhase(gas: GasState, angle: number, spec: EngineSpec): GasPhase {
  const igniting = gas.phase === 'burnt' && burnedFraction(angle, spec) < 1;
  return igniting ? 'burning' : gas.phase;
}

function freshColor(spec: EngineSpec): Color {
  return spec.intakeCharge === 'mixture' ? COLORS.intake : COLORS.air;
}

export class GasAppearanceModel {
  private readonly appearance: GasAppearance = {
    color: new Color(),
    emissive: new Color(),
    emissiveIntensity: 0,
    opacity: 0,
    glow: 0,
  };

  evaluate(gas: GasState, angle: number, spec: EngineSpec): GasAppearance {
    const result = this.appearance;
    switch (displayPhase(gas, angle, spec)) {
      case 'fresh':
        this.fresh(gas, spec);
        break;
      case 'compressed':
        this.compressed(gas, spec);
        break;
      case 'burning':
        this.burning(gas);
        break;
      case 'burnt':
        this.burnt(gas);
        break;
    }
    result.emissive.copy(result.color);
    return result;
  }

  private fresh(gas: GasState, spec: EngineSpec): void {
    const result = this.appearance;
    result.color.copy(freshColor(spec));
    result.opacity = FRESH.baseOpacity + FRESH.fillOpacity * gas.fill;
    result.emissiveIntensity = FRESH.glow;
    result.glow = 0;
  }

  private compressed(gas: GasState, spec: EngineSpec): void {
    const result = this.appearance;
    result.color.copy(freshColor(spec)).lerp(COLORS.compressed, gas.compression);
    result.opacity = COMPRESSED.baseOpacity + COMPRESSED.gainOpacity * gas.compression;
    result.emissiveIntensity = COMPRESSED.glow + COMPRESSED.glowGain * gas.compression;
    result.glow = 0;
  }

  private burning(gas: GasState): void {
    const result = this.appearance;
    result.color.copy(COLORS.burn).lerp(COLORS.flame, gas.heat);
    result.opacity = BURNING.opacity;
    result.emissiveIntensity = BURNING.baseGlow + BURNING.heatGlow * gas.heat;
    result.glow = gas.heat;
  }

  private burnt(gas: GasState): void {
    const result = this.appearance;
    const ember = Math.min(1, gas.heat / BURNT.heatThreshold) ** 2;
    const emberGlow = BURNING.baseGlow + BURNING.heatGlow * BURNT.heatThreshold;
    result.color.copy(COLORS.exhaust).lerp(COLORS.burn, ember);
    const settled = BURNT.baseOpacity + BURNT.fillOpacity * gas.fill;
    result.opacity = settled + (BURNING.opacity - settled) * ember;
    result.emissiveIntensity = FRESH.glow + (emberGlow - FRESH.glow) * ember;
    result.glow = gas.heat;
  }
}
