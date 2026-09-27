import { describe, expect, it } from 'vitest';
import { imageDistance } from './lens';
import {
  COVERSLIP_MM,
  EYEPIECE_IDS,
  FIELD_NUMBER_MM,
  OBJECTIVES,
  OBJECTIVE_IDS,
  eyepieceFocalLength,
  objectiveFocalLength,
} from './objectives';
import type { EyepieceId, ObjectiveId } from './objectives';
import {
  BEAM_RADIUS_MM,
  EYE_FOCAL_LENGTH_MM,
  EYE_RELIEF_MM,
  IMAGE_PLANE,
  PATH_CYCLE,
  PHASE_IDS,
  PHASE_RANGES,
  SHOULDER,
  STATIONS,
  TUBE_TOP,
  axialPosition,
  eyepieceTop,
  irisOpening,
  lateralAt,
  lightRays,
  opticalLayout,
  phaseAt,
  stationBounds,
} from './path';
import type { Ray } from './path';

const PAIRS = OBJECTIVE_IDS.flatMap((objective) =>
  EYEPIECE_IDS.map((eyepiece) => [objective, eyepiece] as [ObjectiveId, EyepieceId]),
);
const IMAGE_VERTEX = 2;
const EYEPIECE_VERTEX = 3;
const EYE_VERTEX = 4;
const RETINA_VERTEX = 5;
const RAYS_PER_POINT = 3;
const LIFT_MM = 0.05;

function slope(ray: Ray, from: number): number {
  const a = ray[from];
  const b = ray[from + 1];
  return (b.lateral - a.lateral) / (b.axial - a.axial);
}

describe('stations', () => {
  it('cover the path from the filament to the retina without gaps', () => {
    const ranges = PHASE_IDS.map((id) => PHASE_RANGES[id]);
    expect(ranges[0].start).toBe(0);
    expect(ranges[ranges.length - 1].end).toBe(PATH_CYCLE);
    ranges.slice(1).forEach((range, index) => expect(range.start).toBe(ranges[index].end));
    const total = ranges.reduce((sum, range) => sum + range.end - range.start, 0);
    expect(total).toBe(PATH_CYCLE);
  });

  it('round the default 10x and 10x instrument to whole millimetres', () => {
    const bounds = stationBounds(opticalLayout('x10', 'x10'));
    PHASE_IDS.forEach((id) => {
      expect(Math.round(bounds[id].start), id).toBe(PHASE_RANGES[id].start);
      expect(Math.round(bounds[id].end), id).toBe(PHASE_RANGES[id].end);
    });
    expect(PATH_CYCLE).toBe(Math.round(opticalLayout('x10', 'x10').retina));
  });

  it('stack the 45 mm parfocal distance and the 160 mm tube above the specimen', () => {
    expect(SHOULDER - STATIONS.specimen).toBe(45);
    expect(TUBE_TOP - SHOULDER).toBe(160);
    expect(TUBE_TOP - IMAGE_PLANE).toBe(10);
  });

  it('puts the eye point 9.5 mm above the eyepiece', () => {
    EYEPIECE_IDS.forEach((eyepiece) => {
      const layout = opticalLayout('x10', eyepiece);
      expect(layout.eyeLens - eyepieceTop(eyepiece)).toBeCloseTo(EYE_RELIEF_MM, 9);
    });
  });

  it('names the phase at any point of the path', () => {
    expect(phaseAt(0)).toBe('lamp');
    expect(phaseAt(99)).toBe('lamp');
    expect(phaseAt(100)).toBe('condenser');
    expect(phaseAt(135)).toBe('condenser');
    expect(phaseAt(140)).toBe('specimen');
    expect(phaseAt(160)).toBe('objective');
    expect(phaseAt(250)).toBe('tube');
    expect(phaseAt(350)).toBe('eyepiece');
    expect(phaseAt(395)).toBe('eye');
    expect(phaseAt(PATH_CYCLE)).toBe('eye');
  });

  it('squeezes the specimen stretch to the working distance of each objective', () => {
    const bounds = stationBounds(opticalLayout('x100', 'x10'));
    expect(axialPosition(PHASE_RANGES.specimen.start, bounds)).toBeCloseTo(136, 9);
    expect(axialPosition(PHASE_RANGES.specimen.end, bounds)).toBeCloseTo(136.3, 9);
    expect(axialPosition(PHASE_RANGES.tube.start, bounds)).toBeCloseTo(SHOULDER, 9);
  });

  it.each(OBJECTIVE_IDS)('runs the specimen stretch inside the light cone of %s', (objective) => {
    const layout = opticalLayout(objective, 'x10', LIFT_MM);
    const { specimen } = stationBounds(layout);
    expect(specimen.start).toBe(layout.specimen);
    expect(specimen.end).toBe(layout.objectiveFront);
  });
});

