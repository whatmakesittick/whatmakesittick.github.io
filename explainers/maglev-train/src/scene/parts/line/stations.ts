import type { Group } from 'three';
import { STATIONS, STATION_IDS, VIEW_AHEAD_M, VIEW_BEHIND_M } from '../../../model';
import type { StationId } from '../../../model';
import { lineX } from '../../pose';
import { groupMesh, label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { boxOver } from './geometry';
import { overlaps } from './slots';

const WINDOW = [-VIEW_BEHIND_M, VIEW_AHEAD_M] as const;
const HALF_LENGTH = STATIONS.platformLength / 2;
const PLATFORM = { edge: 1.95, width: 8, thickness: 0.5 } as const;
const LABEL_HEIGHT = 2;

export interface Stations {
  readonly group: Group;
  place(distance: number): void;
}

function buildStation(context: PartContext, id: StationId): Group {
  const station = namedGroup(`station-${id}`);
  const top = STATIONS.platformFloor;
  [-1, 1].forEach((side) => {
    const inner = side * PLATFORM.edge;
    const outer = side * (PLATFORM.edge + PLATFORM.width);
    const geometry = boxOver(
      [-HALF_LENGTH, HALF_LENGTH],
      [top - PLATFORM.thickness, top],
      [Math.min(inner, outer), Math.max(inner, outer)],
    );
    station.add(groupMesh(context, geometry, 'stations', 'platform'));
  });
  return station;
}

export function buildStations(context: PartContext): Stations {
  const group = namedGroup('stations');
  const built = new Map(STATION_IDS.map((id) => [id, buildStation(context, id)]));
  built.forEach((station) => group.add(station));
  const labelHost = namedGroup('stationLabel');
  label(context, 'stations', labelHost, [0, STATIONS.platformFloor + LABEL_HEIGHT, -PLATFORM.edge]);
  return {
    group,
    place(distance) {
      built.forEach((station, id) => {
        station.position.x = lineX(STATIONS.line[id], distance);
        station.visible = overlaps(station.position.x, HALF_LENGTH, WINDOW);
      });
      const nearest = [...built.values()].reduce((best, station) =>
        Math.abs(station.position.x) < Math.abs(best.position.x) ? station : best,
      );
      if (labelHost.parent !== nearest) nearest.add(labelHost);
    },
  };
}
