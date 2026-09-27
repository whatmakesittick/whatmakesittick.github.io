import { MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from './materials';

const METAL = { color: '#888888', metalness: 1 };
const GLASS = { color: '#ffffff', transparent: true, opacity: 0.6 };

function translucent(opacity: number): MeshBasicMaterial {
  return new MeshBasicMaterial({ transparent: true, opacity });
}

describe('MaterialLibrary', () => {
  it('dims an opaque material and makes it opaque again at full emphasis', () => {
    const library = new MaterialLibrary();
    const material = library.get('part', METAL);
    library.setEmphasis('part', 0.35);
    expect(material).toMatchObject({ opacity: 0.35, transparent: true });
    library.setEmphasis('part', 1);
    expect(material).toMatchObject({ opacity: 1, transparent: false });
  });

  it('dims a translucent material relative to its own opacity and restores it', () => {
    const library = new MaterialLibrary();
    const material = translucent(0.4);
    library.register('air', material);
    library.setEmphasis('air', 0.5);
    expect(material).toMatchObject({ opacity: 0.2, transparent: true });
    library.setEmphasis('air', 1);
    expect(material).toMatchObject({ opacity: 0.4, transparent: true });
  });

  it('creates a material at the current emphasis of its group', () => {
    const library = new MaterialLibrary();
    library.setEmphasis('part', 0.5);
    expect(library.get('part', GLASS).opacity).toBeCloseTo(0.3);
  });

  it('does not dim a material twice when it is registered again', () => {
    const library = new MaterialLibrary();
    const material = translucent(0.4);
    library.register('air', material);
    library.setEmphasis('air', 0.5);
    library.clearRegistered();
    library.register('air', material);
    expect(material.opacity).toBeCloseTo(0.2);
  });
});
