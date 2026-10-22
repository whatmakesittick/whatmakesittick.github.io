import { Color, Vector4 } from 'three';
import type { IUniform } from 'three';
import type { Extent } from '@core/scene/regions';
import { wrapPhase } from '@core/store';
import { WAVE_DRAWN_WAVELENGTH_M } from '../../../model';
import { WAVE_PHASE_COLOURS } from '../../../theme';
import { SECTION_EDGE } from './effectConstants';

export interface WaveUniforms {
  readonly [name: string]: IUniform;
  uBandShift: IUniform<number>;
  uWavelength: IUniform<number>;
  uPhaseA: IUniform<Color>;
  uPhaseB: IUniform<Color>;
  uPhaseC: IUniform<Color>;
  uSection: IUniform<Vector4>;
  uWaveOn: IUniform<number>;
}

const [PHASE_A, PHASE_B, PHASE_C] = WAVE_PHASE_COLOURS;

export function createWaveUniforms(): WaveUniforms {
  return {
    uBandShift: { value: 0 },
    uWavelength: { value: WAVE_DRAWN_WAVELENGTH_M },
    uPhaseA: { value: new Color(PHASE_A) },
    uPhaseB: { value: new Color(PHASE_B) },
    uPhaseC: { value: new Color(PHASE_C) },
    uSection: { value: new Vector4(0, 0, SECTION_EDGE.behind, SECTION_EDGE.ahead) },
    uWaveOn: { value: 0 },
  };
}

export function setSection(uniforms: WaveUniforms, [from, to]: Extent): void {
  uniforms.uSection.value.x = from;
  uniforms.uSection.value.y = to;
}

export function driftBands(uniforms: WaveUniforms, metres: number): void {
  uniforms.uBandShift.value = wrapPhase(
    uniforms.uBandShift.value + metres,
    uniforms.uWavelength.value,
  );
}
