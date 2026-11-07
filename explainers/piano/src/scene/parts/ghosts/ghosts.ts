import { PLAYED_KEY, keyX } from '../../../model';
import { namedGroup } from '../context';
import type { PartContext, Section } from '../context';
import { buildUpright } from './upright';

export function createGhosts(context: PartContext): Section {
  const root = namedGroup('ghosts');
  const upright = buildUpright(context);
  root.add(upright.root);

  return {
    root,
    setState(state) {
      root.position.x = keyX(PLAYED_KEY[state.register]);
      upright.root.visible = state.view.ghost || state.view.lineUp;
      upright.pose(state.upright);
    },
    warmUp(compile) {
      compile(upright.root);
    },
  };
}
