// ══════════════════════════════════════════════════════════
// colormap.js — 熱力圖色階函式
// 所屬資料夾:flood-sim-react/src/scene/
//
// 純函式:輸入正規化值 t∈[0,1],輸出 [r,g,b](各 0~1)。
// 提供科學色階(藍→青→綠→黃→紅),低值藍、高值紅。
// ══════════════════════════════════════════════════════════

// 線性內插
function lerp(a, b, t) { return a + (b - a) * t; }

// 藍→青→綠→黃→紅 五段色階(jet 類)
const STOPS = [
  { t: 0.00, c: [0.0, 0.2, 0.6] },  // 深藍(低)
  { t: 0.25, c: [0.0, 0.7, 0.9] },  // 青
  { t: 0.50, c: [0.2, 0.8, 0.3] },  // 綠
  { t: 0.75, c: [0.95, 0.85, 0.2] },// 黃
  { t: 1.00, c: [0.9, 0.2, 0.15] }, // 紅(高)
];

/**
 * 正規化值 → RGB
 * @param {number} t 0~1(超出範圍會截斷)
 * @returns {[number,number,number]} r,g,b ∈ 0~1
 */
export function colormap(t) {
  if (isNaN(t)) return [0.15, 0.18, 0.22]; // 無資料 → 地形灰
  t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i], b = STOPS[i + 1];
    if (t >= a.t && t <= b.t) {
      const lt = (t - a.t) / (b.t - a.t);
      return [lerp(a.c[0], b.c[0], lt), lerp(a.c[1], b.c[1], lt), lerp(a.c[2], b.c[2], lt)];
    }
  }
  return STOPS[STOPS.length - 1].c;
}

// 圖層定義(供 UI 與場景共用)
export const LAYERS = {
  depth:   { key: 'depth',   label: '即時水深',   unit: 'm',    field: 'live' },      // 特殊:即時 grid.h
  arrival: { key: 'arrival', label: '到達時間',   unit: 's',    field: 'arrivalTime' },
  maxdep:  { key: 'maxdep',  label: '最大水深',   unit: 'm',    field: 'maxDepth' },
  hazard:  { key: 'hazard',  label: '破壞參數',   unit: 'm²/s', field: 'hazard' },
};
