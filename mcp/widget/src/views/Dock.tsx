import { useRef } from 'preact/hooks';
import type {
  EmbedChoiceInfo,
  EmbedInfo,
  EmbedPhaseInfo,
  EmbedToggleInfo,
} from '../../../../src/core/embed/contract.ts';
import { useLive } from '../live.ts';
import { shortLabel } from '../state.ts';
import { S } from '../strings.ts';
import { Icon, ToggleIcon } from './icons.tsx';
import type { ViewModel } from './types.ts';

const tint = (tone: string) => ({
  color: tone,
  background: `color-mix(in srgb, ${tone} 16%, transparent)`,
});

export function PlayButton({ vm }: { vm: ViewModel }) {
  const playing = vm.disc.playing;
  return (
    <button
      type="button"
      class="play"
      aria-label={playing ? S.pause : S.play}
      title={`${playing ? S.pause : S.play} (Space)`}
      disabled={vm.status !== 'ready'}
      onClick={vm.actions.togglePlay}
    >
      {playing ? <Icon.pause /> : <Icon.play />}
    </button>
  );
}

function bands(info: EmbedInfo): { phase: EmbedPhaseInfo; share: number }[] {
  const cycle = info.cycle > 0 ? info.cycle : 1;
  return info.phases.map((phase) => ({
    phase,
    share: Math.max(0, (phase.end - phase.start) / cycle),
  }));
}

export function Scrubber({ vm }: { vm: ViewModel }) {
  const state = useLive(vm.live);
  const track = useRef<HTMLDivElement>(null);
  const info = vm.info;
  const progress = state?.progress ?? 0;
  const seekAt = (e: PointerEvent) => {
    const box = track.current?.getBoundingClientRect();
    if (!box || box.width <= 0) return;
    vm.actions.seek(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)));
  };
  const ready = vm.status === 'ready' && !!info;
  return (
    <div
      class="scrub"
      ref={track}
      role="slider"
      aria-label={S.timeline}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-valuetext={state?.phaseLabel}
      tabIndex={ready ? 0 : -1}
      onPointerDown={(e) => {
        if (!ready) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        seekAt(e);
      }}
      onPointerMove={(e) => {
        if (ready && (e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) seekAt(e);
      }}
      onKeyDown={(e) => {
        if (!ready) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.stopPropagation();
          e.preventDefault();
          vm.actions.seek(progress + (e.key === 'ArrowLeft' ? -0.02 : 0.02));
        }
      }}
    >
      <div class="track">
        {info ? (
          bands(info).map(({ phase, share }) => (
            <i key={phase.id} style={{ flex: share, background: phase.tone }} />
          ))
        ) : (
          <i style={{ flex: 1 }} />
        )}
      </div>
      <div class="knob" style={{ left: `${progress * 100}%` }} />
    </div>
  );
}

export function PhaseButtons({ vm }: { vm: ViewModel }) {
  const state = useLive(vm.live);
  const info = vm.info;
  if (!info) return <div class="phases" />;
  return (
    <div class="phases">
      {bands(info).map(({ phase, share }) => (
        <button
          type="button"
          key={phase.id}
          style={{ flex: share, ...(phase.id === state?.phaseId ? tint(phase.tone) : {}) }}
          class={phase.id === state?.phaseId ? 'on' : ''}
          onClick={() => vm.actions.seek(info.cycle > 0 ? phase.start / info.cycle + 1e-4 : 0)}
        >
          {phase.label}
        </button>
      ))}
    </div>
  );
}

export function Choice({ vm, choice }: { vm: ViewModel; choice: EmbedChoiceInfo }) {
  const value = vm.disc.choices[choice.id];
  return (
    <div class="seg" role="group" aria-label={choice.label}>
      {choice.options.map((o) => {
        const short = shortLabel(o.label);
        return (
          <button
            type="button"
            key={o.value}
            class={o.value === value ? 'on' : ''}
            aria-pressed={o.value === value}
            disabled={vm.status !== 'ready'}
            onClick={() => vm.actions.setChoice(choice.id, o.value)}
          >
            {short === o.label ? (
              o.label
            ) : (
              <>
                <span class="lg">{o.label}</span>
                <span class="sh">{short}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  vm,
  toggle,
  iconOnly,
}: {
  vm: ViewModel;
  toggle: EmbedToggleInfo;
  iconOnly?: boolean;
}) {
  const on = !!vm.disc.view[toggle.id];
  return (
    <button
      type="button"
      class={`tgl${on ? ' on' : ''}${iconOnly ? ' icon-only' : ''}`}
      aria-pressed={on}
      aria-label={toggle.label}
      title={`${toggle.hint || toggle.label} (${toggle.shortcut})`}
      disabled={vm.status !== 'ready'}
      onClick={() => vm.actions.setView(toggle.id, !on)}
    >
      <ToggleIcon markup={toggle.icon} />
      {!iconOnly && <span class="txt">{toggle.short || toggle.label}</span>}
    </button>
  );
}

export function FallbackDock({ vm }: { vm: ViewModel }) {
  const info = vm.info;
  return (
    <div class="dock-fallback glass" data-dock hidden={vm.siteDock || vm.status !== 'ready'}>
      <div class="r1">
        <PlayButton vm={vm} />
        <div class="tl">
          <Scrubber vm={vm} />
          <PhaseButtons vm={vm} />
        </div>
      </div>
      {info && (info.choices.length > 0 || info.toggles.length > 0) && (
        <div class="r2">
          {info.choices.map((c) => (
            <Choice key={c.id} vm={vm} choice={c} />
          ))}
          <span class="sp" />
          {info.toggles.map((t) => (
            <Toggle key={t.id} vm={vm} toggle={t} />
          ))}
          <button
            type="button"
            class="tgl icon-only"
            aria-label={S.resetCamera}
            title={`${S.resetCamera} (R)`}
            onClick={vm.actions.resetCamera}
          >
            <Icon.reset />
          </button>
        </div>
      )}
    </div>
  );
}
