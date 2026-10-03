import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import type { CanvasFrame } from '@core/ui/canvasSurface';
import en from '../../locales/en.json';
import {
  DETECTION_KM,
  RADAR_HEIGHT_M,
  detectionCovered,
  radarLineOfSightKm,
  surfaceDropM,
} from '../model';
import { intersects } from './canvasLabels';
import type { Box } from './canvasLabels';
import {
  AXIS_KM,
  TICKS_KM,
  horizonLayout,
  blockedBoxes,
  paintHorizon,
  sightHeightM,
  surfaceY,
  xOfKm,
  yOfMetres,
} from './horizonView';
import type { HorizonScene } from './horizonView';
import { fill } from './testing';

const PHONE: CanvasFrame = { width: 358, height: 168, ratio: 1, fontFamily: 'sans-serif' };
const DESKTOP: CanvasFrame = { width: 640, height: 300, ratio: 1, fontFamily: 'sans-serif' };
const CHAR_WIDTHS = [6, 8] as const;
let charWidth: number = CHAR_WIDTHS[0];
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
    measureText: (text: string) => ({ width: text.length * charWidth }),
    strokeText: noop,
    lineJoin: 'round',
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
      expect(layout.metrics.font).toBeGreaterThanOrEqual(11);
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

  it('places the radar label first, the only one that may cross the detection mark', () => {
    const labels = paint({ radarHeight: 20, seaState: 'slight' }).filter(
      (drawn) => !drawn.text.endsWith(' km'),
    );
    expect(labels[0].text).toBe(canvas.radar);
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

  it.each(CHAR_WIDTHS)(
    'keeps labels of %d px a letter apart and off the line and the sea',
    (width) => {
      charWidth = width;
      [PHONE, DESKTOP].forEach((frame) =>
        [5, 8, 12, 20, 35, 50].forEach((radarHeight) =>
          (['smooth', 'moderate', 'rough'] as const).forEach((seaState) => {
            const scene = { radarHeight, seaState };
            const { context, texts } = recordingContext();
            paintHorizon(context, frame, scene);
            const layout = horizonLayout(frame.width, frame.height);
            const blocked = blockedBoxes(layout, scene);
            const labels = texts.filter((drawn) => !drawn.text.endsWith(' km'));
            const boxes = labels.map((drawn) => labelBox(drawn, layout.metrics.font));
            boxes.forEach((box, index) => {
              const where = `${frame.width} px, ${radarHeight} m, ${seaState}: ${labels[index].text}`;
              expect(box.bottom, where).toBeLessThanOrEqual(layout.plot.bottom);
              const marks = index === 0 ? blocked : [...blocked, detectionMark(layout, scene)];
              [...boxes.slice(index + 1), ...marks].forEach((other) =>
                expect(intersects(box, other), where).toBe(false),
              );
            });
          }),
        ),
      );
      charWidth = CHAR_WIDTHS[0];
    },
  );
});

function detectionMark(layout: ReturnType<typeof horizonLayout>, scene: HorizonScene): Box {
  if (!detectionCovered(scene.seaState)) return { left: 0, right: 0, top: 0, bottom: 0 };
  const x = xOfKm(layout, DETECTION_KM);
  return { left: x - 1, right: x + 1, top: layout.plot.top, bottom: layout.plot.bottom };
}

function labelBox(drawn: Drawn, font: number): Box {
  const width = drawn.text.length * charWidth;
  const offset = { left: 0, center: width / 2, right: width }[drawn.align];
  const left = drawn.x - offset;
  return { left, right: left + width, top: drawn.y - font * 0.78, bottom: drawn.y + font * 0.24 };
}
