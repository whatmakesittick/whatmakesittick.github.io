import { Box3, BoxGeometry, CylinderGeometry, Group, Mesh, SphereGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import type { MaterialFinish } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, BetaIndex, PartId, RegionId, SiteState } from '../ids';
import { BETA_INDICES, PART_IDS, SITE_PARTS, SITE_STATES } from '../ids';
import {
  ALPHA_AZIMUTH_DEG,
  AXLE,
  BETA_AZIMUTH_DEG,
  C_RING,
  GATE,
  HEAD,
  MEMBRANE,
  OSCP,
  PERIPHERAL_STALK,
  PUMPS,
  PUMP_IDS,
  SITE,
  SPACE_LABELS,
  azimuthPoint,
  betaInState,
  bladeAzimuth,
  isCarrying,
  nm,
  rowOffsetZ,
  siteState,
  spanLength,
  spanMiddle,
} from '../model';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';

const FINISH = {
  lipid: { color: THEME.lipid, roughness: 0.9, transparent: true, opacity: 0.55 },
  rotor: { color: THEME.rotor, roughness: 0.6 },
  axle: { color: THEME.axle, roughness: 0.5 },
  alpha: { color: THEME.alpha, roughness: 0.6 },
  beta: { color: THEME.beta, roughness: 0.6 },
  alphaGlass: { color: THEME.alpha, roughness: 0.6, transparent: true, opacity: 0.22 },
  betaGlass: { color: THEME.beta, roughness: 0.6, transparent: true, opacity: 0.22 },
  stator: { color: THEME.stator, roughness: 0.6 },
  gate: { color: THEME.gate, roughness: 0.6 },
  pump: { color: THEME.pump, roughness: 0.7 },
  proton: { color: THEME.proton, emissive: THEME.proton, emissiveIntensity: 0.8 },
  electron: { color: THEME.electron, emissive: THEME.electron, emissiveIntensity: 0.8 },
  oxygen: { color: THEME.oxygen, roughness: 0.5 },
  atp: { color: THEME.atp, emissive: THEME.atp, emissiveIntensity: 0.4 },
  adp: { color: THEME.adp, roughness: 0.5 },
  open: { color: THEME.open, emissive: THEME.open, emissiveIntensity: 0.6 },
  loose: { color: THEME.loose, emissive: THEME.loose, emissiveIntensity: 0.6 },
  tight: { color: THEME.tight, emissive: THEME.tight, emissiveIntensity: 0.6 },
  neighbour: { color: THEME.metal, roughness: 0.8 },
} satisfies Record<string, MaterialFinish>;

const SEGMENTS = 24;
const PROTON_RADIUS_NM = 0.45;
const MOLECULE_RADIUS_NM = 0.7;
const SITE_MARKER_RADIUS_NM = 0.5;
const MEMBRANE_EDGE_NM = 1;
const MAX_BLADES = 14;
const MAX_NEIGHBOURS = 9;
const ELECTRON_COUNT = 3;

interface HeadLobe {
  mesh: Mesh;
  part: PartId;
  solid: MaterialFinish;
  glass: MaterialFinish;
}

