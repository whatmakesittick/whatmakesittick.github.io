import { describe, expect, it } from 'vitest';
import { DIESEL, PETROL } from '../model';
import { SPARK } from './constants';
import { SparkTrigger } from './sparkTrigger';

const FRAME_SECONDS = 1 / 60;
const BEFORE_SPARK = 340;
const AFTER_SPARK = 360;

describe('SparkTrigger', () => {
  it('stays lit through the hold after the crank passes the spark', () => {
    const trigger = new SparkTrigger();
    trigger.update(AFTER_SPARK, AFTER_SPARK - BEFORE_SPARK, FRAME_SECONDS, PETROL);
    expect(trigger.lit).toBe(true);
    trigger.update(AFTER_SPARK, 0, SPARK.holdSeconds, PETROL);
    expect(trigger.lit).toBe(false);
  });

  it('never lights in a diesel', () => {
    const trigger = new SparkTrigger();
    trigger.update(AFTER_SPARK, AFTER_SPARK - BEFORE_SPARK, FRAME_SECONDS, DIESEL);
    expect(trigger.lit).toBe(false);
  });
});
