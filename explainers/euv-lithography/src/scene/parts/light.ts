import type { Steps } from '@core/scene/pacing';
import { ANCHOR_POINTS, PART_POINTS } from '../../model/layout';
import { label, namedGroup, sceneAnchor } from './context';
import type { PartContext, Section } from './context';
import { BeamPart } from './light/beam';
import { CloseUp } from './closeUp';
import { DropletsPart } from './light/droplets';
import { MarkerPart } from './light/marker';
import { PlasmaPart } from './light/plasma';

export function* buildLight(context: PartContext): Steps<Section> {
  const root = namedGroup('light');
  const beam = new BeamPart(context);
  yield;
  const droplets = new DropletsPart(context);
  const plasma = new PlasmaPart(context);
  const marker = new MarkerPart(context);
  root.add(beam.object, droplets.object, plasma.object, marker.trailObject, marker.object);
  const closeUp = new CloseUp();
  label(context, 'droplets', root, PART_POINTS.droplets);
  label(context, 'plasma', root, PART_POINTS.plasma);
  sceneAnchor(context, 'plasma', root, ANCHOR_POINTS.plasma);
  yield;
  return {
    root,
    setState(state) {
      beam.setState(state);
      droplets.setState(state);
      plasma.setState(state);
      marker.setState(state);
    },
    animate(frame, state) {
      const resized = closeUp.follow(frame.cameraDistance);
      if (resized) {
        beam.fit(closeUp.factor, state);
        marker.fit(closeUp.factor, state);
      }
      const moving = [resized, droplets.animate(frame, state), plasma.animate(frame, state)];
      return moving.some(Boolean);
    },
    warmUp(compile) {
      compile(beam.object);
    },
  };
}
