import { Mesh } from 'three';
import type { BufferGeometry, Group, Material } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { STATIONS, STATION_IDS, VIEW_AHEAD_M, VIEW_BEHIND_M } from '../../../../model';
import type { StationId } from '../../../../model';
import { FINISHES } from '../../../finishes';
import { lineX } from '../../../pose';
import { label, namedGroup } from '../../context';
import type { PartContext } from '../../context';
import { overlaps } from '../slots';
import { stationBuildings, merged } from './buildings';
import { canopyColumns, canopyEdges, canopyFrame, glazing, lightStrips } from './canopy';
import { HALF_LENGTH, LABEL_POINT, STATION_FINISHES, STATION_STYLES } from './constants';
import {
  platformFloor,
  platformNosing,
  platformStructure,
  screenFrame,
  screenGlass,
  tactileStrips,
} from './platforms';

const WINDOW = [-VIEW_BEHIND_M, VIEW_AHEAD_M] as const;
const STATION_GROUP = 'stations';

export interface Stations {
  readonly group: Group;
  place(distance: number): void;
}

interface Looks {
  readonly concrete: Material;
  get(finish: MaterialFinish): Material;
}

function addMesh(
  context: PartContext,
  parent: Group,
  geometry: BufferGeometry | null,
  material: Material,
): void {
  if (!geometry) return;
  const mesh = new Mesh(context.tracker.track(geometry), material);
  mesh.name = STATION_GROUP;
  parent.add(mesh);
}

function buildStation(context: PartContext, id: StationId, looks: Looks): Group {
  const station = namedGroup(`station-${id}`);
  const buildings = stationBuildings(STATION_STYLES[id]);
  const pieces: readonly (readonly [BufferGeometry | null, Material])[] = [
    [merged([platformStructure(), ...buildings.concrete]), looks.concrete],
    [platformFloor(), looks.get(FINISHES.platform)],
    [platformNosing(), looks.get(STATION_FINISHES.nosing)],
    [tactileStrips(), looks.get(STATION_FINISHES.tactile)],
    [merged([screenGlass(), ...buildings.glass]), looks.get(FINISHES.glass)],
    [merged([screenFrame(), ...buildings.trim]), looks.get(STATION_FINISHES.trim)],
    [canopyEdges(), looks.get(FINISHES.canopy)],
    [glazing(), looks.get(STATION_FINISHES.glazing)],
    [
      merged([canopyFrame(), canopyColumns(), ...buildings.paint]),
      looks.get(STATION_FINISHES.paint),
    ],
    [merged(buildings.facade), looks.get(STATION_FINISHES.facade)],
    [lightStrips(), looks.get(STATION_FINISHES.lamp)],
  ];
  pieces.forEach(([geometry, material]) => addMesh(context, station, geometry, material));
  return station;
}

function nearest(stations: readonly Group[]): Group {
  return stations.reduce((best, station) =>
    Math.abs(station.position.x) < Math.abs(best.position.x) ? station : best,
  );
}

export function buildStations(context: PartContext, concrete: Material): Stations {
  const group = namedGroup('stations');
  const looks: Looks = {
    concrete,
    get: (finish) => context.materials.get(STATION_GROUP, finish),
  };
  const built = new Map(STATION_IDS.map((id) => [id, buildStation(context, id, looks)]));
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