export class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly resources: AssemblyResources;
  private readonly tracker = new ResourceTracker();
  private readonly anchors = new Map<AnchorId, Object3D>();
  private readonly labels = new Map<PartId, Object3D>();
  private readonly motor = new Group();
  private readonly rotor = new Group();
  private readonly head = new Group();
  private readonly pumps = new Group();
  private readonly flow = new Group();
  private readonly neighbours = new Group();
  private readonly membrane: Mesh;
  private readonly headLobes: HeadLobe[] = [];
  private readonly siteAnchors = new Map<SiteState, Object3D>();
  private readonly siteMarkers = new Map<BetaIndex, Record<SiteState, Mesh>>();
  private readonly bladeProtons: Mesh[] = [];
  private readonly atp: Mesh;
  private readonly adp: Mesh;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.resources = resources;
    this.membrane = this.buildMembrane();
    this.buildRotor();
    this.buildHead();
    this.buildStator();
    this.buildPumps();
    this.atp = this.sphere(MOLECULE_RADIUS_NM, 'atp', FINISH.atp);
    this.adp = this.sphere(MOLECULE_RADIUS_NM, 'adpPhosphate', FINISH.adp);
    this.flow.add(this.atp, this.adp);
    this.labels.set('atp', this.atp);
    this.labels.set('adpPhosphate', this.adp);
    this.buildNeighbours();
    this.labels.set('matrix', this.spaceAnchor('matrix'));
    this.labels.set('intermembraneSpace', this.spaceAnchor('intermembraneSpace'));
    this.motor.add(this.rotor, this.head);
    this.root.add(this.membrane, this.motor, this.pumps, this.flow, this.neighbours);
    this.fillMissingLabels();
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    this.rotor.rotation.y = toRadians(state.rotorDeg);
    this.membrane.visible = state.view.membrane;
    this.flow.visible = state.view.flow;
    this.headLobes.forEach(({ mesh, part, solid, glass }) => {
      mesh.material = this.resources.materials.get(part, state.view.cutaway ? glass : solid);
    });
    this.placeSites(state.rotorDeg);
    this.placeProtons(state.rotorDeg, state.bladeCount);
    this.neighbours.children.forEach((child, index) => {
      child.visible = index < state.motorCount - 1;
    });
  }

  update(): void {}

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    const anchor = this.anchors.get(id);
    if (!anchor) throw new Error(`Unknown anchor ${id}`);
    return anchor;
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    const box = new Box3();
    const include = (object: Object3D) => box.union(new Box3().setFromObject(object));
    switch (id) {
      case 'scene':
      case 'row':
        include(this.motor);
        include(this.pumps);
        this.neighbours.children.filter((child) => child.visible).forEach(include);
        break;
      case 'motor':
        include(this.motor);
        break;
      case 'rotor':
        include(this.rotor.children[0]);
        include(this.anchor('gate'));
        box.expandByScalar(nm(1));
        break;
      case 'head':
        include(this.head);
        break;
      case 'pumps':
        include(this.pumps);
        include(this.motor);
        break;
    }
    return box;
  }

  dispose(): void {
    this.tracker.dispose();
    this.resources.materials.clearRegistered();
  }

  private buildMembrane(): Mesh {
    const width = spanLength(MEMBRANE.patchX);
    const depth = spanLength(MEMBRANE.patchZ);
    const membrane = this.mesh(
      new BoxGeometry(nm(width), nm(spanLength(MEMBRANE.bilayer)), nm(depth)),
      'membrane',
      FINISH.lipid,
    );
    membrane.position.set(nm(spanMiddle(MEMBRANE.patchX)), 0, nm(spanMiddle(MEMBRANE.patchZ)));
    this.labels.set(
      'membrane',
      anchorAt(this.root, nm(MEMBRANE.patchX[1] - MEMBRANE_EDGE_NM), 0, nm(4)),
    );
    return membrane;
  }

  private buildRotor(): void {
    const ring = this.mesh(
      new CylinderGeometry(
        nm(C_RING.outerRadius),
        nm(C_RING.outerRadius),
        nm(spanLength(C_RING.height)),
        MAX_BLADES,
      ),
      'cRing',
      FINISH.rotor,
    );
    const gammaLength = spanLength(AXLE.gamma);
    const gamma = this.mesh(
      new CylinderGeometry(nm(AXLE.gammaRadius), nm(AXLE.gammaRadius), nm(gammaLength), 12),
      'centralStalk',
      FINISH.axle,
    );
    const bulge = azimuthPoint(BETA_AZIMUTH_DEG[0], AXLE.bulgeOffset, spanMiddle(AXLE.gamma));
    gamma.position.set(nm(bulge.x), nm(bulge.y), nm(bulge.z));
    const foot = this.mesh(
      new CylinderGeometry(nm(AXLE.footRadius), nm(AXLE.footRadius), nm(spanLength(AXLE.foot)), 16),
      'centralStalk',
      FINISH.axle,
    );
    foot.position.y = nm(spanMiddle(AXLE.foot));
    for (let blade = 0; blade < MAX_BLADES; blade += 1) {
      const proton = this.sphere(PROTON_RADIUS_NM, 'protons', FINISH.proton);
      this.bladeProtons.push(proton);
      this.flow.add(proton);
    }
    this.rotor.add(ring, gamma, foot);
    this.anchors.set('ring', ring);
    this.labels.set('cRing', anchorAt(ring, nm(-C_RING.outerRadius), 0, nm(1)));
    this.labels.set('centralStalk', anchorAt(gamma, 0, nm(-gammaLength / 4), 0));
    this.labels.set(
      'protons',
      anchorAt(this.root, nm(-C_RING.outerRadius - PROTON_RADIUS_NM), 0, nm(1)),
    );
  }

  private buildHead(): void {
    const lobeY = nm(spanMiddle(HEAD.span));
    const lobe = (
      azimuthDeg: number,
      part: PartId,
      solid: MaterialFinish,
      glass: MaterialFinish,
    ) => {
      const mesh = this.sphere(HEAD.lobeRadius, part, solid);
      const at = azimuthPoint(azimuthDeg, HEAD.lobeRing, 0);
      mesh.position.set(nm(at.x), lobeY, nm(at.z));
      mesh.scale.y = spanLength(HEAD.span) / (HEAD.lobeRadius * 2);
      this.headLobes.push({ mesh, part, solid, glass });
      this.head.add(mesh);
      return mesh;
    };
    ALPHA_AZIMUTH_DEG.forEach((azimuth) =>
      lobe(azimuth, 'alphaSubunits', FINISH.alpha, FINISH.alphaGlass),
    );
    BETA_INDICES.forEach((beta) => {
      const mesh = lobe(BETA_AZIMUTH_DEG[beta], 'betaSubunits', FINISH.beta, FINISH.betaGlass);
      if (beta === 2) this.labels.set('betaSubunits', mesh);
      this.siteMarkers.set(beta, this.buildSiteMarkers(beta));
    });
    this.labels.set('alphaSubunits', this.head.children[0]);
    SITE_STATES.forEach((state) => {
      const anchor = anchorAt(this.head, 0, nm(SITE.y), 0);
      this.siteAnchors.set(state, anchor);
      this.labels.set(SITE_PARTS[state], anchor);
    });
    this.anchors.set('head', anchorAt(this.head, 0, lobeY, 0));
  }

  private buildSiteMarkers(beta: BetaIndex): Record<SiteState, Mesh> {
    const at = azimuthPoint(BETA_AZIMUTH_DEG[beta], SITE.radius, SITE.y);
    const marker = (state: SiteState) => {
      const mesh = this.sphere(SITE_MARKER_RADIUS_NM, SITE_PARTS[state], FINISH[state]);
      mesh.position.set(nm(at.x), nm(at.y), nm(at.z));
      this.head.add(mesh);
      return mesh;
    };
    return { open: marker('open'), loose: marker('loose'), tight: marker('tight') };
  }

  private buildStator(): void {
    const stalkLength = spanLength(PERIPHERAL_STALK.span);
    const stalk = this.mesh(
      new BoxGeometry(nm(PERIPHERAL_STALK.width), nm(stalkLength), nm(PERIPHERAL_STALK.width)),
      'peripheralStalk',
      FINISH.stator,
    );
    const stalkAt = azimuthPoint(
      PERIPHERAL_STALK.azimuthDeg,
      PERIPHERAL_STALK.radius,
      spanMiddle(PERIPHERAL_STALK.span),
    );
    stalk.position.set(nm(stalkAt.x), nm(stalkAt.y), nm(stalkAt.z));
    const cap = this.sphere(OSCP.radius, 'peripheralStalk', FINISH.stator);
    cap.position.y = nm(spanMiddle(OSCP.span));
    const gateDepth = GATE.outerRadius - GATE.innerRadius;
    const gate = this.mesh(
      new BoxGeometry(nm(gateDepth), nm(spanLength(GATE.span)), nm(gateDepth * 1.4)),
      'subunitA',
      FINISH.gate,
    );
    const gateAt = azimuthPoint(GATE.azimuthDeg, GATE.innerRadius + gateDepth / 2, 0);
    gate.position.set(nm(gateAt.x), 0, nm(gateAt.z));
    gate.rotation.y = toRadians(GATE.azimuthDeg);
    this.motor.add(stalk, cap, gate);
    this.anchors.set('gate', gate);
    this.labels.set('subunitA', gate);
    this.labels.set('peripheralStalk', stalk);
  }

  private buildPumps(): void {
    PUMP_IDS.forEach((id) => {
      const plan = PUMPS[id];
      const pump = this.mesh(
        new CylinderGeometry(nm(plan.radius), nm(plan.radius), nm(spanLength(plan.span)), 16),
        'pumps',
        FINISH.pump,
      );
      pump.position.set(nm(plan.x), nm(spanMiddle(plan.span)), 0);
      this.pumps.add(pump);
    });
    this.anchors.set('pumps', this.pumps.children[1]);
    this.labels.set('pumps', this.pumps.children[1]);
    for (let index = 0; index < ELECTRON_COUNT; index += 1) {
      const electron = this.sphere(PROTON_RADIUS_NM, 'electrons', FINISH.electron);
      electron.position.set(nm(PUMPS[PUMP_IDS[index]].x), nm(-1), nm(3.5));
      this.flow.add(electron);
      if (index === 1) this.labels.set('electrons', electron);
    }
    const oxygen = this.sphere(MOLECULE_RADIUS_NM, 'oxygen', FINISH.oxygen);
    oxygen.position.set(nm(PUMPS.complexFour.x), nm(PUMPS.complexFour.span[1] + 1.5), 0);
    this.flow.add(oxygen);
    this.labels.set('oxygen', oxygen);
  }

  private buildNeighbours(): void {
    for (let index = 1; index <= MAX_NEIGHBOURS; index += 1) {
      const copy = new Group();
      const stalk = this.mesh(
        new CylinderGeometry(nm(AXLE.gammaRadius), nm(AXLE.gammaRadius), nm(HEAD.span[0]), 8),
        'neighbourMotors',
        FINISH.neighbour,
      );
      stalk.position.y = nm(HEAD.span[0] / 2);
      const head = this.sphere(HEAD.radius, 'neighbourMotors', FINISH.neighbour);
      head.position.y = nm(spanMiddle(HEAD.span));
      copy.add(stalk, head);
      copy.position.z = nm(rowOffsetZ(index));
      this.neighbours.add(copy);
      if (index === 2) this.labels.set('neighbourMotors', head);
    }
  }

  private spaceAnchor(id: keyof typeof SPACE_LABELS): Object3D {
    const at = SPACE_LABELS[id];
    return anchorAt(this.root, nm(at.x), nm(at.y), nm(at.z));
  }

  private placeSites(rotorDeg: number): void {
    this.siteMarkers.forEach((markers, beta) => {
      const current = siteState(beta, rotorDeg);
      SITE_STATES.forEach((state) => {
        markers[state].visible = state === current;
      });
    });
    SITE_STATES.forEach((state) => {
      const marker = this.siteMarkers.get(betaInState(state, rotorDeg))?.[state];
      if (marker) this.siteAnchors.get(state)?.position.copy(marker.position);
    });
    const tight = this.siteMarkers.get(betaInState('tight', rotorDeg))?.tight;
    const loose = this.siteMarkers.get(betaInState('loose', rotorDeg))?.loose;
    if (tight) this.atp.position.copy(tight.position).setY(tight.position.y + nm(1.2));
    if (loose) this.adp.position.copy(loose.position).setY(loose.position.y + nm(1.2));
  }

  private placeProtons(rotorDeg: number, bladeCount: number): void {
    this.bladeProtons.forEach((proton, blade) => {
      const azimuth = bladeAzimuth(blade, rotorDeg, bladeCount);
      proton.visible = blade < bladeCount && isCarrying(azimuth);
      const at = azimuthPoint(azimuth, C_RING.outerRadius + PROTON_RADIUS_NM, 0);
      proton.position.set(nm(at.x), 0, nm(at.z));
    });
  }

  private fillMissingLabels(): void {
    PART_IDS.forEach((id) => {
      if (!this.labels.has(id)) this.labels.set(id, this.motor);
    });
  }

  private sphere(radiusNm: number, group: PartId, finish: MaterialFinish): Mesh {
    return this.mesh(new SphereGeometry(nm(radiusNm), SEGMENTS, SEGMENTS / 2), group, finish);
  }

  private mesh(geometry: BufferGeometry, group: string, finish: MaterialFinish): Mesh {
    return new Mesh(this.tracker.track(geometry), this.resources.materials.get(group, finish));
  }
}
