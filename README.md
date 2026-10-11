# audio-api-external-memory-repro

Minimal Expo app that decodes a 131 s stereo 48 kHz WAV with `react-native-audio-api` and prints Hermes `js_externalBytes` after each step. It shows how much external memory is reported per decoded `AudioBuffer` and per `source.buffer = buf` assignment, relative to the raw float32 PCM size (47.97 MiB for this input).

Related upstream items: PR #1283 (`setBuffer` deep-copies the `AudioBuffer`), issue #1266 (`AudioBuffer` memory freed only by Hermes GC finalizers).

## Versions

| | |
|---|---|
| expo | 57.0.27 |
| react-native | 0.86.3 |
| react-native-audio-api | 0.13.6 (also measured: 0.12.2) |
| Hermes | Static Hermes, `hermes-engine` 250829098.0.17, bytecode 98, Debug build with debugger enabled |
| Xcode | 27.0 (27A266a) |
| Simulator | iOS 27, iPhone 18 Pro |

## Run

```
npm install
npx expo run:ios
```

Press "Run" (steps a to h, table on screen plus one `REPRO_RESULT` JSON line in the Metro log) and "Loop x30" (decode, new source, assign buffer, drop; one `REPRO_LOOP` JSON line per iteration). To run both automatically on mount, set `AUTO_RUN = true` in `src/repro/config.ts`. Input length is `INPUT_WAV.durationSeconds` in the same file.

## Layout

Start with `src/repro/scenarios.ts`: it holds every `react-native-audio-api` call of the reproduction, in order, as two functions (`runStepSequence` for steps a to h, `runDecodeAssignDropLoop` for the loop).

| File | Holds |
|---|---|
| `src/repro/scenarios.ts` | The reproduction steps and the loop, including the `REPRO_RESULT` and `REPRO_LOOP` log lines |
| `src/repro/config.ts` | `AUTO_RUN`, the input WAV parameters, the wait times and the iteration counts |
| `src/input/sineWav.ts` | Builds the PCM16 sine WAV in memory |
| `src/memory/engineMemory.ts` | Reads `js_externalBytes` and `js_heapSize` from `HermesInternal.getInstrumentedStats()` |
| `src/results/` | Delta from the previous step, multiple of the raw PCM size, and the loop iterations shown on screen |
| `src/ui/` | The screen and the results table |

## Measurements

External bytes in MiB, 131 s input, raw PCM = 6288000 frames x 2 ch x 4 B = 47.97 MiB, WAV ArrayBuffer = 24.0 MiB. Each step is measured 1 s after it ran. Two launches of the app gave identical numbers, on 0.13.6 and on 0.12.2.

| Step | externalBytes | delta | delta / raw PCM |
|---|---|---|---|
| a baseline | 0.0 | | |
| b WAV ArrayBuffer created | 24.0 | +24.0 | 0.50 |
| c `new AudioContext()` | 24.0 | 0.0 | 0.00 |
| d `decodeAudioData` | 119.9 | +95.9 | 2.00 |
| e `createBufferSource`, `.buffer = buf`, `connect` | 215.9 | +95.9 | 2.00 |
| f `start()`, `stop()` after 1 s | 215.9 | 0.0 | 0.00 |
| g 5 more sources, same `buf` assigned | 695.6 | +479.7 | 10.00 |
| h references dropped (no `globalThis.gc` available) | 191.9 | -503.7 | -10.50 |
| h 5 s later | 191.9 | 0.0 | 0.00 |

Loop x30 (external MiB after each iteration, one decode + one source + assign per iteration): iteration 1 = 408, 10 = 600, 20 = 504, 30 = 408. Over the 30 iterations the value cycles between 408, 504 and 600 (it drops back every third iteration) and does not keep growing. Identical on 0.12.2.

Process RSS (simulator process, `ps -o rss=`, sampled every 0.5 s during the second 0.13.6 run, not aligned to steps): about 364 MB shortly after launch, 416 to 473 MB around WAV creation and context creation, one 714 MB sample during decoding, about 450 to 474 MB afterwards. Over the following loop RSS climbed to about 1.8 GB.

## Xcode 27 workarounds present

- `expo-build-properties` with `ios.enableSceneSupport: true` in `app.json` (iOS 27 terminates apps without the UIScene life cycle). Unrelated to the bug.
- No pod deployment-target workaround was needed, and `react-native-worklets` is not installed.
