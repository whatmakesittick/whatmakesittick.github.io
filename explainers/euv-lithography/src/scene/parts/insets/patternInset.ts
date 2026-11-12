import { Matrix4, Quaternion, Vector3 } from 'three';
import type { InstancedMesh, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, lerp } from '@core/math';
import type { AssemblyState } from '../../../ids';
import { PART_POINTS } from '../../../model/layout';
import { PATTERN_LINES, lineWidthM, patchWidthM } from '../../../model/scale';
import { finishMesh, label, namedGroup, sceneAnchor } from '../context';
import type { Frame, PartContext } from '../context';
import { Ease } from '../kit';
import {
  BEVEL_SEGMENTS,
  LEADER_END_WAFER,
  LINE_BEVEL,
  LINE_DEPTH_M,
  LINE_HEIGHT_M,
  LINE_LEFT_M,
  PATTERN_PANEL,
  STRIP,
} from './dims';
import { INSET_FINISHES } from './finishes';
import { finishInstances } from './instances';
import { addLeader, addPanel } from './panel';
import { VirusPart } from './virus';

const GROUP = 'patternInset';
const HALF = 0.5;
const LATENT_SHARE = 0.25;
const REFERENCE_OPTICS = 'na033';
const REFERENCE_WIDTH = lineWidthM(REFERENCE_OPTICS);
const IDENTITY = new Quaternion();
const STRIP_TOP = STRIP.bottom + STRIP.height;

export class PatternInset {
  readonly object: Object3D = namedGroup(GROUP);
  private readonly lines: InstancedMesh;
  private readonly virus: VirusPart;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private ease: Ease | null = null;
  private shown = false;

  constructor(context: PartContext) {
    const { centre, width, height } = PATTERN_PANEL;
    addPanel(context, GROUP, this.object, PATTERN_PANEL);
    addLeader(
      context,
      GROUP,
      this.object,
      [centre[0] - width * HALF, centre[1], centre[2]],
      LEADER_END_WAFER,
    );
    const strip = finishMesh(
      context,
      new RoundedBoxGeometry(
        STRIP.width,
        STRIP.height,
        STRIP.depth,
        BEVEL_SEGMENTS,
        STRIP.height * HALF,
      ),
      GROUP,
      INSET_FINISHES.substrate,
    );
    strip.position.set(
      STRIP.left + STRIP.width * HALF,
      STRIP.bottom + STRIP.height * HALF,
      centre[2],
    );
    const bar = new RoundedBoxGeometry(
      REFERENCE_WIDTH,
      LINE_HEIGHT_M,
      LINE_DEPTH_M,
      BEVEL_SEGMENTS,
      REFERENCE_WIDTH * LINE_BEVEL,
    );
    const placeholders = Array.from({ length: PATTERN_LINES }, () => new Matrix4());
    this.lines = finishInstances(context, bar, GROUP, INSET_FINISHES.resist, placeholders);
    this.virus = new VirusPart(context);
    this.object.add(strip, this.lines, this.virus.object);
    label(context, 'patternInset', this.object, [centre[0], centre[1] + height * HALF, centre[2]]);
    label(context, 'virus', this.object, PART_POINTS.virus);
    sceneAnchor(context, 'patternInset', this.object, centre);
  }

  setState(state: AssemblyState): void {
    this.shown = state.view.inset && state.inset === 'pattern';
    this.object.visible = this.shown;
    this.ease ??= new Ease(state.scan.share);
    this.ease.aim(state.scan.share);
    this.layout(state.optics);
  }

  animate(frame: Frame, state: AssemblyState): boolean {
    const ease = this.ease;
    if (!ease) return false;
    ease.step(frame.delta);
    this.layout(state.optics);
    const spinning = this.shown && state.playing;
    if (spinning) this.virus.spin(frame.delta);
    return ease.running || spinning;
  }

  private layout(optics: AssemblyState['optics']): void {
    const width = lineWidthM(optics);
    const pitch = patchWidthM(optics) / PATTERN_LINES;
    const share = this.ease?.value ?? 0;
    const centre = PATTERN_PANEL.centre;
    for (let index = 0; index < PATTERN_LINES; index += 1) {
      const grown = clamp(share * PATTERN_LINES - index, 0, 1);
      const height = lerp(LATENT_SHARE, 1, grown);
      const x = LINE_LEFT_M + width * HALF + index * pitch;
      this.position.set(x, STRIP_TOP + (LINE_HEIGHT_M * height) / 2, centre[2]);
      this.scale.set(width / REFERENCE_WIDTH, height, 1);
      this.matrix.compose(this.position, IDENTITY, this.scale);
      this.lines.setMatrixAt(index, this.matrix);
    }
    this.lines.instanceMatrix.needsUpdate = true;
  }
}
