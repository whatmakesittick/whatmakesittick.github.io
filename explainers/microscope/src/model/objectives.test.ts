import { describe, expect, it } from 'vitest';
import {
  EYEPIECE_IDS,
  OBJECTIVES,
  OBJECTIVE_IDS,
  PARFOCAL_DISTANCE_MM,
  SPECIMEN_TO_IMAGE_MM,
  acceptanceHalfAngle,
  eyepieceFocalLength,
  frontAboveSpecimen,
  objectiveFocalLength,
  specimenToLens,
  totalMagnification,
} from './objectives';

describe('objectives', () => {
  it('pins the catalogue numbers of the four objectives', () => {
    expect(OBJECTIVES).toEqual({
      x4: { magnification: 4, numericalAperture: 0.1, workingDistance: 25, immersion: 'air' },
      x10: { magnification: 10, numericalAperture: 0.25, workingDistance: 7.5, immersion: 'air' },
      x40: { magnification: 40, numericalAperture: 0.65, workingDistance: 0.6, immersion: 'air' },
      x100: {
        magnification: 100,
        numericalAperture: 1.25,
        workingDistance: 0.13,
        immersion: 'oil',
      },
    });
  });

  it('forms the image 195 mm above the specimen: 45 mm parfocal, 160 mm tube, 10 mm below the top', () => {
    expect(SPECIMEN_TO_IMAGE_MM).toBe(195);
  });

  it('multiplies the objective by the eyepiece for every pair', () => {
    const table = OBJECTIVE_IDS.map((objective) =>
      EYEPIECE_IDS.map((eyepiece) => totalMagnification(objective, eyepiece)),
    );
    expect(table).toEqual([
      [40, 50, 60],
      [100, 125, 150],
      [400, 500, 600],
      [1000, 1250, 1500],
    ]);
  });

  it('works out the eyepiece focal lengths from 250 mm over the power', () => {
    expect(eyepieceFocalLength('x10')).toBeCloseTo(25, 9);
    expect(eyepieceFocalLength('x125')).toBeCloseTo(20, 9);
    expect(eyepieceFocalLength('x15')).toBeCloseTo(16.67, 2);
  });

  it('gives a 160 mm objective about 16 mm of focal length at 10x and 4.6 mm at 40x', () => {
    expect(objectiveFocalLength('x10')).toBeCloseTo(16.1, 1);
    expect(objectiveFocalLength('x40')).toBeCloseTo(4.64, 2);
  });

  it.each(OBJECTIVE_IDS)('keeps the %s lens between its front and its shoulder', (id) => {
    const lens = specimenToLens(id);
    expect(frontAboveSpecimen(id)).toBeCloseTo(0.17 + OBJECTIVES[id].workingDistance, 9);
    expect(lens).toBeGreaterThan(frontAboveSpecimen(id));
    expect(lens).toBeLessThan(PARFOCAL_DISTANCE_MM);
  });

  it('collects a wider cone through oil than air allows', () => {
    expect(Math.sin(acceptanceHalfAngle('x40'))).toBeCloseTo(0.65, 9);
    expect(Math.sin(acceptanceHalfAngle('x100'))).toBeCloseTo(1.25 / 1.515, 9);
  });
});
