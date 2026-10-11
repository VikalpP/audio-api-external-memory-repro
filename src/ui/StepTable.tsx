import { StyleSheet, Text, View } from 'react-native';

import type { StepTableRow } from '../results/stepTable';

export function StepTable({ rows }: { rows: StepTableRow[] }) {
  return (
    <View>
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.stepCell, styles.header]}>step</Text>
        <Text style={[styles.cell, styles.numberCell, styles.header]}>ext MiB</Text>
        <Text style={[styles.cell, styles.numberCell, styles.header]}>delta</Text>
        <Text style={[styles.cell, styles.numberCell, styles.header]}>x raw</Text>
      </View>
      {rows.map((row) => (
        <View key={row.step} style={styles.row}>
          <Text style={[styles.cell, styles.stepCell]}>{row.step}</Text>
          <Text style={[styles.cell, styles.numberCell]}>{row.externalMiB.toFixed(1)}</Text>
          <Text style={[styles.cell, styles.numberCell]}>{row.deltaMiB.toFixed(1)}</Text>
          <Text style={[styles.cell, styles.numberCell]}>{row.deltaPerRawPcm.toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 4, gap: 8 },
  headerRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#888' },
  cell: { fontSize: 12, fontFamily: 'Menlo' },
  header: { fontWeight: '600' },
  stepCell: { flex: 1 },
  numberCell: { width: 58, textAlign: 'right' },
});
