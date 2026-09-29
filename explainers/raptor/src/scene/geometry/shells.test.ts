import { describe, expect, it } from 'vitest';
import { closedShell, scaleProfile } from './shells';

describe('shells', () => {
  it('scales a template profile into a canister', () => {
    const scaled = scaleProfile(
      [
        [10, 0],
        [5, -10],
      ],
      { radius: 0.5, from: [0, -10], to: [-20, -40] },
    );
    expect(scaled).toEqual([
      [5, -20],
      [2.5, -40],
    ]);
  });

  it('closes a shell with rims between the surfaces', () => {
    const shell = closedShell(
      [
        [10, 0],
        [10, -10],
      ],
      [
        [8, -10],
        [8, 0],
      ],
    );
    expect(shell.outline).toHaveLength(4);
    expect(shell.outline[2].inner).toBe(true);
  });
});
