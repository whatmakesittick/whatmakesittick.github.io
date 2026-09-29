import type { EngineId } from '../ids';
import { CHAMBER_PRESSURE_BAR, FLIGHT_THRUST_TF } from './performance';

export type CycleId = 'gasGenerator' | 'fuelRichStaged' | 'oxygenRichStaged' | 'fullFlow';

export type PropellantPair = 'oxygenKerosene' | 'oxygenHydrogen' | 'oxygenMethane';

export type BurnerKind = 'gasGenerator' | 'fuelRich' | 'oxygenRich' | 'oneOfEach';

export interface EngineSpec {
  cycle: CycleId;
  propellants: PropellantPair;
  chamberBar: number;
  chamberBarIsApproximate: boolean;
  thrustTf: number;
  ispSeaLevel: number;
  ispVacuum: number;
  dumps: boolean;
  pumps: number;
  boostPumps: number;
  burners: number;
  burnerKind: BurnerKind;
  chambers: number;
}

export const ENGINES: Readonly<Record<EngineId, EngineSpec>> = {
  merlin: {
    cycle: 'gasGenerator',
    propellants: 'oxygenKerosene',
    chamberBar: 97,
    chamberBarIsApproximate: true,
    thrustTf: 86,
    ispSeaLevel: 282,
    ispVacuum: 311,
    dumps: true,
    pumps: 1,
    boostPumps: 0,
    burners: 1,
    burnerKind: 'gasGenerator',
    chambers: 1,
  },
  rs25: {
    cycle: 'fuelRichStaged',
    propellants: 'oxygenHydrogen',
    chamberBar: 206,
    chamberBarIsApproximate: false,
    thrustTf: 190,
    ispSeaLevel: 366,
    ispVacuum: 452,
    dumps: false,
    pumps: 4,
    boostPumps: 2,
    burners: 2,
    burnerKind: 'fuelRich',
    chambers: 1,
  },
  rd180: {
    cycle: 'oxygenRichStaged',
    propellants: 'oxygenKerosene',
    chamberBar: 260,
    chamberBarIsApproximate: true,
    thrustTf: 390,
    ispSeaLevel: 311,
    ispVacuum: 338,
    dumps: false,
    pumps: 1,
    boostPumps: 0,
    burners: 1,
    burnerKind: 'oxygenRich',
    chambers: 2,
  },
  raptor: {
    cycle: 'fullFlow',
    propellants: 'oxygenMethane',
    chamberBar: CHAMBER_PRESSURE_BAR,
    chamberBarIsApproximate: true,
    thrustTf: FLIGHT_THRUST_TF,
    ispSeaLevel: 330,
    ispVacuum: 350,
    dumps: false,
    pumps: 2,
    boostPumps: 0,
    burners: 2,
    burnerKind: 'oneOfEach',
    chambers: 1,
  },
};
