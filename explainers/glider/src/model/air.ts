import { sinkRate, speedForSink } from './polar';
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
  return leg.kind === 'climb' ? sinkRate(type, leg.airspeed) : leg.air - leg.climb;
}

export function legLift(leg: Leg, type: GliderType): number {
  return leg.kind === 'climb' ? leg.climb + sinkRate(type, leg.airspeed) : leg.air;
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
