import { beforeAll, describe, expect, it } from 'vitest';
import { toRadians } from '@core/math';
import { initI18n } from '@core/i18n';
import en from '../../locales/en.json';
import { SEA_STATE_IDS } from '../ids';
import {
  clockText,
  describePhase,
  describeSpeed,
  formatBoatOrBacking,
  formatBoatSpeed,
  formatCameraHorizon,
  formatCanvasKm,
  formatCarries,
  formatCost,
  formatDegrees,
  formatDelay,
  formatDetection,
  formatDistance,
  formatEfficiency,
  formatFlow,
  formatHidden,
  formatHullRatio,
  formatJetSpeed,
  formatKm,
  formatLift,
  formatLinkBoat,
  formatLinkCarrier,
  formatLinkNow,
  formatLinkTop,
  formatMetres,
  formatMinutes,
  formatMode,
  formatPercent,
  formatPhase,
  formatPush,
  formatShipValue,
  formatSpeed,
  formatThrust,
  formatWaves,
  formatWetted,
  shownKnots,
} from './format';
import { fill, isFilled } from './testing';

const { units, timeline, hull, jet, link, horizon, fleet } = en;

describe('naval drone formatting', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('shows the run clock as minutes and seconds of model time', () => {
    expect(clockText(0)).toBe('0:00');
    expect(clockText(65.9)).toBe('1:05');
    expect(clockText(120)).toBe('2:00');
    expect(formatPhase(65)).toBe(fill(timeline.clock, { clock: '1:05' }));
  });

  it('describes the scrubber with what happens in each phase', () => {
    expect(describePhase(100)).toBe(
      fill(timeline.value, { time: formatPhase(100), phase: timeline.during.sprint }),
    );
    expect(describePhase(120)).toContain(timeline.during.arrival);
  });

  it('names the playback factor', () => {
    expect(formatSpeed(0.25)).toBe(fill(timeline.speedFormat, { factor: '0.25' }));
    expect(describeSpeed()).toBe(timeline.speedValue);
  });

  it('shows knots in tenths below 10 and whole above, with km/h', () => {
    expect(formatBoatSpeed(5.7)).toBe(fill(units.speed, { kn: '5.7', kmh: '11' }));
    expect(formatBoatSpeed(22)).toBe(fill(units.speed, { kn: '22', kmh: '41' }));
    expect(formatBoatSpeed(42)).toBe(fill(units.speed, { kn: '42', kmh: '78' }));
    expect(formatBoatSpeed(9.97)).toBe(fill(units.speed, { kn: '10', kmh: '19' }));
    expect(formatBoatSpeed(11)).toBe(fill(units.speed, { kn: '11', kmh: '20' }));
  });

  it('pairs the km/h with the knots it shows', () => {
    expect(shownKnots(9.94)).toBe(9.9);
    expect(shownKnots(21.6)).toBe(22);
    expect(formatBoatSpeed(21.6)).toBe(formatBoatSpeed(22));
  });

  it('names the hull mode', () => {
    expect(formatMode('planing')).toBe(en.mode.planing);
  });

  it('shows the distance to the ship in tens of metres, in km from 1,000 m', () => {
    expect(formatDistance(1458.8)).toBe(fill(units.km, { value: '1.5' }));
    expect(formatDistance(518.4)).toBe(fill(units.m, { value: '520' }));
    expect(formatDistance(997)).toBe(fill(units.km, { value: '1.0' }));
    expect(formatDistance(0)).toBe(fill(units.m, { value: '0' }));
  });

  it('shows percents, trim and the lift split in whole numbers that add up', () => {
    expect(formatPercent(0.694)).toBe(fill(units.percent, { value: '69' }));
    expect(formatDegrees(toRadians(6))).toBe(fill(units.degrees, { value: '6.0' }));
    expect(formatLift(0.364)).toBe(fill(hull.lift, { dynamic: '36', buoyant: '64' }));
  });

  it('compares the wetted length with the length at rest', () => {
    expect(formatWetted(1.7)).toBe(fill(hull.wetted, { m: '1.7', rest: '5.1' }));
  });

  it('compares the speed with the 5.7 kn hull speed, or says the boat stands still', () => {
    expect(formatHullRatio(11)).toBe(fill(hull.ratio, { times: '1.9', hullSpeed: '5.7' }));
    expect(formatHullRatio(42)).toBe(fill(hull.ratio, { times: '7.4', hullSpeed: '5.7' }));
    expect(formatHullRatio(0)).toBe(fill(hull.ratioStill, { hullSpeed: '5.7' }));
  });

  it('reads the pump in kg and litres a second, m/s and kN, or says it backs', () => {
    expect(formatFlow(212.7)).toBe(fill(jet.flow, { kg: '213', litres: '208' }));
    expect(formatJetSpeed(32.4)).toBe(fill(units.mps, { ms: '32', kmh: '117' }));
    expect(formatThrust(2300, 'straight')).toBe(fill(units.kilonewtons, { value: '2.30' }));
    expect(formatThrust(2300, 'reverse')).toBe(jet.astern);
    expect(formatBoatOrBacking(0, 'reverse')).toBe(jet.backing);
    expect(formatBoatOrBacking(22, 'left')).toBe(formatBoatSpeed(22));
    expect(formatEfficiency(0.8, 42)).toBe(fill(units.percent, { value: '80' }));
    expect(formatEfficiency(0, 0)).toBe(jet.noEfficiency);
  });

  it('says where the nozzle pushes the stern', () => {
    expect(formatPush('left', -toRadians(27))).toBe(fill(jet.push.left, { angle: '27' }));
    expect(formatPush('right', toRadians(27))).toBe(fill(jet.push.right, { angle: '27' }));
    expect(formatPush('straight', -toRadians(8))).toBe(fill(jet.push.left, { angle: '8' }));
    expect(formatPush('straight', 0)).toBe(jet.push.straight);
    expect(formatPush('reverse', 0)).toBe(jet.push.reverse);
  });

  it('turns the video delay into metres now and at top speed', () => {
    expect(formatDelay(250)).toBe(fill(units.ms, { value: '250' }));
    expect(formatLinkNow('satellite', 250, 22)).toBe(fill(link.now, { m: '2.8', kn: '22' }));
    expect(formatLinkNow('lost', 250, 22)).toBe(link.nowLost);
    expect(formatLinkTop(250)).toBe(fill(link.top, { m: '5.4', lengths: '1.0' }));
    expect(formatLinkCarrier('backup')).toBe(link.carrier.backup);
    expect(formatLinkBoat('lost')).toBe(link.boat.lost);
  });

  it('reads the horizons, the detection range and the waves', () => {
    expect(formatMetres(20)).toBe(fill(units.m, { value: '20' }));
    expect(formatKm(21.34)).toBe(fill(units.km, { value: '21.3' }));
    expect(formatMinutes(16.46)).toBe(fill(units.minutes, { value: '16.5' }));
    expect(formatCameraHorizon()).toBe(fill(horizon.camera, { km: '3.2', m: '0.7' }));
    expect(formatDetection('moderate')).toBe(fill(horizon.detect, { km: '9.3', min: '7.1' }));
    expect(formatDetection('rough')).toBe(horizon.detectBeyond);
    expect(formatWaves('slight')).toBe(fill(horizon.waves.slight, { from: '0.5', to: '1.25' }));
    expect(formatCanvasKm(30)).toBe(fill(horizon.canvas.km, { value: '30' }));
    SEA_STATE_IDS.forEach((sea) => {
      expect(isFilled(formatWaves(sea)), sea).toBe(true);
      expect(formatHidden(sea)).toBe(horizon.hidden[sea]);
    });
  });

  it('quotes the payload, the cost and the ship value', () => {
    expect(formatCarries('standard')).toBe(fill(fleet.carries.standard, { kg: '320' }));
    expect(formatCarries('missile')).toBe(fleet.carries.missile);
    expect(formatCost()).toBe(fill(fleet.cost, { from: '250,000', to: '273,000' }));
    expect(formatShipValue()).toBe(fill(fleet.ship, { value: '65' }));
  });
});
