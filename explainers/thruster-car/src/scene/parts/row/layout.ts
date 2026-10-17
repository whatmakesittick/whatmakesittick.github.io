export type VehicleKind = 'car' | 'truck';

export interface ParkedVehicle {
  kind: VehicleKind;
  centreX: number;
  length: number;
  width: number;
  height: number;
}

const CAR_SIZE = { length: 4.6, width: 1.85, height: 1.45 } as const;
const TRUCK_SIZE = { length: 8, width: 2.5, height: 4 } as const;

export const DRAFT_ROW: readonly ParkedVehicle[] = [
  { kind: 'car', centreX: -15, ...CAR_SIZE },
  { kind: 'car', centreX: -20, ...CAR_SIZE },
  { kind: 'truck', centreX: -31, ...TRUCK_SIZE },
  { kind: 'car', centreX: -39, ...CAR_SIZE },
];
