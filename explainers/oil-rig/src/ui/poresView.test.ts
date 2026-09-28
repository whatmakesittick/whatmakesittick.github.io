import { describe, expect, it } from 'vitest';
import {
  LAYERS,
  RESERVOIR_FLUIDS,
  ROCKS,
  SEABED_DEPTH_M,
  fluidLeg,
  layerById,
  layerStopDepth,
  rockSampleDepth,
} from '../model';
import { CANVAS_COLORS } from './canvasColors';
import { poreColors, poreSceneAt } from './poresView';

const MIN_CONTRAST = 3;
const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX_RADIX = 16;
const CHANNEL_MAX = 255;
const SRGB = { knee: 0.03928, slope: 12.92, offset: 0.055, scale: 1.055, gamma: 2.4 } as const;
const LUMA = { red: 0.2126, green: 0.7152, blue: 0.0722 } as const;
const FLARE = 0.05;

function linearChannel(channel: string): number {
  const value = parseInt(channel, HEX_RADIX) / CHANNEL_MAX;
  if (value <= SRGB.knee) return value / SRGB.slope;
  return ((value + SRGB.offset) / SRGB.scale) ** SRGB.gamma;
}

function relativeLuminance(hex: string): number {
  const [red, green, blue] = (HEX_COLOR.exec(hex) ?? []).slice(1).map(linearChannel);
  return LUMA.red * red + LUMA.green * green + LUMA.blue * blue;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + FLARE) / (dark + FLARE);
}

const EVERY_ROCK_DEPTH = [
  ...LAYERS.map((layer) => layer.top + 1),
  ...RESERVOIR_FLUIDS.map((leg) => leg.top + 1),
];

describe('pores view', () => {
  it('fills the reservoir pores with gas, oil and water from the top down', () => {
    (['gas', 'oil', 'water'] as const).forEach((fluid) =>
      expect(poreSceneAt(fluidLeg(fluid).top + 1)).toMatchObject({
        fluid,
        porosity: ROCKS.reservoir.porosity,
      }),
    );
  });

  it('shows the tight seal with water in its few pores', () => {
    expect(poreSceneAt(layerById('seal').top + 1)).toMatchObject({
      fluid: 'water',
      porosity: ROCKS.seal.porosity,
    });
  });

  it('shows the oil leg while the bit has no rock around it', () => {
    expect(poreSceneAt(SEABED_DEPTH_M - 1)).toBe(poreSceneAt(fluidLeg('oil').top));
  });

  it('lays the seal and the clays as plates and the sandstones as grains', () => {
    expect(poreSceneAt(layerById('seal').top + 1).fabric).toBe('shale');
    expect(poreSceneAt(layerById('claystone').top + 1).fabric).toBe('clay');
    expect(poreSceneAt(layerById('aquifer').top + 1).fabric).toBe('sand');
  });

  it('keeps every grain at least three times brighter or darker than the fluid around it', () => {
    EVERY_ROCK_DEPTH.forEach((depth) => {
      const { grain, fluid } = poreColors(poreSceneAt(depth));
      expect(contrast(grain, fluid), `${depth} m`).toBeGreaterThanOrEqual(MIN_CONTRAST);
    });
  });

  it('draws gas as a cool near-white between darker grains', () => {
    const colors = poreColors(poreSceneAt(fluidLeg('gas').top + 1));
    expect(colors.fluid).toBe(CANVAS_COLORS.gasPore);
    expect(relativeLuminance(colors.grain)).toBeLessThan(relativeLuminance(colors.fluid));
  });

  it('hands back the same scene within a layer so the canvas repaints only on a change', () => {
    const oil = fluidLeg('oil');
    expect(poreSceneAt(oil.top + 1)).toBe(poreSceneAt(oil.bottom - 1));
    expect(poreSceneAt(oil.top + 1)).not.toBe(poreSceneAt(fluidLeg('gas').top + 1));
  });

  it('shows the dark organic shale at the source-rock stop', () => {
    const scene = poreSceneAt(rockSampleDepth(layerStopDepth('sourceRock')));
    expect(scene).toMatchObject({ fabric: 'organic', porosity: ROCKS.sourceRock.porosity });
  });
});
