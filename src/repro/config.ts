import type { SineWavSpec } from '../input/sineWav';

export const AUTO_RUN = false;

export const INPUT_WAV: SineWavSpec = {
  durationSeconds: 131,
  sampleRate: 48000,
  channelCount: 2,
  toneHz: 440,
  amplitude: 0.5,
};

export const SETTLE_BEFORE_READING_MS = 1000;
export const PLAYBACK_MS = 1000;
export const WAIT_AFTER_DROP_MS = 4000;
export const EXTRA_SOURCE_COUNT = 5;
export const LOOP_ITERATIONS = 30;
