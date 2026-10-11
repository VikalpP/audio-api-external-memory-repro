export const BYTES_PER_MIB = 1024 * 1024;

export type EngineMemory = { externalMB: number; heapMB: number };

type HermesInternal = {
  getInstrumentedStats(): { js_externalBytes: number; js_heapSize: number };
  getRuntimeProperties?(): Record<string, unknown>;
};

type EngineGlobals = { HermesInternal?: HermesInternal; gc?: () => void };

const engineGlobals = globalThis as EngineGlobals;

export function readEngineMemory(): EngineMemory {
  const hermes = engineGlobals.HermesInternal;
  if (!hermes) throw new Error('HermesInternal is not available: this reproduction needs Hermes');
  const stats = hermes.getInstrumentedStats();
  return {
    externalMB: stats.js_externalBytes / BYTES_PER_MIB,
    heapMB: stats.js_heapSize / BYTES_PER_MIB,
  };
}

export const describeEngine = () => engineGlobals.HermesInternal?.getRuntimeProperties?.();

// globalThis.gc is absent in a default Hermes build, so this is normally a no-op.
export const collectGarbageIfExposed = () => engineGlobals.gc?.();
