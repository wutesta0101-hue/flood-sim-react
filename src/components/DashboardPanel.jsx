// ══════════════════════════════════════════════════════════
// DashboardPanel.jsx — SWE 災害輸出面板
// 所屬資料夾:flood-sim-react/src/components/
//
// 顯示 postprocess 的摘要:淹沒面積、最大水深/流速、破壞參數、波前距離、總水量。
// 資料來自 useSWESimulation 的 summary + gridRef。
// ══════════════════════════════════════════════════════════

function Cell({ label, value, unit }) {
  return (
    <div style={styles.cell}>
      <div style={styles.cellLabel}>{label}</div>
      <div style={styles.cellVal}>{value}<span style={styles.cellUnit}> {unit}</span></div>
    </div>
  );
}

export default function DashboardPanel({ summary, totalVolume }) {
  const s = summary;
  return (
    <div style={styles.card}>
      <div style={styles.cardHead}>SWE 災害輸出</div>
      <div style={styles.cardBody}>
        {s ? (
          <div style={styles.grid2}>
            <Cell label="淹沒面積"  value={s.inundatedArea_m2.toFixed(0)} unit="m²" />
            <Cell label="最大水深"  value={s.peakDepth_m.toFixed(2)}      unit="m" />
            <Cell label="最大流速"  value={s.peakSpeed_ms.toFixed(2)}     unit="m/s" />
            <Cell label="破壞參數"  value={s.peakHazard.toFixed(2)}       unit="m²/s" />
            <Cell label="波前距離"  value={(s.frontDistance_m || 0).toFixed(1)} unit="m" />
            <Cell label="總水量"    value={(totalVolume || 0).toFixed(1)} unit="m³" />
          </div>
        ) : (
          <span style={{ color: '#64748b', fontSize: 13 }}>初始化中…</span>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: { border: '1px solid #1a2a3a', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  cardHead: { background: 'rgba(26,42,58,0.6)', padding: '5px 9px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' },
  cardBody: { padding: 9 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 },
  cell: { background: 'rgba(10,14,20,0.5)', border: '1px solid #1a2a3a', borderRadius: 3, padding: '4px 6px' },
  cellLabel: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  cellVal: { fontSize: 13, fontWeight: 'bold', color: '#00b4d8' },
  cellUnit: { fontSize: 13, color: '#64748b' },
};
