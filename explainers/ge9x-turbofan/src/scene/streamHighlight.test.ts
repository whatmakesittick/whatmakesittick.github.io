import { describe, expect, it } from 'vitest';
import { PART_IDS, PRESET_IDS } from '../ids';
import { PRESETS } from '../state';
import { STREAM_HIGHLIGHT, highlightFor } from './streamHighlight';

describe('stream highlight', () => {
  it('names known parts and dims nothing for both streams', () => {
    expect(STREAM_HIGHLIGHT.both).toEqual([]);
    Object.values(STREAM_HIGHLIGHT).forEach((parts) =>
      parts.forEach((part) => expect(PART_IDS).toContain(part)),
    );
  });

  it('keeps the chapter highlight until the reader picks another stream', () => {
    PRESET_IDS.forEach((id) => {
      const preset = PRESETS[id];
      expect(highlightFor(preset, { streams: preset.start.streams ?? 'both' })).toBe(
        preset.highlight,
      );
    });
    expect(highlightFor(PRESETS.fan, { streams: 'cold' })).toBe(STREAM_HIGHLIGHT.cold);
    expect(highlightFor(PRESETS.compressor, { streams: 'both' })).toBe(STREAM_HIGHLIGHT.both);
    expect(highlightFor(PRESETS.compressor, { streams: 'cold' })).toBe(STREAM_HIGHLIGHT.cold);
  });

  it('keeps the cold path and the core apart', () => {
    const cold = new Set(STREAM_HIGHLIGHT.cold);
    STREAM_HIGHLIGHT.hot.forEach((part) => expect(cold.has(part)).toBe(false));
  });
});
