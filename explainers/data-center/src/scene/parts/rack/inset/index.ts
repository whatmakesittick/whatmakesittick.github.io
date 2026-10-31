import type { Group } from 'three';
import type { AssemblyState } from '../../../../ids';
import { ANCHOR_POINTS, INSET, INSET_CENTRE } from '../../../../model';
import { label, namedGroup, sceneAnchor } from '../../context';
import type { PartContext } from '../../context';
import { coldPlateDrawing } from './coldPlate';
import { heatSinkDrawing } from './heatSink';
import { chipMarkers } from './marker';
import { packageDrawing } from './package';
import { buildLeader, buildPanel } from './panel';

export interface ChipInset {
  readonly root: Group;
  setState(state: AssemblyState): void;
}

const FACING_MINUS_X = -Math.PI / 2;
const [CENTRE_X, CENTRE_Y, CENTRE_Z] = INSET_CENTRE;

export function buildChipInset(context: PartContext): ChipInset {
  const root = namedGroup('chipInset');
  const panel = namedGroup('chipInsetPanel', root);
  panel.position.set(...INSET_CENTRE);
  panel.rotation.y = FACING_MINUS_X;
  const coldPlate = coldPlateDrawing(context);
  const heatSink = heatSinkDrawing(context);
  const markers = chipMarkers(context);
  panel.add(...buildPanel(context), packageDrawing(context), coldPlate, heatSink, markers.group);
  root.add(...buildLeader(context));
  label(context, 'chipInset', root, [
    CENTRE_X,
    CENTRE_Y + INSET.height / 2,
    CENTRE_Z - INSET.width / 2,
  ]);
  sceneAnchor(context, 'inset', root, ANCHOR_POINTS.inset);
  return {
    root,
    setState(state) {
      root.visible = state.view.inset;
      coldPlate.visible = state.cooling === 'liquid';
      heatSink.visible = state.cooling === 'air';
      markers.setState(state);
    },
  };
}
