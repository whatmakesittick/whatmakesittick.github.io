export interface DockMode {
  inline: boolean;
  ready: boolean;
}

export interface DockReserve {
  sync(mode: DockMode): void;
  dispose(): void;
}

export function reserveDock(slot: HTMLElement): DockReserve {
  let last = 0;
  let mode: DockMode = { inline: false, ready: false };
  const measure = () => {
    if (!mode.inline || !mode.ready) return;
    last = slot.getBoundingClientRect().height;
  };
  const sizes = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
  sizes?.observe(slot);
  return {
    sync(next) {
      mode = next;
      slot.style.minHeight = next.inline && !next.ready && last > 0 ? `${last}px` : '';
      measure();
    },
    dispose() {
      sizes?.disconnect();
      slot.style.minHeight = '';
    },
  };
}
