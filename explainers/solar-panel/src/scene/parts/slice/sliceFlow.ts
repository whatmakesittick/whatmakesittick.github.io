import { AdditiveBlending, Color, Group, NormalBlending, SRGBColorSpace } from 'three';
import type { PointsMaterial } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import {
  CELL,
  STANDARD_TEST,
  absorbedShare,
  layerBottomUm,
  layerTopUm,
  passesThrough,
  photonStopUm,
  um,
  wavelengthColor,
} from '../../../model';
import { THEME } from '../../../theme';
import { RENDER_ORDER, SLICE_FLOW, SLICE_VIEW } from '../../constants';
import { seededRandom } from '../../geometry/random';
import { SLICE_SIZE, fingerSpan } from '../../geometry/sliceGeometry';
import type { CarrierKind, CutSide, PhotonPath, SectionPoint } from '../../geometry/sliceMotion';
import { carrierRoute, pointOnRoute, routeLength } from '../../geometry/sliceMotion';
import { registered } from '../context';
import type { PartContext } from '../context';

interface Photon {
  active: boolean;
  entryX: number;
  stop: number;
  absorbed: boolean;
  travelled: number;
  path: PhotonPath;
}

interface Carrier {
  active: boolean;
  kind: CarrierKind;
  route: SectionPoint[];
  length: number;
  travelled: number;
  fading: number;
  phase: number;
}

const HIDDEN_ALPHA = 0;
const SWAY = { settle: 4, heightShare: 0.5, heightPhase: 1.3, heightRate: 0.8 } as const;
const ENTRY_HEIGHT = um(
  layerBottomUm('pyramids') + (layerTopUm('pyramids') - layerBottomUm('pyramids')) / 2,
);
const EMITTER_TOP = um(layerTopUm('emitter'));
const OUTSIDE_LENGTH = um(SLICE_VIEW.entryUm);
const EXIT_HEIGHT = -um(SLICE_VIEW.exitUm);
const EDGE = um(SLICE_FLOW.edgeMarginUm);
const HOLE_COLOR = new Color(THEME.hole);
const WHITE = new Color('#ffffff');
const HOT_CORE = 0.55;
const ELECTRON_COLOR = new Color(THEME.electron);

export class SliceFlowPart {
  readonly object = new Group();
  private readonly photonCloud: PointCloud;
  private readonly haloCloud: PointCloud;
  private readonly carrierCloud: PointCloud;
  private readonly photonMaterial: PointsMaterial;
  private readonly haloMaterial: PointsMaterial;
  private readonly carrierMaterial: PointsMaterial;
  private readonly photons: Photon[];
  private readonly carriers: Carrier[];
  private readonly random = seededRandom(SLICE_FLOW.seed);
  private readonly photonColor = new Color();
  private readonly photonCore = new Color();
  private readonly trailColor = new Color();
  private path: PhotonPath | null = null;
  private wavelength = 0;
  private rate = 0;
  private due = 0;
  private time = 0;
  private plane = 0;

  constructor(context: PartContext) {
    const { photon, carrier } = SLICE_FLOW;
    this.photonMaterial = registered(
      context,
      UNDIMMED_GROUP,
      createPointMaterial(context.textures.dot, photon.size, NormalBlending),
    );
    this.haloMaterial = registered(
      context,
      UNDIMMED_GROUP,
      createPointMaterial(context.textures.glow, photon.size * photon.halo, AdditiveBlending),
    );
    this.carrierMaterial = registered(
      context,
      UNDIMMED_GROUP,
      createPointMaterial(context.textures.dot, carrier.size, NormalBlending),
    );
    this.photonCloud = context.tracker.track(
      new PointCloud(photon.pool * photon.trail, this.photonMaterial, RENDER_ORDER.particles),
    );
    this.haloCloud = context.tracker.track(
      new PointCloud(photon.pool, this.haloMaterial, RENDER_ORDER.particles),
    );
    this.carrierCloud = context.tracker.track(
      new PointCloud(carrier.pool, this.carrierMaterial, RENDER_ORDER.particles),
    );
    this.photons = Array.from({ length: photon.pool }, () => ({
      active: false,
      entryX: 0,
      stop: 0,
      absorbed: false,
      travelled: 0,
      path: { outside: { x: 0, h: -1 }, inside: { x: 0, h: -1 } },
    }));
    this.carriers = Array.from({ length: carrier.pool }, () => ({
      active: false,
      kind: 'electron' as CarrierKind,
      route: [],
      length: 0,
      travelled: 0,
      fading: 0,
      phase: 0,
    }));
    this.object.add(this.haloCloud.points, this.photonCloud.points, this.carrierCloud.points);
    this.setSide(-1);
  }

  setPath(path: PhotonPath | null): void {
    this.path = path;
  }

  setWavelength(nanometres: number): void {
    this.wavelength = nanometres;
    const [r, g, b] = wavelengthColor(nanometres);
    this.photonColor.setRGB(r, g, b, SRGBColorSpace);
    this.photonCore.copy(this.photonColor).lerp(WHITE, HOT_CORE);
  }

  setIrradiance(wattsPerSquareMetre: number): void {
    this.rate =
      (Math.max(0, wattsPerSquareMetre) / STANDARD_TEST.irradiance) * SLICE_FLOW.photon.maxRate;
  }

  setSide(side: CutSide): void {
    this.plane = side * (SLICE_SIZE.depth / 2 + SLICE_FLOW.faceGap);
  }

  setShown(shown: boolean): void {
    this.object.visible = shown;
  }

