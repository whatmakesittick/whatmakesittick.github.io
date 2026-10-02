import { Group, SphereGeometry, Sprite, SpriteMaterial } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { NAV_LIGHTS, WING } from '../../constants';
import { FINISHES, GLOW_SPRITE, PAINT } from '../../finishes';
import type { Vec3 } from '../../geometry/airfoilSurface';
import { chordAt, chordLineY, leadingEdgeX } from '../../geometry/wing';
import { partMesh, registered } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

const LIGHT_SEGMENTS = 10;
const TIP_CHORD_SHARE = 0.35;
const TIP_OUTSET = 0.03;
const GLOW_OPACITY = 0.9;

export function wingTip(side: 1 | -1): Vec3 {
  const span = WING.halfSpan;
  return [
    leadingEdgeX(span) - TIP_CHORD_SHARE * chordAt(span),
    chordLineY(span),
    side * (span + TIP_OUTSET),
  ];
}

interface Lamp {
  at: Vec3;
  colour: string;
  finish: MaterialFinish;
  group: EmphasisGroup;
}

const LAMPS: readonly Lamp[] = [
  { at: wingTip(-1), colour: PAINT.navRed, finish: FINISHES.navRed, group: 'wing' },
  { at: wingTip(1), colour: PAINT.navGreen, finish: FINISHES.navGreen, group: 'wing' },
  { at: NAV_LIGHTS.tail, colour: PAINT.navWhite, finish: FINISHES.navWhite, group: 'fuselage' },
];

function glowMaterial(context: PartContext, group: EmphasisGroup, colour: string, opacity: number) {
  return registered(
    context,
    group,
    new SpriteMaterial({ ...GLOW_SPRITE, map: context.textures.glow, color: colour, opacity }),
  );
}

export class NavLightsPart {
  readonly object = new Group();
  private readonly strobes: Sprite[] = [];
  private time = 0;

  constructor(context: PartContext) {
    const bulb = new SphereGeometry(NAV_LIGHTS.radius, LIGHT_SEGMENTS, LIGHT_SEGMENTS / 2);
    for (const { at, colour, finish, group } of LAMPS) {
      const lamp = partMesh(context, bulb, group, finish);
      lamp.position.set(...at);
      const glow = new Sprite(glowMaterial(context, group, colour, GLOW_OPACITY));
      glow.position.set(...at);
      glow.scale.setScalar(NAV_LIGHTS.glow);
      this.object.add(lamp, glow);
    }
    const strobe = glowMaterial(context, 'wing', PAINT.navWhite, 1);
    for (const side of [1, -1] as const) {
      const flash = new Sprite(strobe);
      flash.position.set(...wingTip(side));
      flash.scale.setScalar(NAV_LIGHTS.strobeSize);
      flash.visible = false;
      this.strobes.push(flash);
      this.object.add(flash);
    }
  }

  advance(deltaSeconds: number): void {
    this.time = (this.time + deltaSeconds) % NAV_LIGHTS.strobePeriod;
    const lit = this.time < NAV_LIGHTS.strobeFlash;
    this.strobes.forEach((strobe) => (strobe.visible = lit));
  }
}
