import { Group, Mesh } from 'three';
import type { BufferGeometry, Material } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { BOW_CAMERA, DOME, FAIRING, JET, PANEL, STUB, VENT_BOX } from '../../../model/layout';
import { COMPANION } from '../../constants';
import { FINISHES } from '../../finishes';
import { deckYAt } from '../../geometry/hullLines';
import { turned } from '../../geometry/sheet';
import { boxAt, lathe, rod } from '../../geometry/solids';
import { mergeParts } from '../context';
import type { PartContext } from '../context';
import { PANEL_XS, buildFairing } from './fairing';
import { buildHullShell } from './hullShell';
import { wetSurface } from '../water/wetSurface';

export interface CompanionGeometry {
  side: BufferGeometry;
  deck: BufferGeometry;
  light: BufferGeometry;
  dark: BufferGeometry;
  outline: BufferGeometry;
}

function domeShape(): BufferGeometry {
  const { segments } = COMPANION;
  const shoulder = DOME.radius * COMPANION.shoulder;
  return lathe(
    [
      [0, 0],
      [DOME.radius, 0],
      [DOME.radius, DOME.height],
      [shoulder, DOME.height + shoulder],
      [0, DOME.height + DOME.radius],
    ],
    segments,
  ).translate(DOME.x, DOME.base, 0);
}

function jetShape(): BufferGeometry {
  const aft = JET.steeringNozzle.x[0];
  const fore = JET.housing.x[1];
  const housing = turned(
    [
      [aft, COMPANION.exit],
      [JET.nozzle.x[0], JET.nozzle.exitDiameter / 2],
      [JET.nozzle.x[1], JET.housing.outerDiameter / 2],
      [fore, JET.housing.outerDiameter / 2],
      [fore, 0],
    ],
    COMPANION.segments,
  );
  housing.translate(0, JET.axisY, 0);
  return housing;
}

export function buildCompanionGeometry(): CompanionGeometry {
  const pieces = buildHullShell().filter((piece) => piece.side !== 'opened');
  const pick = (look: 'side' | 'deck') =>
    mergeParts(pieces.filter((piece) => piece.look === look).map((piece) => piece.geometry));
  const fairing = buildFairing();
  [fairing.inner, fairing.cut, fairing.pockets, fairing.pocketsPort].forEach((part) =>
    part.dispose(),
  );
  const side = pick('side');
  const deck = mergeParts([pick('deck'), fairing.outer, fairing.outerPort]);
  const slab = (x: number) =>
    boxAt(
      [PANEL.length, PANEL.thickness + PANEL.raise, PANEL.width],
      [x, PANEL.top - PANEL.thickness / 2, 0],
    );
  const vent = boxAt(
    [VENT_BOX.x[1] - VENT_BOX.x[0], VENT_BOX.top - FAIRING.top, VENT_BOX.halfWidth * 2],
    [(VENT_BOX.x[0] + VENT_BOX.x[1]) / 2, (VENT_BOX.top + FAIRING.top) / 2, 0],
  );
  const cameraX = (BOW_CAMERA.x[0] + BOW_CAMERA.x[1]) / 2;
  const camera = boxAt(
    [BOW_CAMERA.x[1] - BOW_CAMERA.x[0], BOW_CAMERA.height, BOW_CAMERA.width],
    [cameraX, deckYAt(cameraX, 0) + BOW_CAMERA.height / 2, 0],
  );
  const stub = rod(
    'y',
    STUB.radius,
    STUB.height,
    [STUB.x, deckYAt(STUB.x, 0) + STUB.height / 2, 0],
    COMPANION.stubSides,
  );
  return {
    side,
    deck,
    light: mergeParts([...PANEL_XS.map(slab), vent, domeShape()]),
    dark: mergeParts([jetShape(), camera, stub]),
    outline: mergeParts([side.clone(), deck.clone()]),
  };
}

export class CompanionPart {
  readonly object = new Group();
  readonly body = new Group();

  constructor(context: PartContext, shapes: CompanionGeometry) {
    const material = (finish: MaterialFinish): Material =>
      context.materials.get('companions', finish);
    this.object.add(this.body);
    this.body.add(
      new Mesh(shapes.side, wetSurface(material(context.looks.companionSide))),
      new Mesh(shapes.deck, material(context.looks.companionDeck)),
      new Mesh(shapes.light, material(FINISHES.cap)),
      new Mesh(shapes.dark, material(FINISHES.jetBlack)),
    );
  }
}
