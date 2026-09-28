import { describe, expect, it } from 'vitest';
import {
  focalLengthFor,
  imageDistance,
  lateralMagnification,
  magnifierFocalLength,
  magnifierPower,
  refractedSlope,
} from './lens';

describe('thin lens', () => {
  it('puts a real, inverted image beyond the lens for an object outside the focal length', () => {
    const distance = imageDistance(10, 15);
    expect(distance).toBeCloseTo(30, 9);
    expect(lateralMagnification(15, distance)).toBeCloseTo(-2, 9);
  });

  it('sends the image to infinity for an object at the focal point', () => {
    expect(imageDistance(25, 25)).toBe(Infinity);
  });

  it('gives an upright virtual image for an object inside the focal length', () => {
    const distance = imageDistance(10, 5);
    expect(distance).toBeCloseTo(-10, 9);
    expect(lateralMagnification(5, distance)).toBeCloseTo(2, 9);
  });

  it('finds the focal length that joins an object and its image', () => {
    expect(focalLengthFor(15, 30)).toBeCloseTo(10, 9);
  });

  it('bends a ray by its height over the focal length', () => {
    expect(refractedSlope(0, 5, 10)).toBeCloseTo(-0.5, 9);
    expect(refractedSlope(0.2, -4, 20)).toBeCloseTo(0.4, 9);
  });
});

describe('magnifier', () => {
  it('magnifies 250 mm over the focal length', () => {
    expect(magnifierPower(25)).toBeCloseTo(10, 9);
    expect(magnifierFocalLength(10)).toBeCloseTo(25, 9);
    expect(magnifierFocalLength(12.5)).toBeCloseTo(20, 9);
    expect(magnifierFocalLength(15)).toBeCloseTo(16.67, 2);
  });
});
