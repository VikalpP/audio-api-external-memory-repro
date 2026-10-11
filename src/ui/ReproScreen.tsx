import { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AUTO_RUN, LOOP_ITERATIONS } from '../repro/config';
import {
  runDecodeAssignDropLoop,
  runStepSequence,
  type LoopReading,
  type StepSequenceResult,
} from '../repro/scenarios';
import { toLoopCheckpoints } from '../results/loopSummary';
import { toStepTableRows } from '../results/stepTable';
import { StepTable } from './StepTable';

export function ReproScreen() {
  const [stepResult, setStepResult] = useState<StepSequenceResult | null>(null);
  const [loopReadings, setLoopReadings] = useState<LoopReading[]>([]);
  const [busy, setBusy] = useState(false);

  const runSteps = async () => {
    setBusy(true);
    setStepResult(await runStepSequence());
    setBusy(false);
  };

  const runLoop = async () => {
    setBusy(true);
    setLoopReadings(await runDecodeAssignDropLoop(LOOP_ITERATIONS));
    setBusy(false);
  };

  useEffect(() => {
    if (!AUTO_RUN) return;
    runSteps().then(runLoop);
  }, []);

  const loopCheckpoints = toLoopCheckpoints(loopReadings);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>audio-api external memory</Text>
      <View style={styles.buttons}>
        <Button title="Run" onPress={runSteps} disabled={busy} />
        <Button title={`Loop x${LOOP_ITERATIONS}`} onPress={runLoop} disabled={busy} />
      </View>
      {stepResult && (
        <>
          <Text style={styles.caption}>raw PCM {stepResult.rawPcmMB.toFixed(2)} MiB</Text>
          <StepTable rows={toStepTableRows(stepResult)} />
        </>
      )}
      {loopCheckpoints.length > 0 && (
        <Text style={styles.caption}>
          loop, ext MiB: {loopCheckpoints.map((c) => `it${c.iteration} ${c.externalMiB.toFixed(0)}`).join(' / ')}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 80, paddingHorizontal: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 16 },
  caption: { fontSize: 12, fontFamily: 'Menlo' },
});
