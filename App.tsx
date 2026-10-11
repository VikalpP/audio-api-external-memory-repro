import { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AudioContext } from 'react-native-audio-api';

const AUTO_RUN = false;
const DURATION_SECONDS = 131;
const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const MB = 1024 * 1024;

type Row = { step: string; externalMB: number; heapMB: number; note?: string };

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const stats = () => {
  const s = (globalThis as any).HermesInternal.getInstrumentedStats();
  return { externalMB: s.js_externalBytes / MB, heapMB: s.js_heapSize / MB };
};

function makeWav(seconds: number): ArrayBuffer {
  const frames = seconds * SAMPLE_RATE;
  const dataBytes = frames * CHANNELS * 2;
  const wav = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(wav);
  const ascii = (offset: number, text: string) =>
    [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * CHANNELS * 2, true);
  view.setUint16(32, CHANNELS * 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, dataBytes, true);
  const samples = new Int16Array(wav, 44);
  for (let i = 0; i < frames; i++) {
    const v = Math.round(Math.sin((2 * Math.PI * 440 * i) / SAMPLE_RATE) * 0.5 * 32767);
    samples[2 * i] = v;
    samples[2 * i + 1] = v;
  }
  return wav;
}

async function runSteps(): Promise<{ rows: Row[]; rawPcmMB: number }> {
  const rows: Row[] = [];
  let rawPcmMB = 0;
  const record = async (step: string, note?: string) => {
    await sleep(1000);
    rows.push({ step, note, ...stats() });
  };

  await record('a baseline');
  let wav: ArrayBuffer | null = makeWav(DURATION_SECONDS);
  await record('b WAV ArrayBuffer', `${(wav.byteLength / MB).toFixed(1)} MB`);
  let ctx: AudioContext | null = new AudioContext();
  await record('c new AudioContext');
  let buf: any = await ctx.decodeAudioData(wav);
  rawPcmMB = (buf.length * buf.numberOfChannels * 4) / MB;
  await record('d decodeAudioData', `length=${buf.length} ch=${buf.numberOfChannels} sr=${buf.sampleRate} rawPCM=${rawPcmMB.toFixed(1)} MB`);
  let src: any = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  await record('e source + buffer + connect');
  src.start();
  await sleep(1000);
  src.stop();
  await record('f start (+ stop after 1 s)');
  let extra: any[] | null = [];
  for (let i = 0; i < 5; i++) {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    extra.push(s);
  }
  await record('g 5 more sources, same buf');
  wav = null; ctx = null; buf = null; src = null; extra = null;
  (globalThis as any).gc?.();
  await record('h refs dropped (+gc if any)');
  await sleep(4000);
  rows.push({ step: 'h2 5 s later', ...stats() });
  return { rows, rawPcmMB };
}

async function runLoop(iterations: number): Promise<number[]> {
  const wav = makeWav(DURATION_SECONDS);
  const ctx = new AudioContext();
  const series: number[] = [];
  for (let i = 1; i <= iterations; i++) {
    let buf: any = await ctx.decodeAudioData(wav);
    let src: any = ctx.createBufferSource();
    src.buffer = buf;
    buf = null; src = null;
    const { externalMB, heapMB } = stats();
    series.push(externalMB);
    console.log('REPRO_LOOP ' + JSON.stringify({ iteration: i, externalMB, heapMB }));
  }
  return series;
}

export default function App() {
  const [rows, setRows] = useState<Row[]>([]);
  const [rawPcmMB, setRawPcmMB] = useState(0);
  const [loop, setLoop] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    const result = await runSteps();
    setRows(result.rows);
    setRawPcmMB(result.rawPcmMB);
    console.log('REPRO_RESULT ' + JSON.stringify({
      engine: (globalThis as any).HermesInternal?.getRuntimeProperties?.(),
      rawPcmMB: result.rawPcmMB,
      rows: result.rows,
    }));
    setBusy(false);
  };

  const runLoop30 = async () => {
    setBusy(true);
    setLoop(await runLoop(30));
    setBusy(false);
  };

  useEffect(() => {
    if (!AUTO_RUN) return;
    run().then(runLoop30);
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>audio-api external memory</Text>
      <View style={styles.buttons}>
        <Button title="Run" onPress={run} disabled={busy} />
        <Button title="Loop x30" onPress={runLoop30} disabled={busy} />
      </View>
      {rows.map((r, i) => {
        const delta = i === 0 ? 0 : r.externalMB - rows[i - 1].externalMB;
        return (
          <Text key={r.step} style={styles.row}>
            {r.step}: {r.externalMB.toFixed(1)} MB, d {delta.toFixed(1)} MB, {(delta / rawPcmMB).toFixed(2)}x raw
          </Text>
        );
      })}
      {loop.length > 0 && (
        <Text style={styles.row}>
          loop: it1 {loop[0].toFixed(0)} / it10 {loop[9]?.toFixed(0)} / it20 {loop[19]?.toFixed(0)} / it30 {loop[29]?.toFixed(0)} MB
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 80, paddingHorizontal: 16, gap: 6 },
  title: { fontSize: 18, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 16 },
  row: { fontSize: 12, fontFamily: 'Menlo' },
});
