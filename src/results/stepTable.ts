import type { StepSequenceResult } from '../repro/scenarios';

export type StepTableRow = {
  step: string;
  externalMiB: number;
  deltaMiB: number;
  deltaPerRawPcm: number;
};

export function toStepTableRows({ rows, rawPcmMB }: StepSequenceResult): StepTableRow[] {
  return rows.map((row, index) => {
    const deltaMiB = index === 0 ? 0 : row.externalMB - rows[index - 1].externalMB;
    return {
      step: row.step,
      externalMiB: row.externalMB,
      deltaMiB,
      deltaPerRawPcm: deltaMiB / rawPcmMB,
    };
  });
}
