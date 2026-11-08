import { describe, expect, it, vi } from 'vitest';
import { MOMENTS, noteSpec } from '../model';
import { createPianoStore } from '../state';
import { mountSound } from './bindSound';
import type { PianoPlayer } from './player';

function fakePlayer() {
  return {
    on: vi.fn(),
    off: vi.fn(),
    play: vi.fn(),
    release: vi.fn(),
    dispose: vi.fn(),
  } satisfies PianoPlayer;
}

function mounted(sound = true) {
  const player = fakePlayer();
  const store = createPianoStore({ phase: 390, playing: true });
  store.getState().setView({ sound });
  const dispose = mountSound(store, () => player);
  return { player, store, dispose };
}

describe('mountSound', () => {
  it('plays a note on a strike only while sound is on', () => {
    const { player, store } = mounted(false);
    store.setState({ phase: 410 });
    expect(player.play).not.toHaveBeenCalled();
    store.getState().setView({ sound: true });
    store.setState({ phase: 390 });
    store.setState({ phase: 410 });
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledWith(noteSpec('medium', 'none', 'middle'));
  });

  it('plays the note the current touch, pedal and register describe', () => {
    const { player, store } = mounted();
    store.getState().setTouch('hard');
    store.getState().setPedal('unaCorda');
    store.getState().setRegister('bass');
    store.setState({ phase: 405 });
    expect(player.play).toHaveBeenCalledWith(noteSpec('hard', 'unaCorda', 'bass'));
  });

  it('turns the player on and off with the sound toggle', () => {
    const { player, store } = mounted(false);
    expect(player.on).not.toHaveBeenCalled();
    store.getState().toggleView('sound');
    expect(player.on).toHaveBeenCalledTimes(1);
    store.getState().toggleView('sound');
    expect(player.off).toHaveBeenCalledTimes(1);
  });

  it('turns the player on at mount when sound is already on', () => {
    const { player } = mounted();
    expect(player.on).toHaveBeenCalledTimes(1);
  });

  it('releases the voice when the damper lands', () => {
    const { player, store } = mounted();
    store.setState({ phase: MOMENTS.damped - 10 });
    expect(player.release).not.toHaveBeenCalled();
    store.setState({ phase: MOMENTS.damped + 5 });
    expect(player.release).toHaveBeenCalled();
  });

  it('releases the voice when sustain is let go past the release', () => {
    const { player, store } = mounted();
    store.getState().setPedal('sustain');
    store.setState({ phase: MOMENTS.damped + 10 });
    expect(player.release).not.toHaveBeenCalled();
    store.getState().setPedal('none');
    expect(player.release).toHaveBeenCalled();
  });

  it('does not play on a chapter seek across the strike', () => {
    const { player, store } = mounted();
    store.getState().pause();
    store.getState().setPhase(450);
    player.play.mockClear();
    store.getState().applyPreset('room');
    expect(store.getState().phase).toBeLessThan(MOMENTS.strike);
    expect(player.play).not.toHaveBeenCalled();
  });

  it('unsubscribes and disposes the player', () => {
    const { player, store, dispose } = mounted();
    dispose();
    expect(player.dispose).toHaveBeenCalledTimes(1);
    store.setState({ phase: 410 });
    store.getState().toggleView('sound');
    expect(player.play).not.toHaveBeenCalled();
    expect(player.off).not.toHaveBeenCalled();
  });
});
