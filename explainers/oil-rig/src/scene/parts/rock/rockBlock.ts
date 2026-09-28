import { Group, MeshStandardMaterial } from 'three';
import type { BufferGeometry, Mesh, Object3D, Texture } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { depthToY } from '../../../model/scale';
import { OIL_WATER_CONTACT_M, RESERVOIR_FLUIDS } from '../../../model/wellPlan';
import { ANCHOR_LIFT, BLOCK, ROCK } from '../../constants';
import { BAND_SURFACE, BAND_TONES } from '../../finishes';
import { MeshBuilder } from '../../geometry/meshBuilder';
import { SpanEditor } from '../../geometry/spans';
import { bands, contactReach } from '../../geometry/strata';
import type { Band, BandId } from '../../geometry/strata';
import { slotHalfWidth } from '../../geometry/wellColumn';
import { rockTexture } from '../canvasTextures';
import type { RockPattern } from '../canvasTextures';
import { partMesh, registeredMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { bandGeometry } from './bandGeometry';

export type RockAnchorId =
  'seabed' | 'claystone' | 'aquifer' | 'seal' | 'gasCap' | 'oil' | 'oilWaterContact' | 'sourceRock';

interface BandStyle {
  group: EmphasisGroup;
  pattern: RockPattern;
  labelX?: number;
  part?: RockAnchorId;
}

const BAND_STYLES: Record<BandId, BandStyle> = {
  seabed: { group: 'seabed', pattern: 'clay', labelX: 58, part: 'seabed' },
  claystone: { group: 'claystone', pattern: 'shale', labelX: -52, part: 'claystone' },
  aquifer: { group: 'aquifer', pattern: 'sand', labelX: 95, part: 'aquifer' },
  shaleSands: { group: STRUCTURE_GROUP, pattern: 'interbedded' },
  seal: { group: 'seal', pattern: 'shale', labelX: -62, part: 'seal' },
  gas: { group: 'gasCap', pattern: 'sand', labelX: 16, part: 'gasCap' },
  oil: { group: 'oil', pattern: 'sand', labelX: -34, part: 'oil' },
  water: { group: STRUCTURE_GROUP, pattern: 'sand' },
  base: { group: STRUCTURE_GROUP, pattern: 'clay' },
  sourceRock: { group: 'sourceRock', pattern: 'shale', labelX: 120, part: 'sourceRock' },
};

const PATTERNS: readonly RockPattern[] = ['clay', 'sand', 'shale', 'interbedded'];
const CONTACT_LABEL_X = 62;
const RESERVOIR_LABEL_X = 24;
const SLOT_CLEARANCE = 0.8;

interface BandMesh {
  mesh: Mesh;
  cutIndexCount: number;
  editor: SpanEditor;
}

function middle(band: Band, x: number): number {
  return depthToY((band.top(x) + band.bottom(x)) / 2);
}

function dashes(builder: MeshBuilder, depth: number, reach: number): void {
  const y = depthToY(depth);
  const z = ROCK.contactLift;
  const clear = slotHalfWidth() + SLOT_CLEARANCE;
  for (let x = -reach; x < reach; x += ROCK.contactDash + ROCK.contactGap) {
    const right = Math.min(x + ROCK.contactDash, reach);
    if (right > -clear && x < clear) continue;
    const corners = [
      builder.vertex([x, y - ROCK.contactHalf, z], [0, 0, 1]),
      builder.vertex([right, y - ROCK.contactHalf, z], [0, 0, 1]),
      builder.vertex([right, y + ROCK.contactHalf, z], [0, 0, 1]),
      builder.vertex([x, y + ROCK.contactHalf, z], [0, 0, 1]),
    ];
    builder.quad(corners[0], corners[1], corners[2], corners[3]);
  }
}

function contactGeometry(depth: number): BufferGeometry {
  const builder = new MeshBuilder();
  dashes(builder, depth, contactReach(depth, BLOCK.halfWidth, ROCK.columnStep));
  return builder.build();
}

export class RockPart {
  readonly object = new Group();
  readonly anchors: Record<RockAnchorId, Object3D>;
  readonly reservoirAnchor: Object3D;
  private readonly meshes: BandMesh[];

  constructor(context: PartContext) {
    const textures = this.textures(context);
    const list = bands();
    const last = list.length - 1;
    this.meshes = list.map((band, index) =>
      this.bandMesh(context, band, index === 0, index === last, textures),
    );
    this.meshes.forEach(({ mesh }) => this.object.add(mesh));
    this.object.add(...this.contacts(context));
    this.anchors = this.layerAnchors(list);
    const oil = list.find((band) => band.id === 'oil') ?? list[0];
    this.reservoirAnchor = anchorAt(
      this.object,
      RESERVOIR_LABEL_X,
      middle(oil, RESERVOIR_LABEL_X),
      ANCHOR_LIFT,
    );
  }

  setCutaway(cutaway: boolean): void {
    this.meshes.forEach(({ mesh, cutIndexCount }) => {
      mesh.geometry.setDrawRange(0, cutaway ? cutIndexCount : Infinity);
    });
  }

  setHoleBottom(y: number): void {
    this.meshes.forEach(({ editor }) => editor.moveTo(y));
  }

  private textures(context: PartContext): Record<RockPattern, Texture> {
    const entries = PATTERNS.map((pattern, index) => [
      pattern,
      context.tracker.track(rockTexture(pattern, ROCK.textureSize, ROCK.tile, index + 1)),
    ]);
    return Object.fromEntries(entries) as Record<RockPattern, Texture>;
  }

  private bandMesh(
    context: PartContext,
    band: Band,
    surfaced: boolean,
    floored: boolean,
    textures: Record<RockPattern, Texture>,
  ): BandMesh {
    const style = BAND_STYLES[band.id];
    const built = bandGeometry(band, surfaced, floored);
    const material = new MeshStandardMaterial({
      ...BAND_SURFACE,
      color: BAND_TONES[band.id],
      map: textures[style.pattern],
    });
    const mesh = registeredMesh(context, built.geometry, style.group, material);
    return {
      mesh,
      cutIndexCount: built.cutIndexCount,
      editor: new SpanEditor(built.geometry, built.spans, true),
    };
  }

  private contacts(context: PartContext): Mesh[] {
    const gasOil = RESERVOIR_FLUIDS[0].bottom;
    return [
      partMesh(context, contactGeometry(gasOil), STRUCTURE_GROUP, 'gasContact'),
      partMesh(context, contactGeometry(OIL_WATER_CONTACT_M), 'oilWaterContact', 'contact'),
    ];
  }

  private layerAnchors(list: Band[]): Record<RockAnchorId, Object3D> {
    const anchors: Partial<Record<RockAnchorId, Object3D>> = {};
    list.forEach((band) => {
      const { labelX, part } = BAND_STYLES[band.id];
      if (labelX === undefined || !part) return;
      anchors[part] = anchorAt(this.object, labelX, middle(band, labelX), ANCHOR_LIFT);
    });
    anchors.oilWaterContact = anchorAt(
      this.object,
      CONTACT_LABEL_X,
      depthToY(OIL_WATER_CONTACT_M),
      ANCHOR_LIFT,
    );
    return anchors as Record<RockAnchorId, Object3D>;
  }
}
