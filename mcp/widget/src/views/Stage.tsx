import { Component, type RefObject } from 'preact';
import { pad2 } from '../state.ts';
import { useStrings } from '../i18n/context.ts';
import { Brand } from './Brand.tsx';
import { Icon } from './icons.tsx';
import { coverUrl, hideBroken, type ViewModel } from './types.ts';

class Slot extends Component<{ class: string; slotRef: RefObject<HTMLDivElement | null> }> {
  shouldComponentUpdate() {
    return false;
  }
  render() {
    return <div class={this.props.class} ref={this.props.slotRef} />;
  }
}

class ViewportHost extends Component<{ hostRef: RefObject<HTMLDivElement | null> }> {
  shouldComponentUpdate() {
    return false;
  }
  render() {
    return <div class="viewport" ref={this.props.hostRef} />;
  }
}

export function Header({ vm }: { vm: ViewModel }) {
  const s = useStrings();
  return (
    <header class="a-head inline-only">
      <div class="row">
        <Brand onOpen={vm.actions.openCatalogue} />
        <button type="button" class="ghost" onClick={vm.actions.openSite}>
          <span class="lg">{s.openOnSite}</span>
          <span class="sh">{s.openOnSiteShort}</span>
          <Icon.ext />
        </button>
      </div>
      <p class="eyebrow">{vm.entry.eyebrow}</p>
      <h2 class="title">{vm.entry.title}</h2>
      <p class="tagline">{vm.tagline}</p>
    </header>
  );
}

function StateLayer({ vm }: { vm: ViewModel }) {
  const s = useStrings();
  const { status } = vm;
  if (status === 'ready') return null;
  const cover = coverUrl(vm.assetBase, vm.entry);
  return (
    <div class={`state state-${status}`}>
      <img
        class={status === 'nowebgl' ? 'still' : 'dim'}
        src={cover}
        alt={status === 'nowebgl' ? vm.entry.title : ''}
        onError={hideBroken}
      />
      {(status === 'loading' || status === 'idle') && (
        <>
          <div class="center">
            <div class="box">
              <h5>{s.loading.title}</h5>
              <p>{s.loading.body}</p>
            </div>
          </div>
          <div
            class="prog"
            role="progressbar"
            aria-valuenow={Math.round(vm.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div class="bar">
              <i style={{ width: `${Math.round(vm.progress * 100)}%` }} />
            </div>
            <div class="row">
              <span>{s.loading.progress}</span>
              <span class="number">{Math.round(vm.progress * 100)}%</span>
            </div>
          </div>
        </>
      )}
      {status === 'nowebgl' && (
        <>
          <span class="badge-still">{s.noWebgl.chip}</span>
          <div class="center bottom">
            <div class="box glass">
              <h5>{s.noWebgl.title}</h5>
              <p>{s.noWebgl.body}</p>
              <div class="btns">
                <button type="button" class="ghost accent" onClick={vm.actions.openSite}>
                  {s.noWebgl.cta} <Icon.ext />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {status === 'error' && (
        <div class="center">
          <div class="box glass">
            <h5 class="err">{s.error.title}</h5>
            <p>{s.error.body}</p>
            <div class="btns">
              <button type="button" class="ghost accent" onClick={vm.actions.retry}>
                <Icon.reset />
                {s.error.retry}
              </button>
              <button type="button" class="ghost" onClick={vm.actions.openSite}>
                {s.openOnSite} <Icon.ext />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface StageRefs {
  host: RefObject<HTMLDivElement | null>;
  dock: RefObject<HTMLDivElement | null>;
  gauge: RefObject<HTMLDivElement | null>;
}

export function Stage({
  vm,
  refs,
  onPointerDown,
  onPointerLeave,
  onUserInput,
}: {
  vm: ViewModel;
  refs: StageRefs;
  onPointerDown: () => void;
  onPointerLeave: () => void;
  onUserInput: () => void;
}) {
  const s = useStrings();
  const current = vm.chapters.find((c) => c.id === vm.chapter);
  const ready = vm.status === 'ready';
  const showFs = vm.canFullscreen && vm.status !== 'nowebgl' && !vm.fullscreen;
  return (
    <div
      class={`scene-col${ready ? ' is-ready' : ''}`}
      data-stage
      onPointerDown={onPointerDown}
      onPointerLeave={onPointerLeave}
      onClickCapture={onUserInput}
      onInputCapture={onUserInput}
    >
      <div key="view" class="stage">
        <ViewportHost key="viewport" hostRef={refs.host} />
        <div key="vignette" class="vignette" aria-hidden="true" />
        <StateLayer key="state" vm={vm} />
        <span
          key="chip"
          class="chip inline-only"
          data-gauge
          hidden={!current || vm.status === 'nowebgl' || vm.status === 'error'}
        >
          <em>
            {pad2(current?.index ?? 0)} / {pad2(vm.chapters.length)}
          </em>
          {current?.short}
        </span>
        <button
          key="expand"
          type="button"
          class="round-btn stage-expand inline-only"
          hidden={!showFs}
          aria-label={s.fullscreen}
          title={s.fullscreen}
          onClick={vm.actions.toggleFullscreen}
        >
          <Icon.expand />
        </button>
        <Slot key="gauge" class="gauge-slot" slotRef={refs.gauge} />
      </div>
      <Slot key="dock" class="dock-slot" slotRef={refs.dock} />
    </div>
  );
}
