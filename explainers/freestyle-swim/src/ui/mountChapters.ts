import { t } from '@core/i18n';
import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { KICK_BEATS, PACES, WHAT_IF_RANGE, activeDragN, dragPowerW, paceSpeed } from '../model';
import { effectiveKick, strokeReading } from '../state';
import type { SwimStore, SwimStoreState } from '../state';
import { chapterOf } from './chapters';
import {
  formatCount,
  formatDegrees,
  formatMeters,
  formatMetersPerSecond,
  formatMetersPerSecondDetailed,
  formatNewtons,
  formatPerMinute,
  formatWatts,
} from './format';
import {
  depthText,
  dragUpText,
  elbowText,
  gapText,
  legText,
  phaseText,
  pullingArm,
  sideText,
} from './text';

const LEG_COUNT = 2;

const reading = (state: SwimStoreState) => strokeReading(state);

function mountStroke(root: Document, store: SwimStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'stroke'), store, {
    strokeSpeed: (state) => formatMetersPerSecondDetailed(reading(state).speedMs),
    strokeRate: (state) => formatPerMinute(PACES[state.pace].strokeRate),
    strokeLength: (state) => formatMeters(PACES[state.pace].strokeLengthM),
    strokeSum: (state) => {
      const { strokeRate, strokeLengthM } = PACES[state.pace];
      return t('chapters.stroke.sumValue', {
        rate: formatPerMinute(strokeRate),
        length: formatMeters(strokeLengthM),
        speed: formatMetersPerSecondDetailed(paceSpeed(state.pace)),
      });
    },
    strokePhase: (state) => phaseText(reading(state).right),
  });
}

function mountCatch(root: Document, store: SwimStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'catch'), store, {
    catchElbow: (state) => elbowText(reading(state).right),
    catchDepth: (state) => depthText(reading(state).right),
    catchPhase: (state) => phaseText(reading(state).right),
  });
}

function mountPull(root: Document, store: SwimStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'pull'), store, {
    pullForce: (state) => formatNewtons(pullingArm(reading(state)).handForceN),
    pullHandSpeed: (state) => formatMetersPerSecond(pullingArm(reading(state)).handSpeedMs),
    pullPhase: (state) => phaseText(pullingArm(reading(state))),
  });
}

function mountRoll(root: Document, store: SwimStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'roll'), store, {
    rollShoulder: (state) => formatDegrees(Math.abs(reading(state).shoulderRollDeg)),
    rollHip: (state) => formatDegrees(Math.abs(reading(state).hipRollDeg)),
    rollSide: (state) => sideText(reading(state)),
    rollBreath: (state) => formatDegrees(reading(state).breathExtraDeg),
  });
}

function mountKick(root: Document, store: SwimStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'kick'), store, {
    kickPattern: (state) => t(`controls.kickOptions.${effectiveKick(state)}`),
    kickBeats: (state) =>
      t('chapters.kick.beatsValue', {
        count: formatCount(KICK_BEATS[effectiveKick(state)] * LEG_COUNT),
      }),
    kickLeg: (state) => legText(reading(state)),
  });
}

function whatIfText(state: SwimStoreState, value: (speedMs: number) => string): string {
  return state.headUp ? dragUpText() : value(state.whatIfSpeed);
}

function mountDrag(root: Document, store: SwimStore): Disposer {
  const chapter = chapterOf(root, 'drag');
  return disposeAll([
    mountRangeWidget(chapter, store, {
      control: 'whatIfSpeed',
      range: WHAT_IF_RANGE,
      select: (state) => [state.whatIfSpeed] as const,
      value: ([speed]) => speed,
      format: ([speed]) => formatMetersPerSecond(speed),
      set: (state, speed) => state.setWhatIfSpeed(speed),
    }),
    mountLiveReadouts(chapter, store, {
      dragNow: (state) => (state.headUp ? dragUpText() : formatNewtons(strokeReading(state).dragN)),
      dragAt: (state) => whatIfText(state, (speed) => formatNewtons(activeDragN(speed))),
      powerAt: (state) => whatIfText(state, (speed) => formatWatts(dragPowerW(speed))),
      gapNow: (state) => gapText(state.pace),
      gapEasy: () => gapText('easy'),
      gapMiddle: () => gapText('middle'),
      gapSprint: () => gapText('sprint'),
    }),
  ]);
}

export function mountSwimUi(root: Document, store: SwimStore): Disposer {
  return disposeAll([
    mountStroke(root, store),
    mountCatch(root, store),
    mountPull(root, store),
    mountRoll(root, store),
    mountKick(root, store),
    mountDrag(root, store),
  ]);
}
