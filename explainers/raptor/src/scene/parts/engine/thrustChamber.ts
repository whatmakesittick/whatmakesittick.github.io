import { Group } from 'three';
import type { BufferGeometry, MeshStandardMaterial } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { wallRadius } from '../../../model';
import {
  BELL_TOP_Y,
  CHAMBER_HOUSING,
  CHANNEL_RECESS,
  COLLAR_BOLTS,
  COLLAR_BOTTOM_Y,
  COLLAR_OUTER,
  COOLANT_RING,
  EXIT_LIP,
  GLOW,
  HEAT_RANGE,
  NECK_HOUSING,
  SECTION_BOUNDS,
  SEGMENTS,
  WALL_LAYERS,
  WALL_OUTSET,
  WALL_SAMPLES,
} from '../../constants';
import { BELL_INNER_TINT, BELL_OUTER_TINT } from '../../finishes';
import { gradientTint } from '../../geometry/heatTint';
import { circleStrand, lineStrand, smoothStrand, wallStrand } from '../../geometry/profile';
import { BACK_HALF_ARC, WHOLE_ARC, revolveShell, revolveStrands } from '../../geometry/revolve';
import type { ProfilePoint, RevolveOptions, Strand } from '../../geometry/revolve';
import { closedShell } from '../../geometry/shells';
import { wallStrip } from '../../geometry/wallStrip';
import { partMesh, shellMeshes } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { addBoltRing } from './mount';

type Section = keyof typeof SECTION_BOUNDS;

const SECTIONS: readonly Section[] = ['chamber', 'throat', 'nozzle'];
const HOUSING_SAMPLES = 80;
const LIP_STEPS = 6;

function sectionSamples(section: Section): number {
  const [bottom, top] = SECTION_BOUNDS[section];
  return Math.max(8, Math.round((WALL_SAMPLES * (top - bottom)) / 215));
}

function housingShell(outer: readonly ProfilePoint[], bottom: number, top: number) {
  const smoothed = smoothStrand(outer, HOUSING_SAMPLES);
  const inner = wallStrand(WALL_OUTSET, bottom, top, 16);
  return closedShell(smoothed, inner);
}

export class ThrustChamberPart {
  readonly object = new Group();
  private readonly glows: { material: MeshStandardMaterial; scale: number }[] = [];

  constructor(context: PartContext) {
    this.buildLiners(context);
    this.buildBell(context);
    this.buildHousings(context);
    this.buildWallCut(context);
    this.buildCoolantRing(context);
  }

  setGlow(chamberGlow: number): void {
    for (const { material, scale } of this.glows) material.emissiveIntensity = chamberGlow * scale;
  }

  private surface(
    context: PartContext,
    strands: readonly Strand[],
    group: EmphasisGroup,
    finish: MaterialFinish,
    options: Omit<RevolveOptions, 'arc'>,
  ): void {
    const { cutaway } = context;
    const whole: BufferGeometry = revolveStrands(strands, { ...options, arc: WHOLE_ARC });
    const half: BufferGeometry = revolveStrands(strands, { ...options, arc: BACK_HALF_ARC });
    this.object.add(
      cutaway.whole(partMesh(context, whole, group, finish)),
      cutaway.opened(partMesh(context, half, group, finish)),
    );
  }

  private buildLiners(context: PartContext): void {
    const { finishes, materials } = context;
    const liners: readonly { section: Section; finish: MaterialFinish; scale: number }[] = [
      { section: 'chamber', finish: finishes.liner, scale: GLOW.chamber },
      { section: 'throat', finish: finishes.liner, scale: GLOW.throat },
      { section: 'nozzle', finish: finishes.bellInner, scale: GLOW.nozzle },
    ];
    for (const { section, finish, scale } of liners) {
      const [bottom, top] = SECTION_BOUNDS[section];
      const strand = wallStrand(0, bottom, top, sectionSamples(section));
      this.surface(context, [strand], section, finish, {
        segments: SEGMENTS.body,
        vRange: HEAT_RANGE,
        tint: section === 'nozzle' ? gradientTint(BELL_INNER_TINT) : undefined,
      });
      this.glows.push({ material: materials.get(section, finish), scale });
    }
  }

