import type { LoopReading } from '../repro/scenarios';

const REPORTED_ITERATIONS = [1, 10, 20, 30];

export type LoopCheckpoint = { iteration: number; externalMiB: number };

export function toLoopCheckpoints(readings: LoopReading[]): LoopCheckpoint[] {
  return readings
    .filter(({ iteration }) => REPORTED_ITERATIONS.includes(iteration))
    .map(({ iteration, externalMB }) => ({ iteration, externalMiB: externalMB }));
}
