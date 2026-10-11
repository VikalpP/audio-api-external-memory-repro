export type SineWavSpec = {
  durationSeconds: number;
  sampleRate: number;
  channelCount: number;
  toneHz: number;
  amplitude: number;
};

const HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;
const BITS_PER_SAMPLE = 16;
const PCM_FORMAT = 1;
const FMT_CHUNK_BYTES = 16;
const INT16_MAX = 32767;

export function buildSineWavPcm16(spec: SineWavSpec): ArrayBuffer {
  const { durationSeconds, sampleRate, channelCount, toneHz, amplitude } = spec;
  const frameCount = durationSeconds * sampleRate;
  const bytesPerFrame = channelCount * BYTES_PER_SAMPLE;
  const dataBytes = frameCount * bytesPerFrame;

  const wav = new ArrayBuffer(HEADER_BYTES + dataBytes);
  const header = new DataView(wav, 0, HEADER_BYTES);
  const writeAscii = (offset: number, text: string) =>
    [...text].forEach((char, i) => header.setUint8(offset + i, char.charCodeAt(0)));
  const writeUint16 = (offset: number, value: number) => header.setUint16(offset, value, true);
  const writeUint32 = (offset: number, value: number) => header.setUint32(offset, value, true);

  writeAscii(0, 'RIFF');
  writeUint32(4, HEADER_BYTES - 8 + dataBytes);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  writeUint32(16, FMT_CHUNK_BYTES);
  writeUint16(20, PCM_FORMAT);
  writeUint16(22, channelCount);
  writeUint32(24, sampleRate);
  writeUint32(28, sampleRate * bytesPerFrame);
  writeUint16(32, bytesPerFrame);
  writeUint16(34, BITS_PER_SAMPLE);
  writeAscii(36, 'data');
  writeUint32(40, dataBytes);

  const samples = new Int16Array(wav, HEADER_BYTES);
  for (let frame = 0; frame < frameCount; frame++) {
    const phase = (2 * Math.PI * toneHz * frame) / sampleRate;
    const sample = Math.round(Math.sin(phase) * amplitude * INT16_MAX);
    for (let channel = 0; channel < channelCount; channel++) {
      samples[frame * channelCount + channel] = sample;
    }
  }
  return wav;
}
