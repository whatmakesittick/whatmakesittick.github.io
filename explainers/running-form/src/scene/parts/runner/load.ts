import type { AssemblyResources } from '../../assembly';
import { loadFigure } from '../../loadFigure';

export type RunnerResources = Required<Pick<AssemblyResources, 'solvePose' | 'buildRunner'>>;

export async function loadRunner(): Promise<RunnerResources> {
  const [{ rig }, { runnerResources }] = await Promise.all([loadFigure(), import('./resources')]);
  return runnerResources(rig);
}
