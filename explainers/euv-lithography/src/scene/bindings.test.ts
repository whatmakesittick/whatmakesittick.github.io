import { describe, expect, it } from 'vitest';
import { PRESET_IDS } from '../ids';
import { DEFAULT_VIEW, PRESETS } from '../state';
import { cameraFor } from './bindings';
import { CHASE_VIEW } from './cameraViews';

describe('euv scene bindings', () => {
  it('uses the chapter camera unless the reader follows the flash', () => {
    PRESET_IDS.forEach((preset) => {
      expect(cameraFor({ preset, view: DEFAULT_VIEW }), preset).toBe(PRESETS[preset].camera);
      expect(cameraFor({ preset, view: { ...DEFAULT_VIEW, follow: true } }), preset).toBe(
        CHASE_VIEW,
      );
    });
  });
});
