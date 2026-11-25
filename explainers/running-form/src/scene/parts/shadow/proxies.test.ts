import { describe, expect, it } from 'vitest';
import { gaitAt } from '../../../model/gait';
import { testPose } from '../../assembly.testkit';
import { PROXY_COUNT, proxySegments } from './proxies';

describe('shadow proxies', () => {
  it('emits as many segments as the shader declares', () => {
    const reading = gaitAt(431, { pace: 'steady', stepRate: 0, arms: 'swing' });
    expect(proxySegments(testPose(reading))).toHaveLength(PROXY_COUNT);
  });
});
