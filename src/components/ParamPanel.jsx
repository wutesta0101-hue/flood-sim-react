// ══════════════════════════════════════════════════════════
// ParamPanel.jsx — 參數輸入面板
// 所屬資料夾:flood-sim-react/src/components/
//
// 參數用本地 state 暫存,按「套用並重建」鈕才回呼 onApply(方案 a)。
// 分三組:組一(山谷幾何)、組二(擴散/曼寧)、網格解析度。
// ══════════════════════════════════════════════════════════

import { useState } from 'react';

// 參數定義:key、標籤、單位、群組
const FIELDS = [
  { key: 'L',        label: '谷段長度',   unit: 'm',  group: '參數組一(山谷幾何)' },
  { key: 'dh',       label: '高程差',     unit: 'm',  group: '參數組一(山谷幾何)' },
  { key: 'w_bottom', label: '谷底寬',     unit: 'm',  group: '參數組一(山谷幾何)' },
  { key: 'alpha_L',  label: '左壁坡角',   unit: '°',  group: '參數組一(山谷幾何)' },
  { key: 'alpha_R',  label: '右壁坡角',   unit: '°',  group: '參數組一(山谷幾何)' },
  { key: 'n',        label: '曼寧 n',     unit: '',   group: '參數組二(擴散)' },
  { key: 'S_out',    label: '平地坡度',   unit: '',   group: '參數組二(擴散)' },
  { key: 'nx',       label: '網格數 nx',  unit: '格', group: '網格解析度' },
  { key: 'ny',       label: '網格數 ny',  unit: '格', group: '網格解析度' },
  { key: 'dc',       label: '格距',       unit: 'm',  group: '網格解析度' },
];

export default function ParamPanel({ initial, onApply }) {
  // 本地暫存(輸入不即時重建)
  const [vals, setVals] = useState(() => {
    const v = {};
    FIELDS.forEach(f => { v[f.key] = initial[f.key]; });
    return v;
  });

  const setVal = (key, raw) => {
    setVals(prev => ({ ...prev, [key]: raw }));
  };

  const apply = () => {
    // 轉數字並回呼
    const parsed = {};
    FIELDS.forEach(f => {
      const num = parseFloat(vals[f.key]);
      parsed[f.key] = isNaN(num) ? initial[f.key] : num;
    });
    onApply(parsed);
  };

  // 依群組分區渲染
  const groups = [...new Set(FIELDS.map(f => f.group))];

  return (
    <div style={styles.card}>
      <div style={styles.cardHead}>參數輸入</div>
      <div style={styles.cardBody}>
        {groups.map(g => (
          <div key={g} style={styles.group}>
            <div style={styles.groupLabel}>{g}</div>
            {FIELDS.filter(f => f.group === g).map(f => (
              <div key={f.key} style={styles.row}>
                <span style={styles.label}>{f.label}</span>
                <input
                  style={styles.input}
                  type="number"
                  value={vals[f.key]}
                  onChange={e => setVal(f.key, e.target.value)}
                />
                <span style={styles.unit}>{f.unit}</span>
              </div>
            ))}
          </div>
        ))}
        <button style={styles.applyBtn} onClick={apply}>套用並重建</button>
      </div>
    </div>
  );
}

const styles = {
  card: { border: '1px solid #1a2a3a', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  cardHead: { background: 'rgba(26,42,58,0.6)', padding: '5px 9px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' },
  cardBody: { padding: 9 },
  group: { marginBottom: 8 },
  groupLabel: { fontSize: 12, color: '#00b4d8', marginBottom: 4, paddingBottom: 2, borderBottom: '1px solid rgba(26,42,58,0.6)' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' },
  label: { fontSize: 13, color: '#64748b' },
  input: { width: 70, background: 'rgba(10,14,20,0.8)', border: '1px solid #1a2a3a', borderRadius: 2, color: '#00b4d8', fontFamily: 'inherit', fontSize: 13, padding: '3px 6px', textAlign: 'right' },
  unit: { fontSize: 13, color: '#64748b', width: 24, textAlign: 'left', marginLeft: 4 },
  applyBtn: { width: '100%', marginTop: 8, background: 'rgba(0,180,216,0.15)', border: '1px solid #00b4d8', borderRadius: 3, color: '#00b4d8', fontFamily: 'inherit', fontSize: 13, padding: '7px', cursor: 'pointer' },
};
