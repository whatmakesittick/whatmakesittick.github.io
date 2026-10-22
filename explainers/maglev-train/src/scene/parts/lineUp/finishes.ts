import type { MaterialFinish } from '@core/scene/materials';
import { FINISHES } from '../../finishes';

function matte(color: string): MaterialFinish {
  return { color, roughness: 0.9, metalness: 0 };
}

function metal(color: string, roughness: number): MaterialFinish {
  return { color, roughness, metalness: 0.7 };
}

export const LINE_UP_FINISHES = {
  body: FINISHES.compareBody,
  bodyCap: { color: '#858e96', roughness: 0.75, metalness: 0.05 },
  cabin: matte('#4d545c'),
  cabinFloor: matte('#aab1b8'),
  underframe: matte('#33383f'),
  rubber: matte('#202327'),
  rim: metal('#9aa2aa', 0.4),
  windowBand: FINISHES.windowBand,
  cryostat: metal('#a9b1b9', 0.32),
  cryostatCap: metal('#6f777f', 0.45),
  superconductor: { color: '#5d8fd4', roughness: 0.45, metalness: 0.2 },
  levitationCoil: FINISHES.coil,
  propulsionCoil: { color: '#45514b', roughness: 0.55, metalness: 0.1 },
  channel: FINISHES.channel,
  channelCap: FINISHES.concreteDark,
  plinth: FINISHES.plinth,
  plinthBase: matte('#868279'),
  seat: { color: '#6a7c96', roughness: 0.7, metalness: 0 },
  ballastCap: matte('#6c6963'),
  sleeper: matte('#a39f97'),
  railSteel: metal('#80868d', 0.35),
  railCap: metal('#5b6168', 0.5),
  clip: metal('#3e4349', 0.5),
  bogie: FINISHES.underbody,
  wheel: FINISHES.steel,
  airSpring: matte('#2a2d31'),
  pantograph: FINISHES.steel,
  insulator: { color: '#7b5a47', roughness: 0.35, metalness: 0 },
} as const satisfies Record<string, MaterialFinish>;