describe('working distance', () => {
  it.each(OBJECTIVE_IDS)('leaves the catalogue gap over the coverslip for %s', (objective) => {
    const layout = opticalLayout(objective, 'x10');
    expect(layout.objectiveFront - layout.specimen - COVERSLIP_MM).toBeCloseTo(
      OBJECTIVES[objective].workingDistance,
      9,
    );
    expect(layout.objectiveLens).toBeGreaterThan(layout.objectiveFront);
  });
});

describe('image forming rays', () => {
  it.each(PAIRS)('meet the thin lens relation for %s with a %s eyepiece', (objective, eyepiece) => {
    const layout = opticalLayout(objective, eyepiece);
    const objectDistance = layout.objectiveLens - layout.specimen;
    expect(imageDistance(objectiveFocalLength(objective), objectDistance)).toBeCloseTo(
      layout.image - layout.objectiveLens,
      6,
    );
  });

  it.each(PAIRS)(
    'cross at the inverted intermediate image for %s and %s',
    (objective, eyepiece) => {
      const layout = opticalLayout(objective, eyepiece);
      const { image } = lightRays(layout);
      const [axis, edge] = [image.slice(0, RAYS_PER_POINT), image.slice(RAYS_PER_POINT)];
      axis.forEach((ray) => {
        expect(ray[IMAGE_VERTEX].axial).toBe(IMAGE_PLANE);
        expect(ray[IMAGE_VERTEX].lateral).toBeCloseTo(0, 9);
      });
      edge.forEach((ray) => {
        expect(ray[IMAGE_VERTEX].axial).toBe(IMAGE_PLANE);
        expect(ray[IMAGE_VERTEX].lateral).toBeCloseTo(-FIELD_NUMBER_MM / 2, 9);
        expect(ray[0].lateral).toBeCloseTo(layout.fieldHeight, 9);
      });
      expect(layout.imageHeight / layout.fieldHeight).toBeCloseTo(
        -OBJECTIVES[objective].magnification,
        9,
      );
    },
  );

  it.each(PAIRS)('leave the %s and %s eyepiece parallel', (objective, eyepiece) => {
    const layout = opticalLayout(objective, eyepiece);
    const { image } = lightRays(layout);
    const edge = image.slice(RAYS_PER_POINT);
    const expected = FIELD_NUMBER_MM / 2 / eyepieceFocalLength(eyepiece);
    edge.forEach((ray) => expect(slope(ray, EYEPIECE_VERTEX)).toBeCloseTo(expected, 9));
    image
      .slice(0, RAYS_PER_POINT)
      .forEach((ray) => expect(slope(ray, EYEPIECE_VERTEX)).toBeCloseTo(0, 9));
  });

  it.each(PAIRS)('focus on the retina for %s and %s', (objective, eyepiece) => {
    const layout = opticalLayout(objective, eyepiece);
    const { image } = lightRays(layout);
    image.forEach((ray) => expect(ray[RETINA_VERTEX].axial).toBeCloseTo(layout.retina, 9));
    image
      .slice(0, RAYS_PER_POINT)
      .forEach((ray) => expect(ray[RETINA_VERTEX].lateral).toBeCloseTo(0, 9));
    image
      .slice(RAYS_PER_POINT)
      .forEach((ray) => expect(ray[RETINA_VERTEX].lateral).toBeCloseTo(layout.retinaHeight, 9));
    expect(layout.retinaHeight).toBeCloseTo(
      ((FIELD_NUMBER_MM / 2) * EYE_FOCAL_LENGTH_MM) / eyepieceFocalLength(eyepiece),
      9,
    );
  });

  it('flips the retinal image back to the side of the specimen point', () => {
    const layout = opticalLayout('x10', 'x10');
    expect(Math.sign(layout.imageHeight)).toBe(-1);
    expect(Math.sign(layout.retinaHeight)).toBe(Math.sign(layout.fieldHeight));
  });

  it('crosses the chief rays at the eye point', () => {
    const layout = opticalLayout('x40', 'x125');
    const chief = lightRays(layout).image[RAYS_PER_POINT + 1];
    expect(chief[EYE_VERTEX]).toEqual({ lateral: expect.any(Number), axial: layout.eyeLens });
    expect(chief[EYE_VERTEX].lateral).toBeCloseTo(0, 9);
  });

  it('traces the virtual image back from the eyepiece along each parallel ray', () => {
    const layout = opticalLayout('x10', 'x10');
    const { image, virtual } = lightRays(layout);
    expect(virtual).toHaveLength(RAYS_PER_POINT);
    virtual.forEach((ray, index) => {
      const source = image[RAYS_PER_POINT + index];
      expect(ray[1]).toEqual(source[EYEPIECE_VERTEX]);
      expect(slope(ray, 0)).toBeCloseTo(slope(source, EYEPIECE_VERTEX), 9);
      expect(ray[0].axial).toBeLessThan(ray[1].axial);
    });
  });
});

