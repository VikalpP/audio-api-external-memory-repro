import { AudioContext } from 'react-native-audio-api';
import type { AudioBuffer, AudioBufferSourceNode } from 'react-native-audio-api';

import { buildSineWavPcm16 } from '../input/sineWav';
import {
  BYTES_PER_MIB,
  collectGarbageIfExposed,
  describeEngine,
  readEngineMemory,
  type EngineMemory,
} from '../memory/engineMemory';
import {
  EXTRA_SOURCE_COUNT,
  INPUT_WAV,
  PLAYBACK_MS,
  SETTLE_BEFORE_READING_MS,
  WAIT_AFTER_DROP_MS,
} from './config';

export type StepReading = { step: string; note?: string } & EngineMemory;
export type StepSequenceResult = { rows: StepReading[]; rawPcmMB: number };
export type LoopReading = { iteration: number } & EngineMemory;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function runStepSequence(): Promise<StepSequenceResult> {
  const rows: StepReading[] = [];
  const readAfterSettling = async (step: string, note?: string) => {
    await sleep(SETTLE_BEFORE_READING_MS);
    rows.push({ step, note, ...readEngineMemory() });
  };

  await readAfterSettling('a baseline');

  let wav: ArrayBuffer | null = buildSineWavPcm16(INPUT_WAV);
  await readAfterSettling('b WAV ArrayBuffer', `${(wav.byteLength / BYTES_PER_MIB).toFixed(1)} MB`);

  let ctx: AudioContext | null = new AudioContext();
  await readAfterSettling('c new AudioContext');

  let buf: AudioBuffer | null = await ctx.decodeAudioData(wav);
  const rawPcmMB = (buf.length * buf.numberOfChannels * Float32Array.BYTES_PER_ELEMENT) / BYTES_PER_MIB;
  await readAfterSettling(
    'd decodeAudioData',
    `length=${buf.length} ch=${buf.numberOfChannels} sr=${buf.sampleRate} rawPCM=${rawPcmMB.toFixed(1)} MB`,
  );

  let src: AudioBufferSourceNode | null = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  await readAfterSettling('e source + buffer + connect');

  src.start();
  await sleep(PLAYBACK_MS);
  src.stop();
  await readAfterSettling('f start (+ stop after 1 s)');

  let extra: AudioBufferSourceNode[] | null = [];
  for (let i = 0; i < EXTRA_SOURCE_COUNT; i++) {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    extra.push(s);
  }
  await readAfterSettling('g 5 more sources, same buf');

  // References are released first, so whatever is still reported is not held by this function.
  wav = null; ctx = null; buf = null; src = null; extra = null;
  collectGarbageIfExposed();
  await readAfterSettling('h refs dropped (+gc if any)');

  await sleep(WAIT_AFTER_DROP_MS);
  rows.push({ step: 'h2 5 s later', ...readEngineMemory() });

  console.log('REPRO_RESULT ' + JSON.stringify({ engine: describeEngine(), rawPcmMB, rows }));
  return { rows, rawPcmMB };
}

export async function runDecodeAssignDropLoop(iterations: number): Promise<LoopReading[]> {
  const wav = buildSineWavPcm16(INPUT_WAV);
  const ctx = new AudioContext();
  const readings: LoopReading[] = [];

  for (let iteration = 1; iteration <= iterations; iteration++) {
    let buf: AudioBuffer | null = await ctx.decodeAudioData(wav);
    let src: AudioBufferSourceNode | null = ctx.createBufferSource();
    src.buffer = buf;
    buf = null; src = null;

    const reading: LoopReading = { iteration, ...readEngineMemory() };
    readings.push(reading);
    console.log('REPRO_LOOP ' + JSON.stringify(reading));
  }
  return readings;
}
