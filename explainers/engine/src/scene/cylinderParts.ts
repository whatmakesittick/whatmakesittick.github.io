import type { SceneTextures } from '@core/scene/textures';
import type { CylinderParts } from './cylinderAssembly';
import type { CylinderPlacement } from './layout';
import { chamberFactory } from './parts/combustionChamber';
import { rodFactory } from './parts/connectingRod';
import type { PartContext } from './parts/context';
import { injectorFactory } from './parts/injector';
import { pistonFactory } from './parts/piston';
import { createPort } from './parts/port';
import { sparkPlugFactory } from './parts/sparkPlug';
import { valveTrainFactory } from './parts/valveTrain';

export type CylinderPartsFactory = (placement: CylinderPlacement) => CylinderParts;

export function cylinderPartsFactory(
  context: PartContext,
  textures: SceneTextures,
): CylinderPartsFactory {
  const { intake, exhaust } = context.dims.valves;
  const createPiston = pistonFactory(context);
  const createRod = rodFactory(context);
  const createIntakeValve = valveTrainFactory(context, intake, 'intakeValve');
  const createExhaustValve = valveTrainFactory(context, exhaust, 'exhaustValve');
  const createChamber = chamberFactory(context);
  const isSpark = context.spec.ignition === 'spark';
  const createPlug = isSpark ? sparkPlugFactory(context, textures.glow) : null;
  const createInjector = isSpark ? null : injectorFactory(context);
  return ({ z }) => ({
    piston: createPiston(z),
    rod: createRod(z),
    intakeValve: createIntakeValve(z),
    exhaustValve: createExhaustValve(z),
    intakePort: createPort(context, intake, 'intakePort', z),
    exhaustPort: createPort(context, exhaust, 'exhaustPort', z),
    chamber: createChamber(z),
    sparkPlug: createPlug ? createPlug(z) : null,
    injector: createInjector ? createInjector(z) : null,
  });
}
