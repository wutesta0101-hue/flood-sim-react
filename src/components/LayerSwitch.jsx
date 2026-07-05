// ══════════════════════════════════════════════════════════
// LayerSwitch.jsx — 圖層切換面板
// 所屬資料夾:flood-sim-react/src/components/
//
// 四選一切換場景顯示的圖層:即時水深 / 到達時間 / 最大水深 / 破壞參數。
// 切換式(一次一種)。附色階圖例。
// ══════════════════════════════════════════════════════════

import { LAYERS } from '../scene/colormap.js';

export default function LayerSwitch({ current, onChange }) {
  const items = Object.values(LAYERS);
  return (
    <div style={styles.card}>
      <div style={styles.cardHead}>顯示圖層</div>
      <div style={styles.cardBody}>
        <div style={styles.btnGrid}>
          {items.map(l => (
            <button
              key={l.key}
              style={{
                ...styles.btn,
                ...(current === l.key ? styles.btnActive : {}),
              }}
              onClick={() => onChange(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>
        {/* 色階圖例(即時水深以外顯示 低→高)*/}
        <div style={styles.legend}>
          <span style={styles.legLabel}>低</span>
          <div style={styles.legBar} />
          <span style={styles.legLabel}>高</span>
        </div>
        <div style={styles.legUnit}>
          {LAYERS[current]?.label}({LAYERS[current]?.unit})
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: { border: '1px solid #1a2a3a', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  cardHead: { background: 'rgba(26,42,58,0.6)', padding: '5px 9px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' },
  cardBody: { padding: 9 },
  btnGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 },
  btn: { background: 'rgba(17,24,35,0.9)', border: '1px solid #1a2a3a', borderRadius: 3, color: '#64748b', fontFamily: 'inherit', fontSize: 13, padding: '6px 8px', cursor: 'pointer' },
  btnActive: { border: '1px solid #00b4d8', color: '#00b4d8', background: 'rgba(0,180,216,0.15)' },
  legend: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 },
  legLabel: { fontSize: 12, color: '#64748b' },
  // 色階條(對應 colormap:藍→青→綠→黃→紅)
  legBar: { flex: 1, height: 8, borderRadius: 2, background: 'linear-gradient(to right, rgb(0,51,153), rgb(0,179,230), rgb(51,204,77), rgb(242,217,51), rgb(230,51,38))' },
  legUnit: { fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'center' },
};