  update(deltaSeconds: number, scale: number): void {
    if (!this.object.visible) return;
    this.time += deltaSeconds;
    this.photonMaterial.size = SLICE_FLOW.photon.size * scale;
    this.haloMaterial.size = SLICE_FLOW.photon.size * SLICE_FLOW.photon.halo * scale;
    this.carrierMaterial.size = SLICE_FLOW.carrier.size * scale;
    this.spawn(deltaSeconds);
    this.movePhotons(deltaSeconds);
    this.moveCarriers(deltaSeconds);
  }

  private spawn(deltaSeconds: number): void {
    if (!this.path || this.rate <= 0) return;
    this.due += deltaSeconds * this.rate;
    while (this.due >= 1) {
      this.due -= 1;
      const free = this.photons.find((photon) => !photon.active);
      if (!free) return;
      this.launch(free, this.path);
    }
  }

  private launch(photon: Photon, path: PhotonPath): void {
    const [fingerLeft, fingerRight] = fingerSpan();
    let entryX = EDGE + this.random() * (SLICE_SIZE.width - 2 * EDGE);
    if (entryX > fingerLeft && entryX < fingerRight) entryX = fingerRight + (entryX - fingerLeft);
    const passes =
      passesThrough(this.wavelength) ||
      this.random() > absorbedShare(this.wavelength, CELL.thicknessUm);
    const depth = EMITTER_TOP - um(photonStopUm(this.wavelength));
    const jitter = 1 + (this.random() - 1 / 2) * 2 * SLICE_FLOW.depthJitter;
    Object.assign(photon, {
      active: true,
      entryX,
      absorbed: !passes,
      stop: passes ? EXIT_HEIGHT : EMITTER_TOP - depth * jitter,
      travelled: 0,
      path,
    });
  }

  private photonPoint(photon: Photon, distance: number): SectionPoint {
    const { outside, inside } = photon.path;
    if (distance < OUTSIDE_LENGTH) {
      const back = OUTSIDE_LENGTH - distance;
      return { x: photon.entryX - outside.x * back, h: ENTRY_HEIGHT - outside.h * back };
    }
    const into = distance - OUTSIDE_LENGTH;
    return { x: photon.entryX + inside.x * into, h: ENTRY_HEIGHT + inside.h * into };
  }

  private movePhotons(deltaSeconds: number): void {
    const { trail, spacing, speed } = SLICE_FLOW.photon;
    this.photons.forEach((photon, index) => {
      if (photon.active) {
        photon.travelled += speed * deltaSeconds;
        const head = this.photonPoint(photon, photon.travelled);
        if (head.h <= photon.stop) this.finish(photon, head);
      }
      this.placeHalo(photon, index);
      for (let step = 0; step < trail; step += 1) {
        const slot = index * trail + step;
        const distance = photon.travelled - step * spacing;
        if (!photon.active || distance < 0) {
          this.photonCloud.setColor(slot, 0, 0, 0, HIDDEN_ALPHA);
          continue;
        }
        const point = this.photonPoint(photon, distance);
        const { r, g, b } = this.trailColor
          .copy(this.photonCore)
          .lerp(this.photonColor, step / trail);
        this.photonCloud.setPoint(slot, point.x, this.plane, point.h);
        this.photonCloud.setColor(slot, r, g, b, 1 - step / trail);
      }
    });
    this.photonCloud.commit();
    this.haloCloud.commit();
  }

  private placeHalo(photon: Photon, index: number): void {
    if (!photon.active) {
      this.haloCloud.setColor(index, 0, 0, 0, HIDDEN_ALPHA);
      return;
    }
    const head = this.photonPoint(photon, photon.travelled);
    const { r, g, b } = this.photonColor;
    this.haloCloud.setPoint(index, head.x, this.plane, head.h);
    this.haloCloud.setColor(index, r, g, b, 1);
  }

  private finish(photon: Photon, at: SectionPoint): void {
    photon.active = false;
    if (!photon.absorbed) return;
    const start = { x: at.x, h: photon.stop };
    this.release('electron', start);
    this.release('hole', start);
  }

  private release(kind: CarrierKind, start: SectionPoint): void {
    const free = this.carriers.find((carrier) => !carrier.active);
    if (!free) return;
    const route = carrierRoute(kind, start);
    Object.assign(free, {
      active: true,
      kind,
      route,
      length: routeLength(route),
      travelled: 0,
      fading: 0,
      phase: this.random() * Math.PI * 2,
    });
  }

  private moveCarriers(deltaSeconds: number): void {
    const { speed, fade, wiggle, wiggleRate } = SLICE_FLOW.carrier;
    this.carriers.forEach((carrier, index) => {
      if (!carrier.active) {
        this.carrierCloud.setColor(index, 0, 0, 0, HIDDEN_ALPHA);
        return;
      }
      carrier.travelled += speed * deltaSeconds;
      if (carrier.travelled >= carrier.length) carrier.fading += deltaSeconds;
      if (carrier.fading >= fade) {
        carrier.active = false;
        this.carrierCloud.setColor(index, 0, 0, 0, HIDDEN_ALPHA);
        return;
      }
      const point = pointOnRoute(carrier.route, carrier.travelled);
      const calm = Math.min(1, (carrier.length - carrier.travelled) / (wiggle * SWAY.settle));
      const sway = Math.max(0, calm) * wiggle;
      const x = point.x + Math.sin(carrier.phase + this.time * wiggleRate) * sway;
      const lift = Math.cos(
        carrier.phase * SWAY.heightPhase + this.time * wiggleRate * SWAY.heightRate,
      );
      const h = point.h + lift * sway * SWAY.heightShare;
      const color = carrier.kind === 'electron' ? ELECTRON_COLOR : HOLE_COLOR;
      this.carrierCloud.setPoint(index, x, this.plane, h);
      this.carrierCloud.setColor(index, color.r, color.g, color.b, 1 - carrier.fading / fade);
    });
    this.carrierCloud.commit();
  }
}
