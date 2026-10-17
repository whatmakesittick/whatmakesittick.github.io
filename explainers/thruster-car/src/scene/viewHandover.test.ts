import { describe, expect, it, vi } from 'vitest';
import { MOMENTS } from '../model';
import { HANDOVER_AFTER_S, ViewHandover } from './viewHandover';

const VARIANT = 'portrait';

function handover() {
  const frame = vi.fn();
  return { frame, views: new ViewHandover({ frame }) };
}

describe('thruster car view handover', () => {
  it('frames the requested view while the car stands at the start', () => {
    const { frame, views } = handover();
    views.setPhase(HANDOVER_AFTER_S);
    views.frame('tankClose', false, VARIANT);
    expect(frame).toHaveBeenLastCalledWith('tankClose', false, VARIANT);
  });

  it('hands the tank close-up to the boost side view once the sprint starts', () => {
    const { frame, views } = handover();
    views.frame('tankClose', false);
    views.setPhase(MOMENTS.held);
    expect(frame).toHaveBeenLastCalledWith('boostSide', true, undefined);
    views.setPhase(MOMENTS.leavesRamp);
    expect(frame).toHaveBeenCalledTimes(2);
  });

  it('comes back to the tank close-up when the run is rewound to the start', () => {
    const { frame, views } = handover();
    views.frame('tankClose', false);
    views.setPhase(MOMENTS.sixty);
    views.setPhase(HANDOVER_AFTER_S);
    expect(frame).toHaveBeenLastCalledWith('tankClose', true, undefined);
  });

  it('frames a moving run from the tank chapter on the boost side straight away', () => {
    const { frame, views } = handover();
    views.setPhase(MOMENTS.inverted);
    views.frame('tankClose', true);
    expect(frame).toHaveBeenLastCalledWith('boostSide', true, undefined);
  });

  it('leaves every other view alone through the run', () => {
    const { frame, views } = handover();
    views.frame('rampWide', false);
    views.setPhase(MOMENTS.held);
    expect(frame).toHaveBeenCalledTimes(1);
    expect(frame).toHaveBeenLastCalledWith('rampWide', false, undefined);
  });
});
