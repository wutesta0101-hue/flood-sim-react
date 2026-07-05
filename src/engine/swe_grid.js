// ══════════════════════════════════════════════════════════
// swe_grid.js — 2D 淺水方程網格資料結構
// 所屬資料夾:flood-physics-lab/js/swe/
//
// 儲存守恆變數場:h(水深)、hu(x動量)、hv(y動量),以及底床 B(x,y)。
// 採 cell-centered 有限體積網格(結構化笛卡爾網格)。
//
// 依據:2D SWE 標準有限體積離散
//   來源:Bi 2014, Wiley (10.1155/2014/209562)
// ══════════════════════════════════════════════════════════

class SWEGrid {
  /**
   * @param {number} nx 網格 x 方向格數
   * @param {number} ny 網格 y 方向格數
   * @param {number} dx 格寬(m)
   * @param {number} dy 格高(m)
   */
  constructor(nx, ny, dx, dy) {
    this.nx = nx;
    this.ny = ny;
    this.dx = dx;
    this.dy = dy;

    const N = nx * ny;
    // 守恆變數(cell-centered)
    this.h  = new Float64Array(N);   // 水深 (m)
    this.hu = new Float64Array(N);   // x 方向單寬動量 h*u (m^2/s)
    this.hv = new Float64Array(N);   // y 方向單寬動量 h*v (m^2/s)
    this.B  = new Float64Array(N);   // 底床高程 (m),由 terrain 設定

    // 暫存(下一時間步)
    this.h_new  = new Float64Array(N);
    this.hu_new = new Float64Array(N);
    this.hv_new = new Float64Array(N);
  }

  idx(i, j) { return j * this.nx + i; }

  // 由 h,hu,hv 取得流速(乾區回傳 0,避免除以極小水深)
  // 濕乾速度修正 來源:arXiv:2207.07261 (wetting/drying velocity fix)
  velocity(k, hDry = 1e-6) {
    const h = this.h[k];
    if (h <= hDry) return { u: 0, v: 0 };
    return { u: this.hu[k] / h, v: this.hv[k] / h };
  }

  // 水面高程 η = B + h
  eta(k) { return this.B[k] + this.h[k]; }

  // 總水量(質量守恆檢查用)
  totalVolume() {
    let V = 0;
    const cellA = this.dx * this.dy;
    for (let k = 0; k < this.h.length; k++) V += this.h[k] * cellA;
    return V;
  }

  // 濕潤面積(h > 門檻的格數 × 格面積)= 擴散面積
  wetArea(hWet = 1e-3) {
    let cnt = 0;
    for (let k = 0; k < this.h.length; k++) if (this.h[k] > hWet) cnt++;
    return cnt * this.dx * this.dy;
  }

  // 最大水深
  maxDepth() {
    let m = 0;
    for (let k = 0; k < this.h.length; k++) if (this.h[k] > m) m = this.h[k];
    return m;
  }
}

export { SWEGrid };
