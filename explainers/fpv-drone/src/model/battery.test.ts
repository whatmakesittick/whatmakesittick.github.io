import { describe, expect, it } from 'vitest';
import {
  BATTERY,
  BATTERY_GRID_S,
  batteryAt,
  loadedVolts,
  openCircuitVolts,
  usedMahAt,
  wattsAt,
} from './battery';
import { MASS_G } from './figures';
import { flightAt } from './flight';
import { allUpG } from './payload';
import { cruisePowerW, hoverPowerW } from './power';
import { SORTIE_SECONDS } from './sortie';

const PAYLOAD = MASS_G.defaultPayload;

describe('battery', () => {
  it('is a 6S Li-ion pack with the sheet figures', () => {
    expect(BATTERY.cells).toBe(6);
    expect(BATTERY.nominalVolts).toBeCloseTo(21.6, 9);
    expect(BATTERY.fullVolts).toBeCloseTo(25.2, 9);
    expect(BATTERY.emptyVolts).toBe(18);
    expect(BATTERY.capacityMah).toBe(4200);
    expect(BATTERY.resistanceOhm).toBe(0.06);
    expect(BATTERY_GRID_S).toBe(0.5);
  });

  it('sags under load and rests at the open circuit voltage', () => {
    expect(openCircuitVolts(1)).toBeCloseTo(BATTERY.fullVolts, 9);
    expect(openCircuitVolts(0)).toBe(BATTERY.emptyVolts);
    expect(loadedVolts(25.2, 0)).toBeCloseTo(25.2, 9);
    const sagged = loadedVolts(25.2, 400);
    expect(sagged).toBeLessThan(25.2);
    expect(sagged).toBeGreaterThan(24);
    expect((400 / sagged) * BATTERY.resistanceOhm).toBeCloseTo(25.2 - sagged, 6);
  });

  it('draws the hover power at rest and a little less in cruise at the default load', () => {
    const hover = wattsAt(flightAt(5), PAYLOAD);
    expect(hover).toBeCloseTo(hoverPowerW(allUpG(PAYLOAD)), 6);
    const cruise = wattsAt(flightAt(20), PAYLOAD);
    expect(cruise).toBeCloseTo(cruisePowerW(allUpG(PAYLOAD)), 1);
    expect(cruise).toBeLessThan(hover);
    expect(wattsAt(flightAt(SORTIE_SECONDS), PAYLOAD)).toBe(0);
  });

  it('starts full and only ever drains', () => {
    expect(batteryAt(0, PAYLOAD)).toMatchObject({ share: 1, usedMah: 0 });
    expect(batteryAt(0, PAYLOAD).volts).toBeCloseTo(BATTERY.fullVolts, 9);
    let previous = 0;
    for (let seconds = 0; seconds <= SORTIE_SECONDS; seconds += 0.25) {
      const used = usedMahAt(seconds, PAYLOAD);
      expect(used).toBeGreaterThanOrEqual(previous);
      previous = used;
    }
  });

  it('lands the short sortie with most of the pack left', () => {
    const { share, volts, amps } = batteryAt(SORTIE_SECONDS, PAYLOAD);
    expect(share).toBeGreaterThan(0.85);
    expect(share).toBeLessThan(0.93);
    expect(volts).toBeLessThan(BATTERY.fullVolts);
    expect(amps).toBe(0);
    expect(batteryAt(40, PAYLOAD).amps).toBeGreaterThan(5);
    expect(batteryAt(40, PAYLOAD).amps).toBeLessThan(30);
  });

  it('uses more with a heavier payload and reuses its integration', () => {
    const heavy = batteryAt(SORTIE_SECONDS, 1500);
    expect(heavy.share).toBeLessThan(batteryAt(SORTIE_SECONDS, PAYLOAD).share);
    expect(batteryAt(30, 1500).usedMah).toBe(batteryAt(30, 1500).usedMah);
  });
});
