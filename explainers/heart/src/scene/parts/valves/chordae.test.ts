import { describe, expect, it } from 'vitest';
import { VALVE_DESIGN } from '../../constants';
import type { FlapValveDesign } from '../../constants';
import { papillaryAttachments } from './chordae';

const MITRAL = VALVE_DESIGN.mitral as FlapValveDesign;
const TRICUSPID = VALVE_DESIGN.tricuspid as FlapValveDesign;

describe('cords', () => {
  it('ties each mitral papillary muscle to both leaflets', () => {
    for (let papillary = 0; papillary < MITRAL.papillaries.length; papillary += 1) {
      const leaflets = new Set(papillaryAttachments(MITRAL, papillary).map((cord) => cord.leaflet));
      expect([...leaflets].sort()).toEqual([0, 1]);
    }
  });

  it('sends each muscle only to the halves next to its commissure', () => {
    const [anterolateral, posteromedial] = [0, 1].map((papillary) =>
      papillaryAttachments(MITRAL, papillary),
    );
    for (const cord of anterolateral) {
      if (cord.leaflet === 0) expect(cord.share).toBeLessThan(0.5);
      else expect(cord.share).toBeGreaterThan(0.5);
    }
    for (const cord of posteromedial) {
      if (cord.leaflet === 1) expect(cord.share).toBeLessThan(0.5);
      else expect(cord.share).toBeGreaterThan(0.5);
    }
  });

  it('attaches most cords at the free edge', () => {
    const cords = [0, 1].flatMap((papillary) => papillaryAttachments(MITRAL, papillary));
    const atEdge = cords.filter((cord) => cord.row === MITRAL.shape.rows);
    expect(atEdge.length).toBeGreaterThan(cords.length / 2);
  });

  it('gives the tricuspid three muscles that each reach two leaflets', () => {
    expect(TRICUSPID.papillaries).toHaveLength(3);
    for (let papillary = 0; papillary < 3; papillary += 1) {
      const leaflets = new Set(
        papillaryAttachments(TRICUSPID, papillary).map((cord) => cord.leaflet),
      );
      expect(leaflets.size).toBe(2);
    }
  });
});
