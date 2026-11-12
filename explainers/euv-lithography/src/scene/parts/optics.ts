import type { Steps } from '@core/scene/pacing';
import { namedGroup } from './context';
import type { Frame, PartContext, Section } from './context';
import type { AssemblyState } from '../../ids';
import { buildIlluminator } from './optics/illuminator';
import { buildProjection } from './optics/projection';

export function* buildOptics(context: PartContext): Steps<Section> {
  const root = namedGroup('optics');
  const illuminator = yield* buildIlluminator(context);
  const projection = yield* buildProjection(context);
  const modules = [illuminator, projection];
  modules.forEach((module) => root.add(module.root));
  return {
    root,
    setState: (state: AssemblyState) => modules.forEach((module) => module.setState(state)),
    animate: (frame: Frame, state: AssemblyState) =>
      modules.map((module) => module.animate?.(frame, state) ?? false).some(Boolean),
  };
}
