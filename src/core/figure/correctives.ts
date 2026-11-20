import { AXES } from './matrix';
import type { CorrectiveModel, CorrectiveRegion } from './model';

export class Correctives {
  private readonly activations: Float64Array;
  private readonly coefficients: Float64Array;
  private readonly model: CorrectiveModel;

  constructor(model: CorrectiveModel) {
    this.model = model;
    this.activations = new Float64Array(model.firstLayer.start.length - 1);
    this.coefficients = new Float64Array(
      model.regions.reduce((most, region) => Math.max(most, region.components), 0),
    );
  }

  apply(features: Float64Array, target: Float32Array): void {
    this.activate(features);
    for (const region of this.model.regions) this.addRegion(region, target);
  }

  private activate(features: Float64Array): void {
    const { start, columns, values } = this.model.firstLayer;
    for (let unit = 0; unit < this.activations.length; unit++) {
      let sum = 0;
      for (let i = start[unit]; i < start[unit + 1]; i++) sum += values[i] * features[columns[i]];
      this.activations[unit] = sum > 0 ? sum : 0;
    }
  }

  private addRegion(region: CorrectiveRegion, target: Float32Array): void {
    this.project(region);
    const { vertices, components, vertexWeights } = region;
    const coefficients = this.coefficients;
    for (let i = 0; i < vertices.length; i++) {
      const at = vertices[i] * AXES;
      for (let axis = 0; axis < AXES; axis++) {
        const row = (i * AXES + axis) * components;
        let sum = 0;
        for (let k = 0; k < components; k++) sum += coefficients[k] * vertexWeights[row + k];
        target[at + axis] += sum;
      }
    }
  }

  private project(region: CorrectiveRegion): void {
    const { units, components, unitWeights, scales } = region;
    const sums = this.coefficients;
    sums.fill(0, 0, components);
    for (let i = 0; i < units.length; i++) {
      const activation = this.activations[units[i]];
      if (activation === 0) continue;
      const row = i * components;
      for (let k = 0; k < components; k++) sums[k] += activation * unitWeights[row + k];
    }
    for (let k = 0; k < components; k++) sums[k] *= scales[k];
  }
}
