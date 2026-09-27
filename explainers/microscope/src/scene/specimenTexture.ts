import { CanvasTexture, SRGBColorSpace } from 'three';
import { MICROMETRES_PER_MM, fieldOfView, spectralColor } from '../model';
import type { ObjectiveId } from '../model';
import { paintSpecimen } from '../specimenPainter';
import { HALF_TURN } from '../turns';

const TEXTURE_SIZE = 512;

export class SpecimenTexture {
  readonly upright: CanvasTexture;
  readonly turned: CanvasTexture;
  private readonly canvas = document.createElement('canvas');

  constructor() {
    this.canvas.width = TEXTURE_SIZE;
    this.canvas.height = TEXTURE_SIZE;
    this.upright = new CanvasTexture(this.canvas);
    this.upright.colorSpace = SRGBColorSpace;
    this.turned = this.upright.clone();
    this.turned.center.set(0.5, 0.5);
    this.turned.rotation = HALF_TURN;
  }

  paint(objective: ObjectiveId, wavelength: number): void {
    const context = this.canvas.getContext('2d');
    if (!context) return;
    paintSpecimen(context, TEXTURE_SIZE, {
      fieldUm: fieldOfView(objective) * MICROMETRES_PER_MM,
      tint: spectralColor(wavelength),
      turned: false,
    });
    this.upright.needsUpdate = true;
    this.turned.needsUpdate = true;
  }

  dispose(): void {
    this.upright.dispose();
    this.turned.dispose();
  }
}