describe('illumination', () => {
  it('opens the iris to 80% of the objective aperture, up to the condenser 0.9', () => {
    expect(irisOpening('x10')).toBeCloseTo(8 * Math.tan(Math.asin(0.2)), 9);
    expect(irisOpening('x100')).toBeCloseTo(8 * Math.tan(Math.asin(0.9)), 9);
    expect(irisOpening('x100')).toBeLessThan(BEAM_RADIUS_MM);
  });

  it('focuses the rays that pass the iris on the specimen and stops the rest', () => {
    const layout = opticalLayout('x40', 'x10');
    const { illumination, blocked } = lightRays(layout);
    expect(illumination).toHaveLength(3);
    illumination.forEach((ray) =>
      expect(ray[ray.length - 1]).toEqual({ lateral: 0, axial: layout.specimen }),
    );
    expect(blocked).toHaveLength(2);
    blocked.forEach((ray) => expect(ray[ray.length - 1].axial).toBe(layout.iris));
  });

  it('lifts the condenser and the slide with the stage but keeps the objective', () => {
    const still = opticalLayout('x10', 'x10');
    const raised = opticalLayout('x10', 'x10', 0.5);
    expect(raised.specimen - still.specimen).toBeCloseTo(0.5, 9);
    expect(raised.condenser - still.condenser).toBeCloseTo(0.5, 9);
    expect(raised.iris - still.iris).toBeCloseTo(0.5, 9);
    expect(raised.objectiveLens).toBe(still.objectiveLens);
    expect(raised.image).toBe(still.image);
  });
});

describe('lateralAt', () => {
  const ray: Ray = [
    { lateral: 0, axial: 0 },
    { lateral: 4, axial: 10 },
    { lateral: 4, axial: 20 },
  ];

  it('follows the ray between its vertices', () => {
    expect(lateralAt(ray, 5)).toBeCloseTo(2, 9);
    expect(lateralAt(ray, 15)).toBeCloseTo(4, 9);
  });

  it('has nothing to say beyond the ray', () => {
    expect(lateralAt(ray, -1)).toBeNull();
    expect(lateralAt(ray, 21)).toBeNull();
  });
});
