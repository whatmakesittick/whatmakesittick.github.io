import { SphereGeometry } from 'three';
import type { AssemblyState } from '../../../ids';
import { FINISHES } from '../../finishes';
import { label, namedGroup, partMesh, sceneAnchor } from '../context';
import type { PartContext, Section } from '../context';

const BEAD_RADIUS_M = 0.12;
const BEAD_SEGMENTS = 20;
const ORIGIN = [0, 0, 0] as const;

export function buildFlows(context: PartContext): Section {
  const root = namedGroup('flows');
  const joule = namedGroup('joule', root);
  const geometry = new SphereGeometry(BEAD_RADIUS_M, BEAD_SEGMENTS, BEAD_SEGMENTS / 2);
  const bead = partMesh(context, geometry, 'joule');
  const heat = context.materials.get('joule', FINISHES.heat);
  const current = bead.material;
  joule.add(bead);
  label(context, 'joule', joule, ORIGIN);
  sceneAnchor(context, 'joule', joule, ORIGIN);
  return {
    root,
    setState({ joule: reading }: AssemblyState) {
      joule.position.set(...reading.position);
      bead.material = reading.form === 'heat' ? heat : current;
    },
  };
}
