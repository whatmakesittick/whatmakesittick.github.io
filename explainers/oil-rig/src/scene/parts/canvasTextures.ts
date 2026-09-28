import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

export type RockPattern = 'clay' | 'sand' | 'shale' | 'interbedded';

type Painter = (context: CanvasRenderingContext2D, size: number, random: () => number) => void;

const SEED_MULTIPLIER = 48271;
const SEED_MODULUS = 2147483647;
const ANISOTROPY = 4;
const BASE_TONE = '#ffffff';

const HELIDECK_PAINT = {
  deck: '#5b6266',
  line: '#f3f3ee',
  circle: '#f2c230',
  lineWidth: 0.022,
  circleRadius: 0.3,
  circleWidth: 0.05,
  letterHeight: 0.3,
  letterWidth: 0.19,
  stroke: 0.055,
  edgeInset: 0.035,
  sides: 8,
} as const;

const LABEL_PAINT = {
  fill: 'rgba(250, 248, 240, 0.92)',
  text: '#1f2328',
  font: '600 44px "Inter", "Helvetica Neue", Arial, sans-serif',
  radius: 20,
  padding: 12,
} as const;

export function seededRandom(seed: number): () => number {
  let state = seed % SEED_MODULUS || 1;
  return () => {
    state = (state * SEED_MULTIPLIER) % SEED_MODULUS;
    return state / SEED_MODULUS;
  };
}

function canvasTexture(
  width: number,
  height: number,
  paint: (c: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) paint(context);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

const PATTERN = {
  dot: {
    minRadius: 0.9,
    radiusRange: 2.2,
    lightShare: 0.35,
    from: 0.6,
    range: 0.25,
    lightAlpha: 0.9,
  },
  line: {
    from: 0.7,
    range: 0.18,
    minWidth: 1.2,
    widthRange: 1.8,
    steps: 12,
    wave: 2,
    gap: 10,
    gapRange: 26,
  },
  clay: {
    blobs: 140,
    from: 0.86,
    range: 0.14,
    alpha: 0.3,
    minRadius: 10,
    radiusRange: 34,
    dots: 240,
  },
  sand: { dots: 3200 },
  interbedded: { bands: 4, dots: 900, lineMargin: 3 },
} as const;

const FULL_CIRCLE = Math.PI * 2;
const CHANNEL_MAX = 255;

function grey(value: number, alpha = 1): string {
  const level = Math.round(value * CHANNEL_MAX);
  return `rgba(${level}, ${level}, ${level}, ${alpha})`;
}

function dots(
  context: CanvasRenderingContext2D,
  size: number,
  random: () => number,
  count: number,
) {
  const { minRadius, radiusRange, lightShare, from, range, lightAlpha } = PATTERN.dot;
  for (let index = 0; index < count; index++) {
    const radius = minRadius + random() * radiusRange;
    context.fillStyle = random() > lightShare ? grey(from + random() * range) : grey(1, lightAlpha);
    context.beginPath();
    context.arc(random() * size, random() * size, radius, 0, FULL_CIRCLE);
    context.fill();
  }
}

interface Stripe {
  top: number;
  bottom: number;
  size: number;
}

function lines(context: CanvasRenderingContext2D, stripe: Stripe, random: () => number) {
  const { from, range, minWidth, widthRange, steps, wave, gap, gapRange } = PATTERN.line;
  const { size } = stripe;
  for (let y = stripe.top; y < stripe.bottom; y += gap + random() * gapRange) {
    context.strokeStyle = grey(from + random() * range);
    context.lineWidth = minWidth + random() * widthRange;
    context.beginPath();
    context.moveTo(0, y);
    for (let x = 0; x <= size; x += size / steps) {
      context.lineTo(x, y + Math.sin((x / size) * FULL_CIRCLE + y) * wave);
    }
    context.stroke();
  }
}

function clay(context: CanvasRenderingContext2D, size: number, random: () => number) {
  const { blobs, from, range, alpha, minRadius, radiusRange } = PATTERN.clay;
  for (let index = 0; index < blobs; index++) {
    context.fillStyle = grey(from + random() * range, alpha);
    context.beginPath();
    context.arc(
      random() * size,
      random() * size,
      minRadius + random() * radiusRange,
      0,
      FULL_CIRCLE,
    );
    context.fill();
  }
  dots(context, size, random, PATTERN.clay.dots);
}

function interbedded(context: CanvasRenderingContext2D, size: number, random: () => number) {
  const { bands, lineMargin } = PATTERN.interbedded;
  const band = size / bands;
  for (let index = 0; index < bands; index += 2) {
    context.save();
    context.beginPath();
    context.rect(0, index * band, size, band);
    context.clip();
    dots(context, size, random, PATTERN.interbedded.dots);
    context.restore();
    lines(
      context,
      { top: (index + 1) * band + lineMargin, bottom: (index + 2) * band, size },
      random,
    );
  }
}

const PAINTERS: Record<RockPattern, Painter> = {
  clay,
  sand: (context, size, random) => dots(context, size, random, PATTERN.sand.dots),
  shale: (context, size, random) => lines(context, { top: 0, bottom: size, size }, random),
  interbedded,
};

export function rockTexture(pattern: RockPattern, size: number, tile: number, seed: number) {
  const random = seededRandom(seed);
  const texture = canvasTexture(size, size, (context) => {
    context.fillStyle = BASE_TONE;
    context.fillRect(0, 0, size, size);
    PAINTERS[pattern](context, size, random);
  });
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1 / tile, 1 / tile);
  return texture;
}

