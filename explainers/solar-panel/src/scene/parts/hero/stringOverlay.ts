import { Group, MeshBasicMaterial, Shape, ShapeGeometry } from 'three';
import type { Mesh } from 'three';
import type { ModuleLayout } from '../../../model';
import { diodeCount } from '../../../model';
import { DIODE_GLYPH, FACE_LAYERS, STRING_LINE, STRING_TINTS } from '../../constants';
import { FINISHES, PAINT } from '../../finishes';
import { around, block } from '../../geometry/blocks';
import { mergeParts } from '../../geometry/merge';
import { stripGeometry } from '../../geometry/strip';
import { diodeWire, diodeX, diodeY, stringPaths } from '../../geometry/strings';
import { finishMesh, registered, registeredMesh } from '../context';
import type { PartContext } from '../context';

const LINE_OFFSET = -1;

function lineMaterial(color: string): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color,
    polygonOffset: true,
    polygonOffsetFactor: LINE_OFFSET,
    polygonOffsetUnits: LINE_OFFSET,
  });
}

function diodeSymbol(x: number, y: number): ShapeGeometry {
  const { triangle } = DIODE_GLYPH;
  const shape = new Shape();
  shape.moveTo(x - triangle, y - triangle);
  shape.lineTo(x + triangle * DIODE_GLYPH.tip, y);
  shape.lineTo(x - triangle, y + triangle);
  shape.closePath();
  const geometry = new ShapeGeometry(shape);
  geometry.translate(0, 0, FACE_LAYERS.symbol[1]);
  return geometry;
}

interface DiodeGlyph {
  wire: Mesh;
  symbol: Mesh;
}

export class StringOverlayPart {
  readonly object = new Group();
  private readonly context: PartContext;
  private readonly strings: Mesh[] = [];
  private readonly alive: MeshBasicMaterial[] = [];
  private readonly dead: MeshBasicMaterial;
  private readonly glyphs: DiodeGlyph[] = [];

  constructor(context: PartContext, layout: ModuleLayout) {
    this.context = context;
    this.dead = registered(context, 'ribbon', lineMaterial(PAINT.deadString));
    const tints = STRING_TINTS[layout.id];
    stringPaths(layout).forEach((path) => {
      const material = lineMaterial(tints[path.string % tints.length]);
      const mesh = registeredMesh(
        context,
        stripGeometry(path.points, STRING_LINE.width, FACE_LAYERS.string),
        'ribbon',
        material,
      );
      this.alive.push(material);
      this.strings.push(mesh);
      this.object.add(mesh);
    });
    for (let group = 0; group < diodeCount(layout); group += 1) this.addGlyph(layout, group);
  }

  setDeadStrings(dead: readonly boolean[]): void {
    this.strings.forEach((mesh, index) => {
      mesh.material = dead[index] ? this.dead : this.alive[index];
    });
  }

  setActiveDiodes(active: readonly boolean[]): void {
    const on = this.context.materials.get('bypassDiode', FINISHES.diodeOn);
    const off = this.context.materials.get('bypassDiode', FINISHES.diodeOff);
    this.glyphs.forEach((glyph, index) => {
      const material = active[index] ? on : off;
      glyph.wire.material = material;
      glyph.symbol.material = material;
    });
  }

  private addGlyph(layout: ModuleLayout, group: number): void {
    const x = diodeX(group);
    const y = diodeY(layout);
    const off = FINISHES.diodeOff;
    const plate = block(
      around(x, DIODE_GLYPH.width),
      around(y, DIODE_GLYPH.height),
      FACE_LAYERS.plate,
    );
    const bar = block(
      around(x + DIODE_GLYPH.triangle * DIODE_GLYPH.barAt, DIODE_GLYPH.bar),
      around(y, DIODE_GLYPH.triangle * 2),
      [FACE_LAYERS.plate[1], FACE_LAYERS.symbol[1]],
    );
    const wire = finishMesh(
      this.context,
      stripGeometry(diodeWire(layout, group), STRING_LINE.wire, FACE_LAYERS.wire),
      'bypassDiode',
      off,
    );
    const symbol = finishMesh(
      this.context,
      mergeParts([diodeSymbol(x, y), bar]),
      'bypassDiode',
      off,
    );
    this.object.add(
      finishMesh(this.context, plate, 'bypassDiode', FINISHES.diodePlate),
      wire,
      symbol,
    );
    this.glyphs.push({ wire, symbol });
  }
}