  private buildBell(context: PartContext): void {
    const { finishes } = context;
    const [exitY] = SECTION_BOUNDS.nozzle;
    const outer = wallStrand(
      WALL_OUTSET,
      BELL_TOP_Y,
      exitY + EXIT_LIP.height,
      sectionSamples('nozzle'),
    );
    const outerExit = wallRadius(exitY) + WALL_OUTSET;
    const lip: ProfilePoint[] = [
      ...lineStrand(outer[outer.length - 1], [outerExit, exitY + EXIT_LIP.rounding], 2).slice(1),
      ...lineStrand(
        [outerExit, exitY + EXIT_LIP.rounding],
        [outerExit - EXIT_LIP.rounding, exitY],
        1,
      ).slice(1),
      ...lineStrand(
        [outerExit - EXIT_LIP.rounding, exitY],
        [wallRadius(exitY), exitY],
        LIP_STEPS,
      ).slice(1),
    ];
    this.surface(context, [[...outer, ...lip]], 'nozzle', finishes.bellOuter, {
      segments: SEGMENTS.body,
      tint: gradientTint(BELL_OUTER_TINT),
    });
  }

  private buildHousings(context: PartContext): void {
    const { finishes } = context;
    const chamberBottom = CHAMBER_HOUSING[CHAMBER_HOUSING.length - 1][1];
    const neckBottom = NECK_HOUSING[NECK_HOUSING.length - 1][1];
    const housings: readonly {
      group: EmphasisGroup;
      outline: readonly ProfilePoint[];
      bottom: number;
      top: number;
    }[] = [
      {
        group: 'chamber',
        outline: CHAMBER_HOUSING,
        bottom: chamberBottom,
        top: CHAMBER_HOUSING[0][1],
      },
      { group: 'throat', outline: NECK_HOUSING, bottom: neckBottom, top: NECK_HOUSING[0][1] },
    ];
    for (const { group, outline, bottom, top } of housings) {
      const shell = revolveShell(housingShell(outline, bottom, top), { segments: SEGMENTS.body });
      shellMeshes(context, this.object, shell, group, { outer: finishes.coat });
    }
    const collarOuter = [
      ...smoothStrand(COLLAR_OUTER, 40),
      [wallRadius(COLLAR_BOTTOM_Y) + WALL_OUTSET, COLLAR_BOTTOM_Y] as const,
    ];
    const collar = revolveShell(
      closedShell(collarOuter, wallStrand(WALL_OUTSET, COLLAR_BOTTOM_Y, COLLAR_OUTER[0][1], 8)),
      { segments: SEGMENTS.body },
    );
    shellMeshes(context, this.object, collar, 'nozzle', { outer: finishes.coat });
    addBoltRing(context, this.object, COLLAR_BOLTS, 'nozzle');
  }

  private buildWallCut(context: PartContext): void {
    const { finishes, cutaway } = context;
    const { liner, channel } = WALL_LAYERS;
    for (const section of SECTIONS) {
      const [bottom, top] = SECTION_BOUNDS[section];
      const samples = sectionSamples(section);
      const strip = (inner: number, outer: number, z: number) =>
        wallStrip({ inner, outer, from: top, to: bottom, samples, z });
      const linerFinish = section === 'nozzle' ? finishes.steel : finishes.liner;
      this.object.add(
        cutaway.opened(partMesh(context, strip(0, liner, 0), section, linerFinish)),
        cutaway.opened(
          partMesh(
            context,
            strip(liner, liner + channel, -CHANNEL_RECESS),
            'coolingChannels',
            finishes.channel,
          ),
        ),
        cutaway.opened(
          partMesh(context, strip(liner + channel, WALL_OUTSET, 0), section, finishes.cut),
        ),
      );
    }
  }

  private buildCoolantRing(context: PartContext): void {
    const { finishes } = context;
    const ring = revolveShell(
      {
        outline: [
          {
            strand: circleStrand(
              [COOLANT_RING.radius, COOLANT_RING.y],
              COOLANT_RING.tube,
              COOLANT_RING.steps,
            ),
          },
        ],
      },
      { segments: SEGMENTS.body },
    );
    shellMeshes(context, this.object, ring, 'nozzle', { outer: finishes.coat });
  }
}
