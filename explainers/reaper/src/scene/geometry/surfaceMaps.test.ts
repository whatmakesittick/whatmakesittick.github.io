import { describe, expect, it } from 'vitest';
import { FUSELAGE_PANELS, GROUND, PROPELLER } from '../constants';
import { discAlpha, panelShade, panelTexture, sandShade } from './surfaceMaps';

describe('surface maps', () => {
  it('darkens the paint along a panel line and leaves it bright between lines', () => {
    const line = FUSELAGE_PANELS.uLines[2];
    const between = (FUSELAGE_PANELS.uLines[2] + FUSELAGE_PANELS.uLines[3]) / 2;
    expect(panelShade(FUSELAGE_PANELS, line, 0.6)).toBeLessThan(
      panelShade(FUSELAGE_PANELS, between, 0.6) - 0.1,
    );
  });

  it('tiles the sand seamlessly across its edges', () => {
    const left = sandShade(GROUND.sand, 0, 0.37);
    const right = sandShade(GROUND.sand, 1, 0.37);
    expect(Math.abs(left[0] - right[0])).toBeLessThan(0.35);
  });

  it('clears the hub and the outside of the propeller disc', () => {
    expect(discAlpha(PROPELLER.disc, 0)).toBe(0);
    expect(discAlpha(PROPELLER.disc, 1)).toBe(0);
    expect(discAlpha(PROPELLER.disc, 0.6)).toBeGreaterThan(0.3);
  });

  it('paints a texture of the requested size', () => {
    const texture = panelTexture({ ...FUSELAGE_PANELS, size: [16, 8] });
    expect(texture.image.width).toBe(16);
    expect(texture.image.height).toBe(8);
    texture.dispose();
  });
});
