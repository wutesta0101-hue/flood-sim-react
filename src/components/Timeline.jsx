// ══════════════════════════════════════════════════════════
// Timeline.jsx — 進度條與播放控制
// 所屬資料夾:flood-sim-react/src/components/
//
// 方案 B:SWE 逐步演進,進度條不可拖曳跳轉;跑到「擴散耗盡」自動停止。
// 進度 = simTime / maxSimTime。
// ══════════════════════════════════════════════════════════

export default function Timeline({ simTime, maxSimTime, running, exhausted, onPlay, onPause, onReset }) {
  const pct = Math.min(simTime / maxSimTime * 100, 100).toFixed(1);
  const status = exhausted ? '✓ 擴散耗盡,模擬停止'
    : running ? '模擬中…'
    : 'SWE 待命';
  const statusColor = exhausted ? '#22c55e' : running ? '#00b4d8' : '#64748b';

  return (
    <div style={styles.card}>
      <div style={styles.cardHead}>控制 / 時間軸</div>
      <div style={styles.cardBody}>
        <div style={styles.btnRow}>
          <button
            style={styles.btn}
            onClick={() => (running ? onPause() : onPlay())}
            disabled={exhausted}
          >
            {running ? '⏸ 暫停' : '▶ 播放'}
          </button>
          <button style={styles.btn} onClick={onReset}>↺ 重置</button>
        </div>

        {/* 進度條(不可拖曳)*/}
        <div style={styles.barOuter}>
          <div style={{ ...styles.barFill, width: pct + '%' }} />
        </div>
        <div style={styles.timeRow}>
          <span>t = {simTime.toFixed(1)} s</span>
          <span style={{ color: '#64748b' }}>{exhausted ? '已耗盡' : `上限 ${maxSimTime}s`}</span>
        </div>

        <div style={{ ...styles.status, color: statusColor }}>{status}</div>
      </div>
    </div>
  );
}

const styles = {
  card: { border: '1px solid #1a2a3a', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  cardHead: { background: 'rgba(26,42,58,0.6)', padding: '5px 9px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' },
  cardBody: { padding: 9 },
  btnRow: { display: 'flex', gap: 6, marginBottom: 8 },
  btn: { flex: 1, background: 'rgba(17,24,35,0.9)', border: '1px solid #1a2a3a', borderRadius: 3, color: '#64748b', fontFamily: 'inherit', fontSize: 13, padding: '6px 10px', cursor: 'pointer' },
  barOuter: { height: 4, background: '#1a2a3a', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', background: '#00b4d8', transition: 'width 0.1s linear' },
  timeRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#e2e8f0', marginTop: 4 },
  status: { fontSize: 13, marginTop: 6 },
};
