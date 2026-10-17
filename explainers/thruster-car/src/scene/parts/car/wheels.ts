import { Group, Mesh } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { AssemblyState, Point } from '../../../ids';
import {
  caliperGeometry,
  discBodyGeometry,
  discFaceGeometry,
  discTexture,
} from '../../geometry/gear/brake';
import {
  barrelGeometry,
  blurGeometry,
  blurTexture,
  lipGeometry,
  spokesGeometry,
} from '../../geometry/gear/rim';
import { treadTexture, tyreGeometry } from '../../geometry/gear/tyre';
import type { PartContext } from '../context';
import { WHEEL, WHEEL_CENTRES } from './dimensions';
import { GEAR_FINISHES, rimBlurFinish, rotorFinish, tyreFinish } from './gearFinishes';

const PART = 'wheels';

export const BLUR_FROM_SPEED_MS = 6;

const LABEL_OUTSET = 0.16;

export interface WheelSet {
  readonly object: Group;
  readonly label: Object3D;
  setState(state: AssemblyState): void;
}

interface WheelLooks {
  tyre: Material;
  rotor: Material;
  blur: Material;
  graphite: Material;
  inner: Material;
  lip: Material;
  hat: Material;
  caliper: Material;
}

interface WheelGeometries {
  tyre: BufferGeometry;
  lip: BufferGeometry;
  barrel: BufferGeometry;
  spokes: BufferGeometry;
  discFaces: BufferGeometry;
  discBody: BufferGeometry;
  caliper: BufferGeometry;
  blur: BufferGeometry;
}

interface Wheel {
  object: Group;
  spinner: Group;
  spokes: Mesh;
  blur: Mesh;
}

export function wheelTurn(distance: number): number {
  return -distance / WHEEL.radius;
}

export function isBlurred(speed: number): boolean {
  return Math.abs(speed) > BLUR_FROM_SPEED_MS;
}

function wheelLooks(context: PartContext): WheelLooks {
  const { materials, tracker } = context;
  return {
    tyre: materials.get(PART, tyreFinish(tracker.track(treadTexture()))),
    rotor: materials.get(PART, rotorFinish(tracker.track(discTexture()))),
    blur: materials.get(PART, rimBlurFinish(tracker.track(blurTexture()))),
    graphite: materials.get(PART, GEAR_FINISHES.rimGraphite),
    inner: materials.get(PART, GEAR_FINISHES.rimInner),
    lip: materials.get(PART, GEAR_FINISHES.rimLip),
    hat: materials.get(PART, GEAR_FINISHES.discHat),
    caliper: materials.get(PART, GEAR_FINISHES.caliper),
  };
}

function wheelGeometries(context: PartContext): WheelGeometries {
  const track = (geometry: BufferGeometry) => context.tracker.track(geometry);
  return {
    tyre: track(tyreGeometry()),
    lip: track(lipGeometry()),
    barrel: track(barrelGeometry()),
    spokes: track(spokesGeometry()),
    discFaces: track(discFaceGeometry()),
    discBody: track(discBodyGeometry()),
    caliper: track(caliperGeometry()),
    blur: track(blurGeometry()),
  };
}

function buildWheel(centre: Point, shapes: WheelGeometries, looks: WheelLooks): Wheel {
  const object = new Group();
  object.position.set(...centre);
  object.scale.z = Math.sign(centre[2]) || 1;
  const spinner = new Group();
  const spokes = new Mesh(shapes.spokes, looks.graphite);
  const blur = new Mesh(shapes.blur, looks.blur);
  blur.visible = false;
  spinner.add(
    new Mesh(shapes.tyre, looks.tyre),
    new Mesh(shapes.lip, looks.lip),
    new Mesh(shapes.barrel, looks.inner),
    spokes,
    new Mesh(shapes.discFaces, looks.rotor),
    new Mesh(shapes.discBody, looks.hat),
    blur,
  );
  object.add(spinner, new Mesh(shapes.caliper, looks.caliper));
  return { object, spinner, spokes, blur };
}

export function createWheels(context: PartContext): WheelSet {
  const shapes = wheelGeometries(context);
  const looks = wheelLooks(context);
  const wheels = WHEEL_CENTRES.map((centre) => buildWheel(centre, shapes, looks));
  const object = new Group();
  wheels.forEach((wheel) => object.add(wheel.object));
  const labelled = wheels.find(({ object: wheel }) => wheel.position.x > 0 && wheel.position.z > 0);
  const label = anchorAt((labelled ?? wheels[0]).object, 0, 0, LABEL_OUTSET);
  return {
    object,
    label,
    setState(state) {
      const turn = wheelTurn(state.car.position[0]);
      const blurred = isBlurred(state.car.speed);
      wheels.forEach((wheel) => {
        wheel.spinner.rotation.z = turn;
        wheel.spokes.visible = !blurred;
        wheel.blur.visible = blurred;
      });
    },
  };
}
