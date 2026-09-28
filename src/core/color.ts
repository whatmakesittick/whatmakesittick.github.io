const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX_RADIX = 16;

export function withAlpha(hex: string, alpha: number): string {
  const match = HEX_COLOR.exec(hex);
  if (!match) throw new Error(`Expected a #rrggbb colour, got "${hex}"`);
  const [red, green, blue] = match.slice(1).map((channel) => parseInt(channel, HEX_RADIX));
  return `rgb(${red} ${green} ${blue} / ${alpha})`;
}
