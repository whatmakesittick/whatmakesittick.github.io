import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createProbeRecorder,
  installDebugPill,
  type ProbeRecord,
} from '../../widget/src/debugPill.ts';

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

function pill(mode = 'fullscreen') {
  document.body.innerHTML = '<div class="dock-slot"><div class="dock"></div></div>';
  const notes: string[] = [];
  const probes: ProbeRecord[][] = [];
  const stop = installDebugPill(document, {
    displayMode: () => mode,
    debug: (note) => notes.push(note),
    probe: (records) => probes.push(records),
    probeMs: 1000,
  });
  const el = document.querySelector<HTMLElement>('[data-debug="pill"]')!;
  const [up, probe] = [...el.querySelectorAll('button')];
  return { notes, probes, stop, el, up: up!, probe: probe! };
}

describe('debug pill', () => {
  it('coalesces probe moves under two pixels and batches them', () => {
    vi.useFakeTimers();
    const batches: ProbeRecord[][] = [];
    const recorder = createProbeRecorder((records) => batches.push(records));
    recorder.record('move', 10, 10, 1);
    recorder.record('move', 11, 11, 2);
    recorder.record('move', 13, 11, 3);
    recorder.record('down', 13, 11, 4);
    vi.advanceTimersByTime(300);
    expect(batches).toEqual([
      [
        { k: 'move', x: 10, y: 10, t: 1 },
        { k: 'move', x: 13, y: 11, t: 3 },
        { k: 'down', x: 13, y: 11, t: 4 },
      ],
    ]);
  });

  it('shows only in fullscreen', () => {
    const inline = pill('inline');
    expect(inline.el.hidden).toBe(true);
    inline.stop();
    const full = pill();
    expect(full.el.hidden).toBe(false);
    full.stop();
  });

  it('moves the dock slot up and back', async () => {
    const { up, notes, stop } = pill();
    const slot = document.querySelector<HTMLElement>('.dock-slot')!;
    up.click();
    expect(slot.style.transform).toBe('translateY(-60px)');
    up.click();
    expect(slot.style.transform).toBe('');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(notes).toEqual(['dock up on', 'dock up off']);
    stop();
  });

  it('records the probe over a full overlay and removes it when time is up', () => {
    vi.useFakeTimers();
    const { probe, notes, probes, stop } = pill();
    probe.click();
    const overlay = document.querySelector<HTMLElement>('[data-debug="probe"]')!;
    expect(overlay.style.position).toBe('fixed');
    overlay.dispatchEvent(
      new MouseEvent('pointermove', { bubbles: true, clientX: 300, clientY: 555 }),
    );
    overlay.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 556 }),
    );
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 300, clientY: 556 }));
    vi.advanceTimersByTime(1100);
    expect(document.querySelector('[data-debug="probe"]')).toBeNull();
    expect(probes.flat().map((r) => [r.k, r.x, r.y])).toEqual([
      ['move', 300, 555],
      ['down', 300, 556],
      ['click', 300, 556],
    ]);
    expect(notes).toEqual(['probe start', 'probe end']);
    stop();
  });
});
