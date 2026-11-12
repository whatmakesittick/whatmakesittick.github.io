import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import type { PartContext } from '../context';
import { CEILING_Y } from './dims';

type Painter = (paint: CanvasRenderingContext2D, width: number, height: number) => void;

const ANISOTROPY = 8;
const FULL_TURN = Math.PI * 2;

const TILE = {
  size: 256,
  seam: 3,
  bevel: 2,
  holes: 11,
  margin: 16,
  radius: 2.4,
  seamColor: '#5d6167',
  bevelColor: '#f6f6f6',
  holeColor: '#3f4247',
  solidColor: '#ececec',
} as const;

const CELL = {
  size: 128,
  bar: 6,
  dot: 4,
  barColor: '#5f5b55',
  edgeColor: '#d2cfca',
  dotColor: '#efefef',
} as const;

const WALL = {
  width: 256,
  height: 1024,
  seam: 2,
  seamColor: '#cfcac3',
  kickM: 0.2,
  kickColor: '#9b958d',
  grille: { fromM: 0.3, toM: 0.8, slat: 5, inset: 18, color: '#b3ada5' },
  seamsM: [3, 6],
  shade: [
    { at: 0, color: 'rgba(0,0,0,0)' },
    { at: 0.3, color: 'rgba(0,0,0,0.35)' },
    { at: 1, color: 'rgba(0,0,0,0.72)' },
  ],
} as const;

function canvasTexture(
  context: PartContext,
  width: number,
  height: number,
  painter: Painter,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const paint = canvas.getContext('2d');
  if (paint) painter(paint, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  return context.tracker.track(texture);
}

function paintTile(paint: CanvasRenderingContext2D, x: number, y: number, holes: boolean): void {
  const size = TILE.size / 2;
  paint.fillStyle = holes ? '#ffffff' : TILE.solidColor;
  paint.fillRect(x, y, size, size);
  if (holes) {
    const pitch = (size - TILE.margin * 2) / (TILE.holes - 1);
    paint.fillStyle = TILE.holeColor;
    for (let row = 0; row < TILE.holes; row += 1) {
      for (let column = 0; column < TILE.holes; column += 1) {
        paint.beginPath();
        paint.arc(
          x + TILE.margin + column * pitch,
          y + TILE.margin + row * pitch,
          TILE.radius,
          0,
          FULL_TURN,
        );
        paint.fill();
      }
    }
  }
  paint.lineWidth = TILE.bevel;
  paint.strokeStyle = TILE.bevelColor;
  paint.strokeRect(
    x + TILE.seam * 2,
    y + TILE.seam * 2,
    size - TILE.seam * 4,
    size - TILE.seam * 4,
  );
  paint.lineWidth = TILE.seam;
  paint.strokeStyle = TILE.seamColor;
  paint.strokeRect(x, y, size, size);
}

export function perforatedTileTexture(context: PartContext): CanvasTexture {
  return canvasTexture(context, TILE.size, TILE.size, (paint) => {
    const half = TILE.size / 2;
    paintTile(paint, 0, 0, true);
    paintTile(paint, half, 0, false);
    paintTile(paint, 0, half, false);
    paintTile(paint, half, half, true);
  });
}

export function ceilingTexture(context: PartContext): CanvasTexture {
  return canvasTexture(context, CELL.size, CELL.size, (paint, size) => {
    paint.fillStyle = '#ffffff';
    paint.fillRect(0, 0, size, size);
    paint.fillStyle = CELL.dotColor;
    for (let y = CELL.bar + CELL.dot; y < size - CELL.bar; y += CELL.dot) {
      for (let x = CELL.bar + CELL.dot; x < size - CELL.bar; x += CELL.dot) {
        paint.fillRect(x, y, 1, 1);
      }
    }
    paint.lineWidth = 2;
    paint.strokeStyle = CELL.edgeColor;
    paint.strokeRect(CELL.bar + 1, CELL.bar + 1, size - CELL.bar * 2 - 2, size - CELL.bar * 2 - 2);
    paint.lineWidth = CELL.bar;
    paint.strokeStyle = CELL.barColor;
    paint.strokeRect(0, 0, size, size);
  });
}

function wallY(heightM: number, height: number): number {
  return height - (heightM / CEILING_Y) * height;
}

export function wallTexture(context: PartContext): CanvasTexture {
  return canvasTexture(context, WALL.width, WALL.height, (paint, width, height) => {
    paint.fillStyle = '#ffffff';
    paint.fillRect(0, 0, width, height);
    const { grille } = WALL;
    const half = width / 2;
    paint.fillStyle = grille.color;
    for (let y = wallY(grille.toM, height); y < wallY(grille.fromM, height); y += grille.slat) {
      paint.fillRect(grille.inset, y, half - grille.inset * 2, grille.slat / 2);
    }
    paint.fillStyle = WALL.kickColor;
    paint.fillRect(0, wallY(WALL.kickM, height), width, height);
    paint.fillStyle = WALL.seamColor;
    [0, half].forEach((x) => paint.fillRect(x, 0, WALL.seam, height));
    WALL.seamsM.forEach((heightM) => paint.fillRect(0, wallY(heightM, height), width, WALL.seam));
    const shade = paint.createLinearGradient(0, 0, 0, height);
    WALL.shade.forEach(({ at, color }) => shade.addColorStop(at, color));
    paint.fillStyle = shade;
    paint.fillRect(0, 0, width, height);
  });
}
