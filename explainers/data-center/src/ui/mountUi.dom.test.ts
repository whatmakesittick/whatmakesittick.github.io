import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mountActions } from '@core/ui/actions';
import { MOMENT_IDS } from '../ids';
import { MOMENTS } from '../model';
import { createDataCenterStore } from '../state';
import type { DataCenterStore } from '../state';
import { CHAPTER_ACTIONS } from './actions';
import { CHAPTER_MARKUP, TEST_LOCALE, fill, initTestLocale, isFilled } from './testing';
import { mountDataCenterUi } from '.';

const { units, chapters, readouts } = TEST_LOCALE;
const { building, powerIn, rack, network, heatOut, compare } = chapters;
const READOUT_COUNT = 33;
const LIVE_READOUTS = [
  'hallIt',
  'facility',
  'rackKw',
  'fans',
  'rise',
  'cmpRack',
  'airNeeded',
  'homes',
  'chargers',
];

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

function click(action: string, value: string): void {
  document.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`)?.click();
}

function pressed(action: string, value: string): (string | null)[] {
  return [...document.querySelectorAll(`[data-action="${action}"][data-value="${value}"]`)].map(
    (chip) => chip.getAttribute('aria-pressed'),
  );
}

function readoutTexts(): (string | null)[] {
  return [...document.querySelectorAll('[data-readout]')].map((node) => node.textContent);
}

function liveTexts(): (string | null | undefined)[] {
  return LIVE_READOUTS.map(readout);
}

describe('chapter widgets', () => {
  let store: DataCenterStore;
  let dispose: () => void;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = CHAPTER_MARKUP;
    store = createDataCenterStore({ playing: false, phase: 0 });
    dispose = mountDataCenterUi(document, store);
    mountActions(document, store, CHAPTER_ACTIONS);
  });

  afterEach(() => dispose());

  it('fills every readout with a finished text', () => {
    const texts = readoutTexts();
    expect(texts).toHaveLength(READOUT_COUNT);
    texts.forEach((text) => expect(isFilled(text), text ?? '').toBe(true));
  });

  it('shows the fixed numbers of the site, the power chain, the rack and the network', () => {
    expect(readout('racks')).toBe(fill(building.racksValue, { racks: '192', rows: '16' }));
    expect(readout('world')).toBe(
      fill(building.worldValue, { twh: '415', percent: '1.5', year: '2024' }),
    );
    expect(readout('chain')).toBe(powerIn.chainValue);
    expect(readout('takeover')).toBe(
      fill(powerIn.takeoverValue, { code: '10', min: '10', max: '60' }),
    );
    expect(readout('rideThrough')).toBe(fill(powerIn.rideThroughValue, { min: '5', max: '15' }));
    expect(readout('genset')).toBe(fill(powerIn.gensetValue, { mw: '1.8', tonnes: '17' }));
    expect(readout('fuel')).toBe(fill(powerIn.fuelValue, { litres: '466' }));
    expect(readout('outages')).toBe(fill(powerIn.outagesValue, { percent: '45', year: '2025' }));
    expect(readout('chips')).toBe(fill(rack.chipsValue, { gpus: '72', cpus: '36' }));
    expect(readout('trays')).toBe(fill(rack.traysValue, { compute: '18', switch: '9' }));
    expect(readout('busbar')).toBe(fill(rack.busbarValue, { amps: '1,400', volts: '50' }));
    expect(readout('weight')).toBe(fill(rack.weightValue, { tonnes: '1.4' }));
    expect(readout('lost')).toBe(rack.lostValue);
    expect(readout('nvlink')).toBe(fill(network.nvlinkValue, { gpu: '1.8', rack: '130' }));
    expect(readout('switch')).toBe(fill(network.switchValue, { ns: '700' }));
    expect(readout('fibre')).toBe(fill(network.fibreValue, { us: '4.9' }));
    expect(readout('hall')).toBe(fill(network.hallValue, { us: '2.6' }));
  });

  it('shows the fixed numbers of the heat plant and the water', () => {
    expect(readout('facilityWater')).toBe(
      fill(heatOut.facilityWaterValue, { celsius: '20', approach: '5' }),
    );
    expect(readout('cdu')).toBe(fill(heatOut.cduValue, { mw: '2', area: '1.2' }));
    expect(readout('wue')).toBe(fill(heatOut.wueValue, { litres: '0.36' }));
    expect(readout('usWater')).toBe(fill(heatOut.usWaterValue, { billion: '66' }));
  });

  it('starts with a liquid hall at full load and the industry average PUE', () => {
    expect(readout('hallIt')).toBe(fill(units.mw, { value: '23.0' }));
    expect(readout('facility')).toBe(fill(building.facilityValue, { mw: '35.5', pue: '1.54' }));
    expect(readout('rackKw')).toBe(fill(units.kw, { value: '120' }));
    expect(readout('fans')).toBe(rack.fansValue.liquidFull);
    expect(readout('rise')).toBe(
      fill(heatOut.riseValue, { kelvin: '20', medium: units.medium.water }),
    );
    expect(readout('roundTrip')).toBe(fill(network.roundTripValue, { ms: '9.8' }));
    expect(readout('cmpRack')).toBe(fill(units.kw, { value: '120' }));
    expect(readout('airNeeded')).toBe(fill(units.m3h, { value: '32,640' }));
    expect(readout('homes')).toBe(fill(compare.homesValue, { us: '97', eu: '270' }));
    expect(readout('chargers')).toBe(fill(compare.chargersValue, { count: '3,000' }));
    expect(readout('cmpPue')).toBe(
      fill(units.pueOf, { value: '1.54', site: readouts.pueSite.average }),
    );
    expect(readout('overhead')).toBe(fill(compare.overheadValue, { percent: '35' }));
  });

  it('idles the rack and the hall, but keeps the full-load comparison', () => {
    click('load', 'idle');
    expect(store.getState().load).toBe('idle');
    expect(pressed('load', 'idle')).toEqual(['true']);
    expect(pressed('load', 'full')).toEqual(['false']);
    expect(readout('hallIt')).toBe(fill(units.mw, { value: '6.9' }));
    expect(readout('facility')).toBe(fill(building.facilityValue, { mw: '10.6', pue: '1.54' }));
    expect(readout('rackKw')).toBe(fill(units.kw, { value: '36' }));
    expect(readout('fans')).toBe(rack.fansValue.liquidIdle);
    expect(readout('rise')).toBe(
      fill(heatOut.riseValue, { kelvin: '6', medium: units.medium.water }),
    );
    expect(readout('cmpRack')).toBe(fill(units.kw, { value: '120' }));
    expect(readout('homes')).toBe(fill(compare.homesValue, { us: '97', eu: '270' }));
  });

  it('swaps every cooling chip and every live figure to the air hall', () => {
    const liquid = liveTexts();
    click('cooling', 'air');
    expect(store.getState().cooling).toBe('air');
    expect(pressed('cooling', 'air')).toEqual(['true', 'true']);
    expect(pressed('cooling', 'liquid')).toEqual(['false', 'false']);
    liveTexts().forEach((text, index) =>
      expect(text, LIVE_READOUTS[index]).not.toBe(liquid[index]),
    );
    expect(readout('hallIt')).toBe(fill(units.mw, { value: '1.9' }));
    expect(readout('rackKw')).toBe(fill(units.kw, { value: '10' }));
    expect(readout('fans')).toBe(rack.fansValue.airFull);
    expect(readout('rise')).toBe(
      fill(heatOut.riseValue, { kelvin: '11', medium: units.medium.air }),
    );
    expect(readout('cmpRack')).toBe(fill(units.kw, { value: '10' }));
    expect(readout('airNeeded')).toBe(fill(units.m3h, { value: '2,720' }));
    expect(readout('homes')).toBe(fill(compare.homesValue, { us: '8', eu: '22' }));
    expect(readout('chargers')).toBe(fill(compare.chargersValue, { count: '250' }));
    click('load', 'idle');
    expect(readout('fans')).toBe(rack.fansValue.airIdle);
    expect(readout('rise')).toBe(
      fill(heatOut.riseValue, { kelvin: '7', medium: units.medium.air }),
    );
  });

  it('compares the best fleet with the industry average', () => {
    click('benchmark', 'best');
    expect(store.getState().benchmark).toBe('best');
    expect(pressed('benchmark', 'best')).toEqual(['true']);
    expect(pressed('benchmark', 'average')).toEqual(['false']);
    expect(readout('cmpPue')).toBe(
      fill(units.pueOf, { value: '1.09', site: readouts.pueSite.best }),
    );
    expect(readout('overhead')).toBe(fill(compare.overheadValue, { percent: '8' }));
    click('benchmark', 'average');
    expect(readout('overhead')).toBe(fill(compare.overheadValue, { percent: '35' }));
  });

  it('times the round trip to a city 100 km or 1,000 km away', () => {
    expect(pressed('distance', 'km1000')).toEqual(['true']);
    click('distance', 'km100');
    expect(store.getState().distance).toBe('km100');
    expect(pressed('distance', 'km100')).toEqual(['true']);
    expect(pressed('distance', 'km1000')).toEqual(['false']);
    expect(readout('roundTrip')).toBe(fill(network.roundTripValue, { ms: '0.98' }));
  });

  it('runs the outage drill from its chip without leaving it pressed', () => {
    click('outage', 'cut');
    expect(store.getState().outageToken).toBe(1);
    expect(pressed('outage', 'cut')).toEqual(['false']);
    click('outage', 'cut');
    expect(store.getState().outageToken).toBe(2);
  });

  it('seeks to each moment chip, pauses there and marks only that chip', () => {
    const chips = [...document.querySelectorAll<HTMLElement>('[data-action="moment"]')];
    expect(chips.map((chip) => chip.dataset.value)).toEqual([...MOMENT_IDS]);
    store.getState().play();
    MOMENT_IDS.forEach((moment) => {
      click('moment', moment);
      expect(store.getState()).toMatchObject({ phase: MOMENTS[moment], playing: false });
      MOMENT_IDS.forEach((other) =>
        expect(pressed('moment', other), other).toEqual([String(other === moment)]),
      );
    });
    store.getState().play();
    MOMENT_IDS.forEach((moment) => expect(pressed('moment', moment)).toEqual(['false']));
  });
});
