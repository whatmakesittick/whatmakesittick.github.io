import type { AssemblyState } from '../../../ids';
import { ANCHOR_POINTS } from '../../../model';
import { namedGroup, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';
import { buildBusbar, buildManifold } from './backplane';
import { buildCabinet } from './cabinet';
import { buildComputeTrays } from './compute';
import { buildDesk } from './desk';
import { buildTrayFans } from './fans';
import { buildChipInset } from './inset';
import { createKit } from './kit';
import { buildPowerShelves } from './shelves';
import { buildSwitchTrays } from './switches';

export function buildRack(context: PartContext): Section {
  const kit = createKit(context);
  const root = namedGroup('rack');
  const cabinet = buildCabinet(kit, root);
  buildPowerShelves(kit, root);
  const trays = buildComputeTrays(kit, root);
  buildSwitchTrays(kit, root);
  buildBusbar(kit, root);
  const manifold = buildManifold(kit, root);
  const fans = buildTrayFans(kit, root);
  const inset = buildChipInset(context);
  root.add(inset.root);
  const desk = buildDesk(kit, root);
  sceneAnchor(context, 'subjectRack', cabinet.group, ANCHOR_POINTS.subjectRack);
  sceneAnchor(context, 'chip', trays.group, ANCHOR_POINTS.chip);
  return {
    root,
    setState(state: AssemblyState) {
      const liquid = state.cooling === 'liquid';
      cabinet.westPanel.visible = !state.view.cutaway;
      cabinet.airDoor.visible = !liquid;
      trays.liquid.visible = liquid;
      trays.air.visible = !liquid;
      manifold.visible = liquid;
      desk.visible = state.view.lineUp;
      inset.setState(state);
    },
    animate: (frame, state) => fans.animate(frame, state),
  };
}
