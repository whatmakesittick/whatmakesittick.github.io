const CHANNEL = 255;
const HEX_RADIX = 16;
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;

type Rgb = readonly [number, number, number];

function channels(hex: string): Rgb {
  const value = parseInt(hex.slice(1), HEX_RADIX);
  return [(value >> RED_SHIFT) & CHANNEL, (value >> GREEN_SHIFT) & CHANNEL, value & CHANNEL];
}

function style([red, green, blue]: Rgb, alpha = 1): string {
  const clampChannel = (value: number) => Math.round(Math.max(0, Math.min(CHANNEL, value)));
  return `rgba(${clampChannel(red)},${clampChannel(green)},${clampChannel(blue)},${alpha})`;
}

export function shade(hex: string, factor: number, alpha = 1): string {
  const [red, green, blue] = channels(hex);
  return style([red * factor, green * factor, blue * factor], alpha);
}

export function mix(from: string, to: string, share: number): string {
  const a = channels(from);
  const b = channels(to);
  return style(
    [0, 1, 2].map((index) => a[index] + (b[index] - a[index]) * share) as unknown as Rgb,
  );
}

export function grey(level: number): string {
  return style([level * CHANNEL, level * CHANNEL, level * CHANNEL]);
}
