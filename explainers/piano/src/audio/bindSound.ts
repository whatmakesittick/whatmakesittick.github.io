import type { Disposer } from '@core/ui/disposers';
import { noteSpec } from '../model';
import { createPianoPlayer } from './player';
import type { PianoPlayer } from './player';
import { damperDown, strikeCrossed } from './triggers';
import type { SoundSnapshot } from './triggers';

export type SoundListener = (state: SoundSnapshot, prev: SoundSnapshot) => void;

export interface SoundStore {
  getState(): SoundSnapshot;
  subscribe(listener: SoundListener): () => void;
}

export type PlayerFactory = () => PianoPlayer;

function switchPlayer(player: PianoPlayer, sound: boolean): void {
  if (sound) player.on();
  else player.off();
}

function soundListener(player: PianoPlayer): SoundListener {
  return (state, prev) => {
    if (state.view.sound !== prev.view.sound) switchPlayer(player, state.view.sound);
    if (!state.view.sound) return;
    if (strikeCrossed(prev, state)) player.play(noteSpec(state.touch, state.pedal, state.register));
    if (damperDown(state)) player.release();
  };
}

export function mountSound(
  store: SoundStore,
  createPlayer: PlayerFactory = createPianoPlayer,
): Disposer {
  const player = createPlayer();
  if (store.getState().view.sound) player.on();
  const unsubscribe = store.subscribe(soundListener(player));
  return () => {
    unsubscribe();
    player.dispose();
  };
}
