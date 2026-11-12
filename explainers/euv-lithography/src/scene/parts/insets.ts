import type { Steps } from '@core/scene/pacing';
import { namedGroup } from './context';
import type { PartContext, Section } from './context';
import { DropletInset } from './insets/dropletInset';
import { PatternInset } from './insets/patternInset';

export function* buildInsets(context: PartContext): Steps<Section> {
  const root = namedGroup('insets');
  const droplet = new DropletInset(context);
  yield;
  const pattern = new PatternInset(context);
  root.add(droplet.object, pattern.object);
  yield;
  return {
    root,
    setState(state) {
      droplet.setState(state);
      pattern.setState(state);
    },
    animate: (frame, state) => pattern.animate(frame, state),
    warmUp(compile) {
      compile(droplet.object);
      compile(pattern.object);
    },
  };
}
