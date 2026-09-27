import {
  Color,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointsMaterial,
  SRGBColorSpace,
  SpriteMaterial,
} from 'three';
import type { RGB } from 'three';
import { describe, expect, it } from 'vitest';
import { DIM_STYLE, MaterialLibrary, UNDIMMED_GROUP } from './materials';

const RED = '#cc3333';
const METAL = { color: '#888888', metalness: 1 };
const GLASS = { color: '#ffffff', transparent: true, opacity: 0.6 };
const GLOW = { color: RED, emissive: RED, emissiveIntensity: 0.5 };

const LUMA = { r: 0.2126, g: 0.7152, b: 0.0722 };

function srgb(color: Color | string): RGB {
  return new Color(color).getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
}

function luma(color: Color | string): number {
  const { r, g, b } = srgb(color);
  return LUMA.r * r + LUMA.g * g + LUMA.b * b;
}

function spread(color: Color | string): number {
  const { r, g, b } = srgb(color);
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function translucent(opacity: number): MeshBasicMaterial {
  return new MeshBasicMaterial({ color: RED, transparent: true, opacity });
}

describe('MaterialLibrary', () => {
  it('knows the group of every material it made or registered', () => {
    const library = new MaterialLibrary();
    const made = library.get('part', METAL);
    const registered = translucent(0.4);
    library.register('glass', registered);
    expect(library.groupOf(made)).toBe('part');
    expect(library.groupOf(registered)).toBe('glass');
    expect(library.groupOf(translucent(0.4))).toBeUndefined();
  });

  it('desaturates and darkens a dimmed colour by the dim style', () => {
    const library = new MaterialLibrary();
    const material = library.get('part', GLOW);
    library.setEmphasis('part', 0);
    expect(luma(material.color)).toBeCloseTo(luma(RED) * DIM_STYLE.brightness);
    expect(spread(material.color)).toBeCloseTo(
      spread(RED) * DIM_STYLE.saturation * DIM_STYLE.brightness,
    );
    expect(material.emissiveIntensity).toBeCloseTo(GLOW.emissiveIntensity * DIM_STYLE.emissive);
  });

  it('keeps the opacity and transparency of every material', () => {
    const library = new MaterialLibrary();
    const opaque = library.get('part', METAL);
    const air = translucent(0.4);
    library.register('part', air);
    library.setEmphasis('part', 0);
    expect(opaque).toMatchObject({ opacity: 1, transparent: false });
    expect(air).toMatchObject({ opacity: 0.4, transparent: true });
  });

  it('restores the exact base colour and glow at full emphasis', () => {
    const library = new MaterialLibrary();
    const material = library.get('part', GLOW);
    const color = material.color.clone();
    library.setEmphasis('part', 0.3);
    library.setEmphasis('part', 1);
    expect(material.color.equals(color)).toBe(true);
    expect(material.emissiveIntensity).toBe(GLOW.emissiveIntensity);
  });

  it('creates a material at the current emphasis of its group', () => {
    const library = new MaterialLibrary();
    library.setEmphasis('part', 0);
    const material = library.get('part', METAL);
    expect(luma(material.color)).toBeCloseTo(luma(METAL.color) * DIM_STYLE.brightness);
  });

  it('does not dim a material twice when it is registered again', () => {
    const library = new MaterialLibrary();
    const material = translucent(0.4);
    library.register('air', material);
    library.setEmphasis('air', 0);
    library.clearRegistered();
    library.register('air', material);
    expect(luma(material.color)).toBeCloseTo(luma(RED) * DIM_STYLE.brightness);
  });

  it('dims every material type that has a colour', () => {
    const library = new MaterialLibrary();
    const materials = [
      new MeshStandardMaterial({ color: RED }),
      new MeshBasicMaterial({ color: RED }),
      new PointsMaterial({ color: RED }),
      new LineBasicMaterial({ color: RED }),
      new SpriteMaterial({ color: RED }),
    ];
    materials.forEach((material) => library.register('part', material));
    library.setEmphasis('part', 0);
    const dimmed = luma(RED) * DIM_STYLE.brightness;
    materials.forEach((material) => expect(luma(material.color)).toBeCloseTo(dimmed));
  });

  it('leaves a glow that the material did not start with to its owner', () => {
    const library = new MaterialLibrary();
    const material = new MeshStandardMaterial({ color: RED, emissive: RED, emissiveIntensity: 0 });
    library.register('spark', material);
    material.emissiveIntensity = 2;
    library.setEmphasis('spark', 0.5);
    expect(material.emissiveIntensity).toBe(2);
  });

  it('fades the opacity when the dim style asks for it and restores it', () => {
    const library = new MaterialLibrary({ dim: { opacity: 0.5 } });
    const opaque = library.get('part', METAL);
    const glass = library.get('part', GLASS);
    library.setEmphasis('part', 0);
    expect(opaque).toMatchObject({ opacity: 0.5, transparent: true });
    expect(glass.opacity).toBeCloseTo(0.3);
    library.setEmphasis('part', 1);
    expect(opaque).toMatchObject({ opacity: 1, transparent: false });
    expect(glass).toMatchObject({ opacity: 0.6, transparent: true });
  });

  it('never dims the backdrop group or the groups it is told to leave alone', () => {
    const library = new MaterialLibrary({ undimmed: ['sky'] });
    expect(library.canDim(UNDIMMED_GROUP)).toBe(false);
    expect(library.canDim('sky')).toBe(false);
    expect(library.canDim('part')).toBe(true);
  });
});
