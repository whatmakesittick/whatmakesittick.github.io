import { describe, expect, it } from 'vitest';
import { ENGINE_IDS } from '../ids';
import { RUN_LENGTH } from '../model';
import { ENGINES } from '../model/engines';
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

  it('draws the turbopumps, burners and chambers each engine has', () => {
    ENGINE_IDS.forEach((id) => {
      const engine = ENGINES[id];
      const { nodes, shafts } = CYCLE_DIAGRAMS[id];
      const count = (kind: string) => nodes.filter((node) => node.kind === kind).length;
      expect(shafts.length, id).toBe(engine.pumps - engine.boostPumps);
      expect(count('turbine'), id).toBe(shafts.length);
      expect(count('boostPump'), id).toBe(engine.boostPumps);
      expect(count('burner'), id).toBe(engine.burners);
      expect(count('chamber'), id).toBe(engine.chambers);
    });
  });

  it('throws gas overboard exactly where the engine dumps it', () => {
    ENGINE_IDS.forEach((id) => {
      const overboard = CYCLE_DIAGRAMS[id].links.some((link) => link.stream === 'overboard');
      expect(overboard, id).toBe(ENGINES[id].dumps);
    });
  });

  it('burns oxygen-rich gas on the oxygen side of the full-flow engine', () => {
    const streams = CYCLE_DIAGRAMS.raptor.links.map((link) => link.stream);
    expect(streams).toContain('oxygenRichGas');
    expect(streams).toContain('fuelRichGas');
    expect(CYCLE_DIAGRAMS.rs25.links.map((link) => link.stream)).not.toContain('oxygenRichGas');
  });
});
