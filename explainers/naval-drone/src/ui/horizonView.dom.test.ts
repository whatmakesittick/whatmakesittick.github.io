import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import type { CanvasFrame } from '@core/ui/canvasSurface';
import en from '../../locales/en.json';
import { RADAR_HEIGHT_M, radarLineOfSightKm, surfaceDropM } from '../model';
import {
  AXIS_KM,
  TICKS_KM,
  horizonLayout,
  intersects,
  paintHorizon,
  placeLabel,
  sightHeightM,
  surfaceY,
  xOfKm,
  yOfMetres,
} from './horizonView';
import type { Box, HorizonScene } from './horizonView';
import { fill } from './testing';

const PHONE: CanvasFrame = { width: 358, height: 168, ratio: 1, fontFamily: 'sans-serif' };
const DESKTOP: CanvasFrame = { width: 640, height: 300, ratio: 1, fontFamily: 'sans-serif' };
const CHAR_WIDTH = 6;
const { canvas } = en.horizon;

type Align = 'left' | 'center' | 'right';

interface Drawn {
  text: string;
  x: number;
  y: number;
  align: Align;
}

function recordingContext() {
  const texts: Drawn[] = [];
  const noop = () => {};
  const context = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left' as Align,
    textBaseline: 'alphabetic',
    measureText: (text: string) => ({ width: text.length * CHAR_WIDTH }),
    fillText: (text: string, x: number, y: number) =>
      texts.push({ text, x, y, align: context.textAlign }),
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    arc: noop,
    setLineDash: noop,
  };
  return { texts, context: context as unknown as CanvasRenderingContext2D };
}

function paint(scene: HorizonScene, frame = PHONE): Drawn[] {
  const { texts, context } = recordingContext();
  paintHorizon(context, frame, scene);
  return texts;
}

describe('horizon view layout', () => {
  it('fits the 35 km axis, the tallest mast and the sea drop inside the canvas', () => {
    [PHONE, DESKTOP].forEach(({ width, height }) => {
      const layout = horizonLayout(width, height);
      expect(xOfKm(layout, 0)).toBeGreaterThan(0);
      expect(xOfKm(layout, AXIS_KM)).toBeLessThanOrEqual(width);
      expect(yOfMetres(layout, RADAR_HEIGHT_M.max)).toBeGreaterThan(layout.plot.top);
      expect(surfaceY(layout, AXIS_KM)).toBeLessThan(layout.plot.bottom);
      expect(layout.tickBaseline).toBeLessThan(height);
      expect(layout.font).toBeGreaterThanOrEqual(11);
    });
  });

  it('grazes the sea with the line of sight and reaches the top of the boat', () => {
    [5, 20, 50].forEach((radarHeight) => {
      const tangentKm = radarLineOfSightKm(radarHeight) - radarLineOfSightKm(0);
      expect(sightHeightM(radarHeight, tangentKm)).toBeCloseTo(-surfaceDropM(tangentKm), 9);
      const boatKm = radarLineOfSightKm(radarHeight);
      expect(sightHeightM(radarHeight, boatKm)).toBeCloseTo(-surfaceDropM(boatKm) + 0.5, 9);
    });
  });
});

describe('horizon view labels', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('takes the first free spot, inside the canvas', () => {
    const { context } = recordingContext();
    const layout = horizonLayout(PHONE.width, PHONE.height);
    const taken: Box[] = [{ left: 0, top: 40, right: 100, bottom: 60 }];
    const spot = placeLabel(
      context,
      'Label',
      [
        { x: 50, baseline: 55, align: 'center' },
        { x: 50, baseline: 90, align: 'center' },
      ],
      taken,
      layout,
    );
    expect(spot.baseline).toBe(90);
    expect(taken).toHaveLength(2);
    const edge = placeLabel(
      context,
      'Label',
      [{ x: 0, baseline: 120, align: 'center' }],
      [],
      layout,
    );
    expect(edge.box.left).toBeGreaterThanOrEqual(layout.bounds.left);
  });

  it('draws every text from the locale, ticks at 0, 10, 20 and 30 km', () => {
    const texts = paint({ radarHeight: 20, seaState: 'slight' }).map((drawn) => drawn.text);
    expect(texts).toEqual(
      expect.arrayContaining([
        canvas.radar,
        canvas.boat,
        canvas.lineOfSight,
        canvas.detection,
        canvas.note,
        ...TICKS_KM.map((km) => fill(canvas.km, { value: String(km) })),
      ]),
    );
  });

  it('marks the expected detection only up to a moderate sea', () => {
    const rough = paint({ radarHeight: 20, seaState: 'rough' }).map((drawn) => drawn.text);
    expect(rough).not.toContain(canvas.detection);
    expect(rough).toContain(canvas.boat);
  });

  it('keeps the labels apart at every radar height on a phone and a desktop', () => {
    [PHONE, DESKTOP].forEach((frame) =>
      [5, 20, 35, 50].forEach((radarHeight) => {
        const { context, texts } = recordingContext();
        paintHorizon(context, frame, { radarHeight, seaState: 'smooth' });
        const layout = horizonLayout(frame.width, frame.height);
        const boxes = texts
          .filter((drawn) => !drawn.text.endsWith(' km'))
          .map((drawn) => labelBox(drawn, layout.font));
        boxes.forEach((box, index) =>
          boxes
            .slice(index + 1)
            .forEach((other) => expect(intersects(box, other), `${radarHeight} m`).toBe(false)),
        );
      }),
    );
  });
});

function labelBox(drawn: Drawn, font: number): Box {
  const width = drawn.text.length * CHAR_WIDTH;
  const offset = { left: 0, center: width / 2, right: width }[drawn.align];
  const left = drawn.x - offset;
  return { left, right: left + width, top: drawn.y - font * 0.78, bottom: drawn.y };
}
