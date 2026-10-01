import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatFixed, formatSignificant, formatSigned } from './format';

const language = vi.hoisted(() => ({ code: 'en' }));

vi.mock('./i18n', () => ({ currentLanguage: () => language.code }));

describe('formatSigned', () => {
  beforeEach(() => {
    language.code = 'en';
  });

  it('shows the sign of positive and negative values', () => {
    expect(formatSigned(2.2, 1)).toBe('+2.2');
    expect(formatSigned(-2.5, 1)).toBe('-2.5');
    expect(formatSigned(3, 0)).toBe('+3');
  });

  it('leaves zero and values that round to zero unsigned', () => {
    expect(formatSigned(0, 1)).toBe('0.0');
    expect(formatSigned(0.02, 1)).toBe('0.0');
    expect(formatSigned(-0.02, 1)).toBe('0.0');
  });

  it('follows the current language', () => {
    language.code = 'de';
    expect(formatSigned(1.5, 1)).toBe('+1,5');
    expect(formatSigned(-2.5, 1)).toBe('-2,5');
  });

  it('keeps the unsigned formats apart from the signed one', () => {
    expect(formatSigned(1.5, 1)).toBe('+1.5');
    expect(formatFixed(1.5, 1)).toBe('1.5');
  });
});

describe('formatSignificant', () => {
  beforeEach(() => {
    language.code = 'en';
  });

  it('rounds to the given number of significant figures', () => {
    expect(formatSignificant(2979.2, 2)).toBe('3,000');
    expect(formatSignificant(2715, 2)).toBe('2,700');
    expect(formatSignificant(287.2, 2)).toBe('290');
    expect(formatSignificant(1.537, 2)).toBe('1.5');
  });

  it('drops trailing zeros and keeps zero plain', () => {
    expect(formatSignificant(1, 2)).toBe('1');
    expect(formatSignificant(0, 2)).toBe('0');
  });

  it('follows the current language', () => {
    language.code = 'de';
    expect(formatSignificant(2979.2, 2)).toBe('3.000');
    expect(formatSignificant(1.537, 2)).toBe('1,5');
  });
});
