import type { Object3D } from 'three';
import type { AssemblyState } from '../../../ids';
import type { Frame } from '../context';

export interface OpticsModule {
  readonly root: Object3D;
  setState(state: AssemblyState): void;
  animate?(frame: Frame, state: AssemblyState): boolean;
}
