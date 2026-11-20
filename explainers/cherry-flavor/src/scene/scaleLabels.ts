import type { LabelPolicy } from '@core/scene/presetBinder';
import { PART_SCALE, VIEW_SCALE } from '../ids';
import type { CameraView, PartId, ScaleId } from '../ids';
import { SCALE_DEFAULT_LABELS } from '../state';

export interface ScaleSource {
  scale: ScaleId;
  camera: CameraView;
}

function isPart(id: string): id is PartId {
  return id in PART_SCALE;
}

export function labelsForScale(
  wanted: ReadonlySet<string>,
  { scale, camera }: ScaleSource,
): ReadonlySet<string> {
  if (wanted.size === 0) return wanted;
  if (VIEW_SCALE[camera] !== scale) return new Set(SCALE_DEFAULT_LABELS[scale]);
  return new Set([...wanted].filter((id) => isPart(id) && PART_SCALE[id] === scale));
}

export function highlightForScale(
  highlight: readonly string[],
  source: ScaleSource,
): readonly string[] {
  return VIEW_SCALE[source.camera] === source.scale ? highlight : [];
}

export class ScaleLabelPolicy implements LabelPolicy {
  private readonly inner: LabelPolicy;
  private readonly source: () => ScaleSource;
  private wanted: ReadonlySet<string> = new Set();
  private pinned: ReadonlySet<string> = new Set();

  constructor(inner: LabelPolicy, source: () => ScaleSource) {
    this.inner = inner;
    this.source = source;
  }

  setWanted(wanted: ReadonlySet<string>, pinned: ReadonlySet<string>): void {
    this.wanted = wanted;
    this.pinned = pinned;
    this.refresh();
  }

  refresh(): void {
    const source = this.source();
    this.inner.setWanted(labelsForScale(this.wanted, source), labelsForScale(this.pinned, source));
  }
}
