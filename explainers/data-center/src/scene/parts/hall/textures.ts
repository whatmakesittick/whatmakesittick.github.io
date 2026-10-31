import { CanvasTexture, SRGBColorSpace } from 'three';
import type { Extent } from '@core/scene/regions';
import { RACK_STACK } from '../../../model';

type Paint = (context: CanvasRenderingContext2D, width: number, height: number) => void;

const WIDTH = 128;
const HEIGHT = 512;
const PANEL_HEIGHT_M = 2.2;
const SHELF_M = 0.08;
const SWITCH_TRAYS = 9;
const NETWORK_UNITS = 22;
const HOLE_PITCH = 5;
const HOLE_RADIUS = 1.4;

const INK = {
  base: '#14171a',
  shelf: '#4b5159',
  shelfEdge: '#6c747d',
  vent: '#22262b',
  tray: '#2b3036',
  grille: '#181b1f',
  handle: '#7a828b',
  port: '#0b0d0f',
  portRim: '#5b636b',
  door: '#30353c',
  hole: '#0e1013',
  frame: '#3d434a',
  cduBody: '#c3c8cd',
  cduSeam: '#8d949b',
  louvre: '#a2a9b0',
  screen: '#151a1f',
} as const;

function texture(paint: Paint, width = WIDTH, height = HEIGHT): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) paint(context, width, height);
  const result = new CanvasTexture(canvas);
  result.colorSpace = SRGBColorSpace;
  result.anisotropy = 4;
  return result;
}

function band(height: number, panelM: number, [from, to]: Extent): [number, number] {
  const top = height - (to / panelM) * height;
  return [top, ((to - from) / panelM) * height];
}

function shelves(c: CanvasRenderingContext2D, width: number, height: number, span: Extent) {
  for (let y = span[0]; y < span[1] - 1e-6; y += SHELF_M) {
    const [top, size] = band(height, PANEL_HEIGHT_M, [y, y + SHELF_M]);
    c.fillStyle = INK.shelf;
    c.fillRect(2, top + 1, width - 4, size - 2);
    c.fillStyle = INK.shelfEdge;
    c.fillRect(2, top + 1, width - 4, 1);
    c.fillStyle = INK.vent;
    for (let x = 10; x < width - 30; x += 6) c.fillRect(x, top + 4, 3, size - 8);
  }
}

function trays(c: CanvasRenderingContext2D, width: number, height: number, span: Extent) {
  const pitch = 0.06;
  for (let y = span[0]; y < span[1] - 1e-6; y += pitch) {
    const [top, size] = band(height, PANEL_HEIGHT_M, [y, y + pitch]);
    c.fillStyle = INK.tray;
    c.fillRect(2, top + 1, width - 4, size - 1);
    c.fillStyle = INK.grille;
    c.fillRect(16, top + 3, width - 46, size - 6);
    c.fillStyle = INK.handle;
    c.fillRect(5, top + 3, 4, size - 6);
    c.fillRect(width - 26, top + 4, 8, 2);
  }
}

function switches(c: CanvasRenderingContext2D, width: number, height: number, span: Extent) {
  const pitch = (span[1] - span[0]) / SWITCH_TRAYS;
  for (let index = 0; index < SWITCH_TRAYS; index += 1) {
    const y = span[0] + index * pitch;
    const [top, size] = band(height, PANEL_HEIGHT_M, [y, y + pitch]);
    c.fillStyle = INK.tray;
    c.fillRect(2, top + 1, width - 4, size - 1);
    ports(c, 14, width - 30, top + 3, size - 6);
  }
}

function ports(c: CanvasRenderingContext2D, from: number, to: number, top: number, size: number) {
  const rows = size > 10 ? 2 : 1;
  const rowSize = size / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let x = from; x < to; x += 7) {
      c.fillStyle = INK.portRim;
      c.fillRect(x, top + row * rowSize, 6, rowSize - 1);
      c.fillStyle = INK.port;
      c.fillRect(x + 1, top + row * rowSize + 1, 4, rowSize - 3);
    }
  }
}

export function rackFrontTexture(): CanvasTexture {
  return texture((c, width, height) => {
    c.fillStyle = INK.base;
    c.fillRect(0, 0, width, height);
    shelves(c, width, height, RACK_STACK.lowerShelves);
    shelves(c, width, height, RACK_STACK.upperShelves);
    trays(c, width, height, RACK_STACK.lowerCompute);
    trays(c, width, height, RACK_STACK.upperCompute);
    switches(c, width, height, RACK_STACK.switchTrays);
  });
}

export function perforatedTexture(): CanvasTexture {
  return texture((c, width, height) => {
    c.fillStyle = INK.door;
    c.fillRect(0, 0, width, height);
    c.fillStyle = INK.hole;
    for (let y = 10; y < height - 10; y += HOLE_PITCH) {
      const shift = (y / HOLE_PITCH) % 2 ? HOLE_PITCH / 2 : 0;
      for (let x = 8 + shift; x < width - 8; x += HOLE_PITCH) {
        c.beginPath();
        c.arc(x, y, HOLE_RADIUS, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.strokeStyle = INK.frame;
    c.lineWidth = 6;
    c.strokeRect(3, 3, width - 6, height - 6);
    c.fillStyle = INK.handle;
    c.fillRect(width - 16, height * 0.42, 5, height * 0.12);
  });
}

export function networkFrontTexture(): CanvasTexture {
  return texture((c, width, height) => {
    c.fillStyle = INK.base;
    c.fillRect(0, 0, width, height);
    const unit = height / NETWORK_UNITS;
    for (let index = 1; index < NETWORK_UNITS - 1; index += 1) {
      const top = index * unit;
      c.fillStyle = index % 5 === 0 ? INK.grille : INK.tray;
      c.fillRect(2, top + 1, width - 4, unit - 2);
      if (index % 5 !== 0) ports(c, 8, width - 10, top + 3, unit - 6);
    }
  });
}

export function cduFrontTexture(): CanvasTexture {
  return texture(
    (c, width, height) => {
      c.fillStyle = INK.cduBody;
      c.fillRect(0, 0, width, height);
      c.fillStyle = INK.cduSeam;
      c.fillRect(width / 2 - 1, 0, 2, height);
      c.strokeStyle = INK.cduSeam;
      c.lineWidth = 3;
      c.strokeRect(2, 2, width - 4, height - 4);
      c.fillStyle = INK.louvre;
      for (let y = height * 0.78; y < height * 0.96; y += 6) c.fillRect(10, y, width - 20, 3);
      c.fillStyle = INK.screen;
      c.fillRect(width * 0.14, height * 0.16, width * 0.3, height * 0.08);
      c.fillStyle = INK.handle;
      c.fillRect(width / 2 - 8, height * 0.45, 3, height * 0.1);
      c.fillRect(width / 2 + 5, height * 0.45, 3, height * 0.1);
    },
    WIDTH,
    HEIGHT / 2,
  );
}
