import { beforeAll, describe, expect, it } from 'vitest';
import { MACHINE_IDS } from '../ids';
import type { MachineId } from '../ids';
import { createEuvStore } from '../state';
import type { EuvStoreState } from '../state';
import { COMPARE_READOUTS } from './compareReadouts';
import { LIGHT_READOUTS } from './lightReadouts';
import { MACHINE_READOUTS } from './machineReadouts';
import { MASK_READOUTS } from './maskReadouts';
import { MIRRORS_READOUTS } from './mirrorsReadouts';
import { SCAN_READOUTS } from './scanReadouts';
import { TEST_LOCALE, fill, initTestLocale, isFilled } from './testing';

const { chapters, units, readouts } = TEST_LOCALE;
const ALL_READOUTS = {
  ...MACHINE_READOUTS,
  ...LIGHT_READOUTS,
  ...MIRRORS_READOUTS,
  ...MASK_READOUTS,
  ...SCAN_READOUTS,
  ...COMPARE_READOUTS,
};
const MACHINE_DEPENDENT = [
  'tilt',
  'reduction',
  'perWafer',
  'perField',
  'slit',
  'overlay',
  'wph',
  'shrink',
  'field',
  'line',
];

function stateOf(machine: MachineId): EuvStoreState {
  return createEuvStore({ machine, playing: false }).getState();
}

function text(id: string, machine: MachineId): string {
  return ALL_READOUTS[id](stateOf(machine));
}

describe('chapter readouts', () => {
  beforeAll(() => initTestLocale());

  it('fills every readout for every machine', () => {
    MACHINE_IDS.forEach((machine) =>
      Object.keys(ALL_READOUTS).forEach((id) =>
        expect(isFilled(text(id, machine)), `${machine} ${id}`).toBe(true),
      ),
    );
  });

  it('keeps the fixed facts of the machine, the light and the mirrors', () => {
    expect(text('weight', 'nxe3600d')).toBe(fill(chapters.machine.weightValue, { tonnes: '150' }));
    expect(text('shipping', 'nxe3600d')).toBe(
      fill(chapters.machine.shippingValue, { crates: '250', containers: '43', trucks: '20' }),
    );
    expect(text('droplet', 'nxe3600d')).toBe(
      fill(chapters.light.dropletValue, { low: '20', high: '30' }),
    );
    expect(text('spacing', 'nxe3600d')).toBe(
      fill(chapters.light.spacingValue, { low: '1.2', high: '2.4' }),
    );
    expect(text('pulses', 'nxe3600d')).toBe(fill(chapters.light.pulsesValue, { count: '100,000' }));
    expect(text('plasma', 'nxe3600d')).toBe(
      fill(chapters.light.plasmaValue, { celsius: '220,000', low: '30', high: '40' }),
    );
    expect(text('vacuum', 'nxe3600d')).toBe(
      fill(chapters.mirrors.vacuumValue, { air: '0.14', glass: '0.004' }),
    );
    expect(text('plate', 'nxe3600d')).toBe(fill(chapters.mask.plateValue, { mm: '152' }));
    expect(text('area', 'nxe3600d')).toBe(fill(chapters.mask.areaValue, { w: '104', h: '132' }));
    expect(text('pellicle', 'nxe3600d')).toBe(
      fill(chapters.mask.pellicleValue, { percent: '90', both: '81' }),
    );
  });

  it('follows the machine in the mask, scan and compare chapters', () => {
    expect(text('tilt', 'nxe3600d')).toBe(fill(chapters.mask.tiltValue, { deg: '6', apart: '12' }));
    expect(text('tilt', 'exe5000')).toBe(
      fill(chapters.mask.tiltValue, { deg: '5.4', apart: '10.8' }),
    );
    expect(text('reduction', 'nxe3600d')).toBe(chapters.compare.shrinkValue.na033);
    expect(text('reduction', 'exe5000')).toBe(chapters.compare.shrinkValue.na055);
    expect(text('perWafer', 'nxe3600d')).toBe(fill(chapters.scan.perWaferValue, { seconds: '23' }));
    expect(text('perWafer', 'nxe3800e')).toBe(fill(chapters.scan.perWaferValue, { seconds: '16' }));
    expect(text('perField', 'nxe3600d')).toBe(
      fill(chapters.scan.perFieldValue, { seconds: '0.29' }),
    );
    expect(text('perField', 'nxe3800e')).toBe(
      fill(chapters.scan.perFieldValue, { seconds: '0.21' }),
    );
    expect(text('perField', 'exe5000')).toBe(
      fill(chapters.scan.perFieldValue, { seconds: '0.15' }),
    );
    expect(text('slit', 'nxe3600d')).toBe(fill(chapters.scan.slitValue, { w: '26', h: '2' }));
    expect(text('slit', 'exe5000')).toBe(fill(chapters.scan.slitValue, { w: '26', h: '1.6' }));
    expect(text('overlay', 'nxe3600d')).toBe(fill(chapters.scan.overlayValue, { nm: '1.1' }));
    expect(text('overlay', 'nxe3800e')).toBe(fill(chapters.scan.overlayValue, { nm: '0.9' }));
    expect(text('overlay', 'exe5000')).toBe(fill(chapters.scan.overlayValue, { nm: '1.1' }));
    expect(text('wph', 'nxe3600d')).toBe(fill(units.perHour, { value: '160' }));
    expect(text('wph', 'exe5000')).toBe(fill(readouts.wph.about, { value: '150' }));
    expect(text('shrink', 'nxe3800e')).toBe(chapters.compare.shrinkValue.na033);
    expect(text('shrink', 'exe5000')).toBe(chapters.compare.shrinkValue.na055);
    expect(text('field', 'exe5000')).toBe(
      fill(chapters.compare.fieldValue, { w: '26', h: '16.5' }),
    );
    expect(text('line', 'nxe3600d')).toBe(
      fill(chapters.compare.lineValue, { width: '13', gap: '13' }),
    );
    expect(text('line', 'exe5000')).toBe(
      fill(chapters.compare.lineValue, { width: '8', gap: '8' }),
    );
  });

  it('changes the machine-dependent readouts between the two optics', () => {
    ['tilt', 'slit', 'shrink', 'field', 'line', 'perField'].forEach((id) =>
      expect(text(id, 'nxe3600d'), id).not.toBe(text(id, 'exe5000')),
    );
    expect(MACHINE_DEPENDENT.every((id) => id in ALL_READOUTS)).toBe(true);
  });

  it('quotes the price and the photon', () => {
    expect(text('price', 'nxe3600d')).toBe(chapters.compare.priceValue);
    expect(text('photon', 'nxe3600d')).toBe(
      fill(chapters.compare.photonValue, { ev: '91.8', times: '14' }),
    );
  });
});
