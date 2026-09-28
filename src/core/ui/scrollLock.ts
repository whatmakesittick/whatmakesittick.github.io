export interface ScrollLock {
  lock(): void;
  unlock(): void;
}

const LOCKED_PROPERTIES = ['position', 'top', 'left', 'right', 'padding-right'] as const;

type LockedStyles = Record<(typeof LOCKED_PROPERTIES)[number], string>;

function lockedStyles(scrollTop: number, scrollbarWidth: number): LockedStyles {
  return {
    position: 'fixed',
    top: `${-scrollTop}px`,
    left: '0',
    right: '0',
    'padding-right': `${scrollbarWidth}px`,
  };
}

export function createScrollLock(root: Document): ScrollLock {
  const view = root.defaultView ?? window;
  const { body, documentElement } = root;
  let savedTop: number | null = null;

  return {
    lock() {
      if (savedTop !== null) return;
      savedTop = view.scrollY;
      const scrollbarWidth = view.innerWidth - documentElement.clientWidth;
      Object.entries(lockedStyles(savedTop, scrollbarWidth)).forEach(([property, value]) =>
        body.style.setProperty(property, value),
      );
    },
    unlock() {
      if (savedTop === null) return;
      LOCKED_PROPERTIES.forEach((property) => body.style.removeProperty(property));
      view.scrollTo({ top: savedTop, behavior: 'instant' });
      savedTop = null;
    },
  };
}
