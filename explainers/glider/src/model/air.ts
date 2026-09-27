import { GLIDERS, sinkRate, speedForSink } from './polar';
import type { GliderType } from './polar';
import { climbAt, heightAt, windowAverage } from './story';
import type { Leg } from './story';

export interface FlightState {
  height: number;
  airspeed: number;
  lift: number;
  sink: number;
  climb: number;
}

export function legSink(leg: Leg, type: GliderType): number {
  if (leg.kind === 'climb') return sinkRate(type, leg.airspeed);
  return Math.max(leg.air - leg.climb, GLIDERS[type].polar.minSink.sink);
}

export function legLift(leg: Leg, type: GliderType): number {
  return leg.climb + legSink(leg, type);
}

export function flightState(phase: number, type: GliderType): FlightState {
  const climb = climbAt(phase);
  const sink = windowAverage(phase, (leg, from, to) => (to - from) * legSink(leg, type));
  return {
    height: heightAt(phase),
    airspeed: speedForSink(type, sink),
    lift: climb + sink,
    sink,
    climb,
  };
}
