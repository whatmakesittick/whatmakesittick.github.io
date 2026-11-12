import type { Steps } from '@core/scene/pacing';
import { Reveal } from './closeUp';
import { namedGroup } from './context';
import type { Frame, PartContext, Section } from './context';
import type { AssemblyState } from '../../ids';
import { buildBase } from './optics/base';
import { buildIlluminator } from './optics/illuminator';
import { buildProjection } from './optics/projection';

export function* buildOptics(context: PartContext): Steps<Section> {
  const root = namedGroup('optics');
  const base = yield* buildBase(context);
  const illuminator = yield* buildIlluminator(context);
  const projection = yield* buildProjection(context);
  const modules = [base, illuminator, projection];
  modules.forEach((module) => root.add(module.root));
  const reveal = new Reveal().add(...modules.flatMap((module) => module.covers));
  return {
    root,
    setState: (state: AssemblyState) => modules.forEach((module) => module.setState(state)),
    animate: (frame: Frame, state: AssemblyState) =>
      [
        reveal.follow(frame.cameraDistance),
        ...modules.map((module) => module.animate?.(frame, state) ?? false),
      ].some(Boolean),
  };
}
