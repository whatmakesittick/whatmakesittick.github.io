import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { CustomView, FramedView } from '@core/scene/cameraViews';
import type { RegionId } from '../ids';
import { PRESETS } from '../state';
import { CLOSE_DISTANCE, SKY_DISTANCE, WIDE_DISTANCE, cameraViews } from './cameraViews';

const WIDE_SLOPES = { vertical: 0.29, horizontal: 0.52 };
const ARRAY = new Box3(new Vector3(-175, 0, -110), new Vector3(175, 120, 60));

describe('camera views', () => {
  it('offers every view the chapters ask for', () => {
    const views = cameraViews(() => null);
    Object.values(PRESETS).forEach((preset) => expect(views[preset.camera]).toBeDefined());
  });

  it('lets the roof and sky views zoom out further than the close views', () => {
    const views = cameraViews(() => null);
    expect(views.roof.distance).toEqual(WIDE_DISTANCE);
    expect(views.sky.distance).toEqual(SKY_DISTANCE);
    (['stack', 'cell', 'strings', 'inverter'] as const).forEach((id) =>
      expect(views[id].distance, id).toEqual(CLOSE_DISTANCE),
    );
  });

  it('frames the panel along its face for the strings', () => {
    const strings = cameraViews(() => null).strings as FramedView<RegionId>;
    expect(strings).toMatchObject({ region: 'panel', direction: [0.15, 0.82, 0.57] });
  });

  it('leaves the camera alone until the array exists', () => {
    const sky = cameraViews(() => null).sky as CustomView;
    expect(sky.pose(WIDE_SLOPES)).toBeNull();
  });

  it('looks south from north of the array with the whole sun arc in view', () => {
    const sky = cameraViews((id) => (id === 'array' ? ARRAY : null)).sky as CustomView;
    const pose = sky.pose(WIDE_SLOPES);
    expect(pose).not.toBeNull();
    if (!pose) return;
    expect(pose.position.z).toBeLessThan(ARRAY.min.z);
    expect(pose.target.z).toBeGreaterThan(pose.position.z);
    expect(pose.target.y).toBeGreaterThan(ARRAY.max.y);
    expect(pose.position.distanceTo(pose.target)).toBeLessThanOrEqual(SKY_DISTANCE.max);
  });
});
