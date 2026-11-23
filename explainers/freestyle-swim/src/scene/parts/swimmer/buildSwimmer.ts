import { Group } from 'three';
import type { Steps } from '@core/scene/pacing';
import { RestFrame } from '@core/figure/body/restFrame';
import { GARMENT_COLORS } from '../../finishes';
import type { PartContext } from '../context';
import { PartBuilder } from './build';
import { FigureBody } from './figureBody';
import { toeFields } from './feet/toeFields';
import { applyToes } from './feet/toeShader';
import type { FigureRig } from './figure/figureRig';
import { applyGarments } from './garments/garmentShader';
import { Goggles } from './garments/goggles';
import { labelFields, labelLayout } from './garments/label';
import { labelTexture } from './garments/labelTexture';
import { garmentFields } from './garments/regions';
import { LABEL_IDS, Swimmer } from './swimmer';

const ORIGIN = [0, 0, 0] as const;
const FOOT_PART = 'foot';

export type BuildSwimmer = typeof buildSwimmer;

export function* buildSwimmer(context: PartContext, rig: FigureRig): Steps<Swimmer> {
  const builder = new PartBuilder(context);
  const root = new Group();
  root.name = 'swimmer';
  yield;
  const frame = new RestFrame(rig.figure);
  const toes = toeFields(rig.figure, frame);
  const garments = garmentFields(rig.figure, frame);
  yield;
  const labelPlace = labelFields(rig.figure, frame, labelLayout(rig.figure, garments, frame));
  const label = labelTexture();
  if (label) builder.track(label);
  yield;
  const body = new FigureBody({
    figure: rig.figure,
    toRig: rig.toRig,
    garments,
    label: labelPlace,
    toes: toes.coordinates,
    track: (item) => builder.track(item),
    materialOf: (part) => {
      const skin = applyGarments(
        builder.material(part, 'skin'),
        builder.swatches(part, GARMENT_COLORS),
        label,
      );
      return part === FOOT_PART ? applyToes(skin, toes) : skin;
    },
  });
  const goggles = new Goggles(builder, rig.figure, frame, rig.toRig);
  root.add(body.mesh, goggles.group);
  LABEL_IDS.forEach((id) => builder.label(id, root, ORIGIN));
  yield;
  return new Swimmer({ root, labels: builder.labels, body, goggles, rig, toRig: rig.toRig });
}
