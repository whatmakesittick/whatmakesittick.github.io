import type { BufferGeometry, Group } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { STATIONS, STATION_IDS, VIEW_AHEAD_M, VIEW_BEHIND_M } from '../../../../model';
import type { StationId } from '../../../../model';
import { FINISHES } from '../../../finishes';
import { lineX } from '../../../pose';
import { finishMesh, label, namedGroup } from '../../context';
import type { PartContext } from '../../context';
import { mergeParts } from '../geometry';
import { overlaps } from '../slots';
import { stationBuildings } from './buildings';
import { canopyColumns, canopyEdges, canopyFrame, glazing, lightStrips } from './canopy';
import { HALF_LENGTH, LABEL_POINT, STATION_FINISHES, STATION_STYLES } from './constants';
import {
  benches,
  platformFloor,
  platformNosing,
  platformStructure,
  screenFrame,
  screenGlass,
  signBands,
  signBoards,
  tactileStrips,
} from './platforms';

const WINDOW = [-VIEW_BEHIND_M, VIEW_AHEAD_M] as const;
const STATION_GROUP = 'stations';

export interface Stations {
  readonly group: Group;
  place(distance: number): void;
}

function buildStation(context: PartContext, id: StationId, concrete: MaterialFinish): Group {
  const station = namedGroup(`station-${id}`);
  const buildings = stationBuildings(STATION_STYLES[id]);
  const pieces: readonly (readonly [BufferGeometry[], MaterialFinish])[] = [
    [[platformStructure(), ...buildings.concrete], concrete],
    [[platformFloor()], FINISHES.platform],
    [[platformNosing(), signBoards()], STATION_FINISHES.nosing],
    [[tactileStrips()], STATION_FINISHES.tactile],
    [[screenGlass(), ...buildings.glass], FINISHES.glass],
    [[screenFrame()], STATION_FINISHES.trim],
    [[canopyEdges()], FINISHES.canopy],
    [[glazing()], STATION_FINISHES.glazing],
    [[canopyFrame(), canopyColumns(), benches(), ...buildings.paint], STATION_FINISHES.paint],
    [buildings.facade, STATION_FINISHES.facade],
    [[lightStrips(), signBands()], STATION_FINISHES.lamp],
  ];
  pieces.forEach(([parts, finish]) => {
    const mesh = finishMesh(context, mergeParts(parts), STATION_GROUP, finish);
    mesh.name = STATION_GROUP;
    station.add(mesh);
  });
  return station;
}

function nearest(stations: readonly Group[]): Group {
  return stations.reduce((best, station) =>
    Math.abs(station.position.x) < Math.abs(best.position.x) ? station : best,
  );
}

export function buildStations(context: PartContext, concrete: MaterialFinish): Stations {
  const group = namedGroup(STATION_GROUP);
  const built = new Map(STATION_IDS.map((id) => [id, buildStation(context, id, concrete)]));
  built.forEach((station) => group.add(station));
  const labelHost = namedGroup('stationLabel');
  label(context, 'stations', labelHost, [...LABEL_POINT]);
  return {
    group,
    place(distance) {
      built.forEach((station, id) => {
        station.position.x = lineX(STATIONS.line[id], distance);
        station.visible = overlaps(station.position.x, HALF_LENGTH, WINDOW);
      });
      const host = nearest([...built.values()]);
      if (labelHost.parent !== host) host.add(labelHost);
    },
  };
}
