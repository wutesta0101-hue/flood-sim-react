// ══════════════════════════════════════════════════════════
// EventLog.jsx — 事件日誌面板
// 所屬資料夾:flood-sim-react/src/components/
//
// 顯示 useSWESimulation 累積的 logs(建立、播放、暫停、耗盡等)。
// ══════════════════════════════════════════════════════════

const LEVEL_COLOR = {
  info: '#00b4d8',
  ok:   '#22c55e',
  warn: '#fcd34d',
  err:  '#ef4444',
};

export default function EventLog({ logs }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHead}>事件日誌</div>
      <div style={styles.list}>
        {(!logs || logs.length === 0) ? (
          <div style={{ color: '#64748b', fontSize: 13 }}>尚無事件</div>
        ) : (
          // 最新在上
          [...logs].reverse().map((l, i) => (
            <div key={i} style={styles.row}>
              <span style={styles.time}>{l.ts}</span>
              <span style={{ color: LEVEL_COLOR[l.level] || '#e2e8f0' }}>{l.msg}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  card: { border: '1px solid #1a2a3a', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  cardHead: { background: 'rgba(26,42,58,0.6)', padding: '5px 9px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' },
  list: { padding: 9, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' },
  row: { display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.5 },
  time: { color: '#64748b', flexShrink: 0, width: 42 },
};
