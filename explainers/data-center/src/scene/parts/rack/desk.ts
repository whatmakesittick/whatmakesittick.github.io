import type { Group } from 'three';
import type { Extent } from '@core/scene/regions';
import { ANCHOR_POINTS, DESK, LAPTOP, boxSpan } from '../../../model';
import { label, namedGroup, sceneAnchor } from '../context';
import { RACK_FINISHES } from './finishes';
import { around, middle } from './dims';
import { box } from './kit';
import type { Kit } from './kit';

const TOP_M = 0.03;
const LEG_M = 0.04;
const LEG_INSET_M = 0.05;
const RAIL = { tall: 0.06, depth: 0.02, below: 0.1 } as const;
const BASE_M = 0.015;
const KEYS = { inset: 0.02, depth: 0.09, rise: 0.0006 } as const;
const PAD = { width: 0.08, depth: 0.05, rise: 0.0004 } as const;
const LID = { tall: 0.2, thick: 0.006, lean: -0.26 } as const;
const SCREEN = { border: 0.01, rise: 0.0008 } as const;

const DESK_SPAN = boxSpan(DESK);
const LAPTOP_SPAN = boxSpan(LAPTOP);
const DESK_TOP = DESK_SPAN.y[1];

function desk(): { top: ReturnType<typeof box>; frame: ReturnType<typeof box>[] } {
  const [west, east] = DESK_SPAN.x;
  const [north, south] = DESK_SPAN.z;
  const under = DESK_TOP - TOP_M;
  const legs = [west + LEG_INSET_M, east - LEG_INSET_M].flatMap((x) =>
    [north + LEG_INSET_M, south - LEG_INSET_M].map((z) =>
      box(around(x, LEG_M), [0, under], around(z, LEG_M)),
    ),
  );
  const rail = box(
    [west + LEG_INSET_M, east - LEG_INSET_M],
    [under - RAIL.below - RAIL.tall, under - RAIL.below],
    around(north + LEG_INSET_M, RAIL.depth),
  );
  return { top: box(DESK_SPAN.x, [under, DESK_TOP], DESK_SPAN.z), frame: [...legs, rail] };
}

export function buildDesk(kit: Kit, root: Group): Group {
  const group = namedGroup('laptop', root);
  const { top, frame } = desk();
  kit.boxes(group, 'laptop', 'desk', [top]);
  kit.boxes(group, 'laptop', RACK_FINISHES.deskLeg, frame);
  const [west, east] = LAPTOP_SPAN.x;
  const [hinge] = LAPTOP_SPAN.z;
  const deck = DESK_TOP + BASE_M;
  const keys: Extent = [hinge + KEYS.inset, hinge + KEYS.inset + KEYS.depth];
  const pad: Extent = [keys[1] + KEYS.inset, keys[1] + KEYS.inset + PAD.depth];
  kit.boxes(group, 'laptop', 'laptop', [box(LAPTOP_SPAN.x, [DESK_TOP, deck], LAPTOP_SPAN.z)]);
  kit.boxes(group, 'laptop', RACK_FINISHES.keyboard, [
    box([west + KEYS.inset, east - KEYS.inset], [deck, deck + KEYS.rise], keys),
    box(around(middle(LAPTOP_SPAN.x), PAD.width), [deck, deck + PAD.rise], pad),
  ]);
  const lid = namedGroup('lid', group);
  lid.position.set(middle(LAPTOP_SPAN.x), deck, hinge);
  lid.rotation.x = LID.lean;
  const half = (east - west) / 2;
  kit.boxes(lid, 'laptop', 'laptop', [box([-half, half], [0, LID.tall], [0, LID.thick])]);
  kit.boxes(lid, 'laptop', RACK_FINISHES.screen, [
    box(
      [-half + SCREEN.border, half - SCREEN.border],
      [SCREEN.border, LID.tall - SCREEN.border],
      [LID.thick, LID.thick + SCREEN.rise],
    ),
  ]);
  label(kit.context, 'laptop', group, [middle(LAPTOP_SPAN.x), deck + LID.tall, hinge]);
  sceneAnchor(kit.context, 'lineUp', group, ANCHOR_POINTS.lineUp);
  return group;
}
