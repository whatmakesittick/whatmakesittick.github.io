const SYSTEM_BODY_FONT = '-apple-system-body';
const DEFAULT_SYSTEM_BODY_SIZE = 17;

export function followSystemTextSize(): void {
  if (!navigator.maxTouchPoints || !CSS.supports('font', SYSTEM_BODY_FONT)) return;
  const root = document.documentElement;
  const probe = root.appendChild(document.createElement('i'));
  probe.style.font = SYSTEM_BODY_FONT;
  const size = parseFloat(getComputedStyle(probe).fontSize);
  probe.remove();
  root.style.fontSize = `${(size / DEFAULT_SYSTEM_BODY_SIZE) * 100}%`;
}
