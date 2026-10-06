import { Group } from 'three';
import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { AssemblyState, PartId } from '../../../ids';
import { VOXEL } from '../../../model/layout';
import type { PartContext, SceneModule } from '../context';
import { FieldLines } from './fieldLines';
import { Pulses } from './pulses';
import { VoxelInset } from './voxel';

class EffectsModule implements SceneModule {
  readonly root = new Group();
  readonly labels: ReadonlyMap<PartId, Object3D>;
  readonly anchors: SceneModule['anchors'];
  private readonly fieldLines: FieldLines;
  private readonly voxel: VoxelInset;
  private readonly pulses: Pulses;
  private playing = false;

  constructor(context: PartContext) {
    this.root.name = 'effects';
    this.fieldLines = new FieldLines(context);
    this.voxel = new VoxelInset(context);
    this.pulses = new Pulses(context);
    this.root.add(
      this.fieldLines.lines,
      this.fieldLines.fringe,
      this.voxel.spins,
      this.voxel.net,
      this.voxel.field,
      this.pulses.rf.group,
      this.pulses.echo.group,
      this.pulses.slab,
    );
    this.labels = new Map<PartId, Object3D>([
      ['fieldLinesGroup', this.fieldLines.linesLabel],
      ['fringeLine', this.fieldLines.fringeLabel],
      ['spinArrows', this.voxel.labels.spinArrows],
      ['netMagnet', this.voxel.labels.netMagnet],
      ['mainField', this.voxel.labels.mainField],
      ['rfWave', this.pulses.labels.rfWave],
      ['echoWave', this.pulses.labels.echoWave],
      ['sliceSlab', this.pulses.labels.sliceSlab],
    ]);
    this.anchors = { voxel: anchorAt(this.root, ...VOXEL.centre) };
  }

  setState(state: AssemblyState): void {
    const { view, fringe, spins, tissue, sequence } = state;
    this.playing = state.playing;
    this.fieldLines.show(view.fieldLines);
    this.fieldLines.setFringe(fringe);
    this.voxel.show(view.voxel);
    this.voxel.setState(spins, tissue);
    this.pulses.setState(sequence);
  }

  update(deltaSeconds: number): boolean {
    const flowing = this.fieldLines.advance(deltaSeconds);
    const turning = this.voxel.advance(deltaSeconds, this.playing);
    const easing = this.pulses.advance(deltaSeconds);
    return flowing || turning || easing;
  }
}

export function createEffectsModule(context: PartContext): SceneModule {
  return new EffectsModule(context);
}