function octagonPath(context: CanvasRenderingContext2D, centre: number, radius: number) {
  const { sides } = HELIDECK_PAINT;
  context.beginPath();
  for (let index = 0; index <= sides; index++) {
    const angle = Math.PI / sides + (index / sides) * FULL_CIRCLE;
    context.lineTo(centre + radius * Math.cos(angle), centre + radius * Math.sin(angle));
  }
}

function paintLetter(context: CanvasRenderingContext2D, size: number) {
  const { letterHeight, letterWidth, stroke } = HELIDECK_PAINT;
  const centre = size / 2;
  const height = letterHeight * size;
  const width = letterWidth * size;
  const bar = stroke * size;
  context.fillStyle = HELIDECK_PAINT.line;
  context.fillRect(centre - width / 2, centre - height / 2, bar, height);
  context.fillRect(centre + width / 2 - bar, centre - height / 2, bar, height);
  context.fillRect(centre - width / 2, centre - bar / 2, width, bar);
}

export function helideckTexture(size: number) {
  return canvasTexture(size, size, (context) => {
    const centre = size / 2;
    const { deck, line, circle, lineWidth, circleRadius, circleWidth, edgeInset } = HELIDECK_PAINT;
    context.fillStyle = deck;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = line;
    context.lineWidth = lineWidth * size;
    octagonPath(context, centre, centre * (1 - edgeInset * 2));
    context.stroke();
    context.strokeStyle = circle;
    context.lineWidth = circleWidth * size;
    context.beginPath();
    context.arc(centre, centre, circleRadius * size, 0, FULL_CIRCLE);
    context.stroke();
    paintLetter(context, size);
  });
}

function roundedRect(context: CanvasRenderingContext2D, width: number, height: number) {
  const { radius } = LABEL_PAINT;
  context.beginPath();
  context.roundRect(0, 0, width, height, radius);
}

export function labelTexture(text: string, width: number, height: number) {
  return canvasTexture(width, height, (context) => {
    context.fillStyle = LABEL_PAINT.fill;
    roundedRect(context, width, height);
    context.fill();
    context.fillStyle = LABEL_PAINT.text;
    context.font = LABEL_PAINT.font;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      text,
      width / 2,
      height / 2 + LABEL_PAINT.padding / 4,
      width - LABEL_PAINT.padding,
    );
  });
}
