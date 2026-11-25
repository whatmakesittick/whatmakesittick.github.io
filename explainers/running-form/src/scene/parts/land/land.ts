import { Group, HemisphereLight } from 'three';
import type { Steps } from '@core/scene/pacing';
import type { PartContext } from '../context';
import { createBackdrop } from './atmosphere';
import { buildBeach } from './beach';
import { buildGround } from './ground';
import { buildHeadlands } from './headlands';
import { buildMasonry } from './masonry';
import { buildPlants } from './plants';
import { buildPosts } from './posts';
import { buildRidge } from './ridge';
import { buildSea } from './sea';
import { buildSky } from './sky';

export const LAND_NAME = 'land';

const HEMISPHERE = { sky: '#a7bde0', ground: '#8c7a62', intensity: 0.85 } as const;

export interface Scrolling {
  scroll(scrollM: number): void;
}

export interface Land {
  readonly root: Group;
  setScroll(scrollM: number): void;
}

class CoastalLand implements Land {
  readonly root: Group;
  private readonly scrollUniform: { value: number };
  private readonly movers: readonly Scrolling[];

  constructor(root: Group, scrollUniform: { value: number }, movers: readonly Scrolling[]) {
    this.root = root;
    this.scrollUniform = scrollUniform;
    this.movers = movers;
  }

  setScroll(scrollM: number): void {
    this.scrollUniform.value = scrollM;
    this.movers.forEach((mover) => mover.scroll(scrollM));
  }
}

export function* buildLand(context: PartContext): Steps<Land> {
  const root = new Group();
  root.name = LAND_NAME;
  const backdrop = createBackdrop(context);
  root.add(new HemisphereLight(HEMISPHERE.sky, HEMISPHERE.ground, HEMISPHERE.intensity));
  root.add(buildSky(backdrop), buildSea(backdrop));
  yield;
  root.add(buildGround(backdrop), buildBeach(backdrop), ...buildMasonry(backdrop));
  yield;
  const headlands = buildHeadlands(backdrop);
  root.add(headlands.mesh, buildRidge(backdrop));
  const posts = buildPosts(context);
  root.add(...posts.meshes);
  yield;
  const plants = buildPlants(context);
  root.add(...plants.meshes);
  return new CoastalLand(root, backdrop.scroll, [
    headlands.mover,
    ...posts.movers,
    ...plants.movers,
  ]);
}
