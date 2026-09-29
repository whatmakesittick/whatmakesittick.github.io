import { describe, expect, it } from 'vitest';
import { ENGINE_IDS } from '../ids';
import { RUN_LENGTH } from '../model';
import { CYCLE_DIAGRAMS, DIAGRAM_SIZE } from './cycleDiagrams';
import type { DiagramPoint } from './cycleDiagrams';
import {
  launchHeight,
  launchLayout,
  launchSpeed,
  launchThrust,
  xOfPhase,
  yOfShare,
} from './launchView';

const PLOT = { left: 40, right: 330, top: 10, bottom: 110 };

function inside([x, y]: DiagramPoint): boolean {
  return x >= 0 && x <= DIAGRAM_SIZE.width && y >= 0 && y <= DIAGRAM_SIZE.height;
}

describe('launch chart', () => {
  it('spreads the whole run across the plot', () => {
    expect(xOfPhase(PLOT, 0)).toBe(40);
    expect(xOfPhase(PLOT, RUN_LENGTH)).toBe(330);
  });

  it('puts zero on the bottom edge and the full scale on the top', () => {
    expect(yOfShare(PLOT, 0)).toBe(110);
    expect(yOfShare(PLOT, 1)).toBe(10);
  });

  it('stacks the plot above the phase strip and the time labels', () => {
    const { plot, strip, axisBaseline } = launchLayout(640, 280, 40, 50);
    expect(plot.bottom).toBeLessThan(strip.top);
    expect(strip.bottom).toBeLessThan(axisBaseline);
    expect(axisBaseline).toBeLessThan(280);
    expect(plot.right).toBe(590);
  });

  it('plots thrust, height and speed from the flight model', () => {
    expect(launchThrust(3)).toBeCloseTo(250, 0);
    expect(launchThrust(0)).toBe(0);
    expect(launchHeight(143)).toBeCloseTo(52);
    expect(launchSpeed(143)).toBeCloseTo(5800);
  });
});

describe('cycle diagrams', () => {
  it('keeps every box and line of every engine inside the canvas', () => {
    ENGINE_IDS.forEach((id) => {
      const { nodes, links, shafts } = CYCLE_DIAGRAMS[id];
      nodes.forEach((node) => expect(inside(node.centre), `${id} ${node.label}`).toBe(true));
      links.forEach((link) => link.points.forEach((point) => expect(inside(point), id).toBe(true)));
      shafts.flat().forEach((point) => expect(inside(point), id).toBe(true));
    });
  });

  it('draws the pumps, burners and chambers each engine has', () => {
    const count = (id: (typeof ENGINE_IDS)[number], kind: string) =>
      CYCLE_DIAGRAMS[id].nodes.filter((node) => node.kind === kind).length;
    expect(ENGINE_IDS.map((id) => count(id, 'pump') + count(id, 'boostPump'))).toEqual([
      2, 4, 2, 2,
    ]);
    expect(ENGINE_IDS.map((id) => count(id, 'burner'))).toEqual([1, 2, 1, 2]);
    expect(ENGINE_IDS.map((id) => count(id, 'turbine'))).toEqual([1, 2, 1, 2]);
    expect(ENGINE_IDS.map((id) => count(id, 'chamber'))).toEqual([1, 1, 2, 1]);
    expect(ENGINE_IDS.map((id) => CYCLE_DIAGRAMS[id].shafts.length)).toEqual([1, 2, 1, 2]);
  });

  it('throws gas overboard only in the gas generator engine', () => {
    const dumping = ENGINE_IDS.filter((id) =>
      CYCLE_DIAGRAMS[id].links.some((link) => link.stream === 'overboard'),
    );
    expect(dumping).toEqual(['merlin']);
  });

  it('burns oxygen-rich gas on the oxygen side of the full-flow engine', () => {
    const streams = CYCLE_DIAGRAMS.raptor.links.map((link) => link.stream);
    expect(streams).toContain('oxygenRichGas');
    expect(streams).toContain('fuelRichGas');
    expect(CYCLE_DIAGRAMS.rs25.links.map((link) => link.stream)).not.toContain('oxygenRichGas');
  });
});
