import { Color, MeshStandardMaterial, SRGBColorSpace } from 'three';
import type { Material, MeshStandardMaterialParameters, RGB } from 'three';
import { lerp } from '../math';

export type MaterialFinish = Readonly<MeshStandardMaterialParameters>;

export interface DimStyle {
  saturation: number;
  brightness: number;
  emissive: number;
  opacity: number;
}

export interface MaterialLibraryOptions {
  dim?: Partial<DimStyle>;
  undimmed?: readonly string[];
}

export const STRUCTURE_GROUP = 'structure';
export const UNDIMMED_GROUP = 'backdrop';

export const DIM_STYLE: Readonly<DimStyle> = {
  saturation: 0.25,
  brightness: 0.45,
  emissive: 0.2,
  opacity: 1,
};

const FULL_EMPHASIS = 0.999;
const LUMA = { r: 0.2126, g: 0.7152, b: 0.0722 } as const;

type TintedMaterial = Material & { color: Color };
type GlowingMaterial = Material & { emissiveIntensity: number };

interface Tint {
  color: Color;
  srgb: RGB;
}

interface ToneBase {
  tint?: Tint;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
}

export function createMaterial(finish: MaterialFinish): MeshStandardMaterial {
  return new MeshStandardMaterial(finish);
}

function isTinted(material: Material): material is TintedMaterial {
  return 'color' in material && material.color instanceof Color;
}

function isGlowing(material: Material): material is GlowingMaterial {
  return 'emissiveIntensity' in material && typeof material.emissiveIntensity === 'number';
}

function captureTint(material: Material): Tint | undefined {
  if (!isTinted(material)) return undefined;
  const color = material.color.clone();
  return { color, srgb: color.getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace) };
}

function captureTone(material: Material): ToneBase {
  return {
    tint: captureTint(material),
    emissiveIntensity: isGlowing(material) ? material.emissiveIntensity : 0,
    opacity: material.opacity,
    transparent: material.transparent,
  };
}

function applyColor(material: Material, base: ToneBase, style: DimStyle, emphasis: number): void {
  if (!base.tint || !isTinted(material)) return;
  if (emphasis >= FULL_EMPHASIS) {
    material.color.copy(base.tint.color);
    return;
  }
  const { r, g, b } = base.tint.srgb;
  const grey = LUMA.r * r + LUMA.g * g + LUMA.b * b;
  const saturation = lerp(style.saturation, 1, emphasis);
  const brightness = lerp(style.brightness, 1, emphasis);
  const tone = (channel: number) => lerp(grey, channel, saturation) * brightness;
  material.color.setRGB(tone(r), tone(g), tone(b), SRGBColorSpace);
}

function applyGlow(material: Material, base: ToneBase, style: DimStyle, emphasis: number): void {
  if (base.emissiveIntensity === 0 || !isGlowing(material)) return;
  material.emissiveIntensity = base.emissiveIntensity * lerp(style.emissive, 1, emphasis);
}

function applyOpacity(material: Material, base: ToneBase, style: DimStyle, emphasis: number): void {
  const transparent = base.transparent || emphasis < FULL_EMPHASIS;
  if (material.transparent !== transparent) {
    material.transparent = transparent;
    material.needsUpdate = true;
  }
  material.opacity = base.opacity * lerp(style.opacity, 1, emphasis);
}

function applyTone(material: Material, base: ToneBase, style: DimStyle, emphasis: number): void {
  applyColor(material, base, style, emphasis);
  applyGlow(material, base, style, emphasis);
  if (style.opacity < 1) applyOpacity(material, base, style, emphasis);
}

export class MaterialLibrary {
  private readonly style: DimStyle;
  private readonly undimmed: ReadonlySet<string>;
  private readonly finishes = new Map<string, Map<MaterialFinish, MeshStandardMaterial>>();
  private readonly extras = new Map<string, Set<Material>>();
  private readonly emphasis = new Map<string, number>();
  private readonly bases = new WeakMap<Material, ToneBase>();
  private readonly groups = new WeakMap<Material, string>();

  constructor(options: MaterialLibraryOptions = {}) {
    this.style = { ...DIM_STYLE, ...options.dim };
    this.undimmed = new Set([UNDIMMED_GROUP, ...(options.undimmed ?? [])]);
  }

  canDim(group: string): boolean {
    return !this.undimmed.has(group);
  }

  get(group: string, finish: MaterialFinish): MeshStandardMaterial {
    let byFinish = this.finishes.get(group);
    if (!byFinish) {
      byFinish = new Map();
      this.finishes.set(group, byFinish);
    }
    let material = byFinish.get(finish);
    if (!material) {
      material = createMaterial(finish);
      this.emphasise(material, this.emphasisOf(group));
      byFinish.set(finish, material);
      this.groups.set(material, group);
    }
    return material;
  }

  register(group: string, material: Material): void {
    let set = this.extras.get(group);
    if (!set) {
      set = new Set();
      this.extras.set(group, set);
    }
    set.add(material);
    this.groups.set(material, group);
    this.emphasise(material, this.emphasisOf(group));
  }

  groupOf(material: Material): string | undefined {
    return this.groups.get(material);
  }

  clearRegistered(): void {
    this.extras.clear();
  }

  emphasisOf(group: string): number {
    return this.emphasis.get(group) ?? 1;
  }

  setEmphasis(group: string, value: number): void {
    if (this.emphasisOf(group) === value) return;
    this.emphasis.set(group, value);
    this.finishes.get(group)?.forEach((material) => this.emphasise(material, value));
    this.extras.get(group)?.forEach((material) => this.emphasise(material, value));
  }

  dispose(): void {
    this.finishes.forEach((byFinish) => byFinish.forEach((material) => material.dispose()));
    this.finishes.clear();
    this.extras.clear();
  }

  private emphasise(material: Material, emphasis: number): void {
    applyTone(material, this.baseOf(material), this.style, emphasis);
  }

  private baseOf(material: Material): ToneBase {
    let base = this.bases.get(material);
    if (!base) {
      base = captureTone(material);
      this.bases.set(material, base);
    }
    return base;
  }
}
