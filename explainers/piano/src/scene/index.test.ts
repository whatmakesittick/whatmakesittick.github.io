import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { regionFromSpec } from '@core/scene/regions';
import { CAMERA_VIEW_IDS, REGISTER_IDS } from '../ids';
import { NOTES, regionSpecFor } from '../model';
import { CAMERA_VIEWS } from './cameraViews';
import { GROUND_Y } from './controller';
import { SCENE_OPTIONS } from './index';

const PLAIN = { ghost: false, inset: false };

describe('piano scene options', () => {
  it('lets every view aim at its region without the floor margin lifting the target', () => {
    const margin = SCENE_OPTIONS.camera?.floorMargin ?? Number.POSITIVE_INFINITY;
    CAMERA_VIEW_IDS.forEach((view) =>
      REGISTER_IDS.forEach((register) => {
        const spec = regionSpecFor(CAMERA_VIEWS[view].region, NOTES[register].key, PLAIN);
        const centre = regionFromSpec(spec).getCenter(new Vector3());
        expect(centre.y, `${view} ${register}`).toBeGreaterThan(GROUND_Y + margin);
      }),
    );
  });
});
