import { useEffect, useState } from 'preact/hooks';
import { EMBED_DOM } from '../../../src/core/embed/contract.ts';
import type { ExpandableStage } from '../../../src/core/ui/stageShortcuts.ts';
import { toDisplayMode, type DisplayMode, type WidgetHost } from './bridge.ts';

export function useDisplayMode(host: WidgetHost) {
  const [mode, setMode] = useState<DisplayMode>(
    toDisplayMode(host.context()?.displayMode) ?? 'inline',
  );
  useEffect(
    () => host.on('context', (c) => setMode((current) => toDisplayMode(c.displayMode) ?? current)),
    [host],
  );

  const fullscreen = mode === 'fullscreen';
  useEffect(() => {
    const root = document.documentElement;
    if (fullscreen) root.dataset[EMBED_DOM.stageExpandedKey] = '';
    else delete root.dataset[EMBED_DOM.stageExpandedKey];
  }, [fullscreen]);

  const request = async (next: DisplayMode) => {
    try {
      setMode(await host.requestDisplayMode(next));
    } catch (e) {
      console.warn('[wmit-widget] requestDisplayMode', e);
    }
  };
  const toggleFullscreen = () => void request(fullscreen ? 'inline' : 'fullscreen');
  const collapse = () => {
    if (fullscreen) void request('inline');
  };

  const stage: ExpandableStage = { expanded: fullscreen, toggle: toggleFullscreen, collapse };
  return { fullscreen, toggleFullscreen, stage };
}
