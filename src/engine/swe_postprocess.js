// ══════════════════════════════════════════════════════════
// swe_postprocess.js — 2D SWE 後處理累積器
// 所屬資料夾:flood-physics-lab/js/swe/
//
// 用途:累積「跨時間」的災害輸出量。需在每個 solver.step() 後呼叫 accumulate()。
//
// 輸出場(標準潰壩 2D 模型輸出):
//   - arrivalTime(x,y):每格首次變濕的時刻(s),未濕為 -1
//   - maxDepth(x,y)   :歷程最大水深(m)
//   - maxSpeed(x,y)   :歷程最大流速(m/s)
//   - hazard(x,y)     :破壞參數 = 歷程最大 (h·|U|)  ← 文獻標準災害指標
//         來源:ScienceDirect S0022169423001348(潰壩 2D 模型輸出指引,含 h×v)
//
// 純量統計:總淹沒面積、全場最大水深、波前最遠推進距離(距注水源)。
// ══════════════════════════════════════════════════════════

class SWEPostProcess {
  /**
   * @param {SWEGrid} grid
   * @param {object} opt
   *   hWet     濕判定門檻(m),預設 1e-3
   *   sourceIJ 波前距離的參考原點 {i, j}(通常為注水源/出口);不給則不算距離
   */
  constructor(grid, opt = {}) {
    this.grid = grid;
    this.hWet = opt.hWet !== undefined ? opt.hWet : 1e-3;
    this.sourceIJ = opt.sourceIJ || null;

    const N = grid.nx * grid.ny;
    this.arrivalTime = new Float64Array(N).fill(-1); // -1 = 尚未濕
    this.maxDepth    = new Float64Array(N);
    this.maxSpeed    = new Float64Array(N);
    this.hazard      = new Float64Array(N);          // max(h·|U|)
  }

  /**
   * 每個時間步後呼叫:更新所有累積場。
   * @param {number} t 當前模擬時間(s)
   */
  accumulate(t) {
    const g = this.grid;
    const N = g.nx * g.ny;
    for (let k = 0; k < N; k++) {
      const h = g.h[k];
      if (h <= this.hWet) continue;
      // 首次變濕 → 記錄到達時間
      if (this.arrivalTime[k] < 0) this.arrivalTime[k] = t;
      // 最大水深
      if (h > this.maxDepth[k]) this.maxDepth[k] = h;
      // 流速與破壞參數
      const u = g.hu[k] / h, v = g.hv[k] / h;
      const speed = Math.sqrt(u * u + v * v);
      if (speed > this.maxSpeed[k]) this.maxSpeed[k] = speed;
      const hz = h * speed;
      if (hz > this.hazard[k]) this.hazard[k] = hz;
    }
  }

  /** 總淹沒面積(曾經濕過的格 × 格面積)= 最終擴散面積 */
  inundatedArea() {
    let cnt = 0;
    for (let k = 0; k < this.arrivalTime.length; k++) if (this.arrivalTime[k] >= 0) cnt++;
    return cnt * this.grid.dx * this.grid.dy;
  }

  /** 全場歷程最大水深 */
  peakDepth() {
    let m = 0;
    for (let k = 0; k < this.maxDepth.length; k++) if (this.maxDepth[k] > m) m = this.maxDepth[k];
    return m;
  }

  /** 全場歷程最大流速 */
  peakSpeed() {
    let m = 0;
    for (let k = 0; k < this.maxSpeed.length; k++) if (this.maxSpeed[k] > m) m = this.maxSpeed[k];
    return m;
  }

  /** 全場最大破壞參數 max(h·|U|) */
  peakHazard() {
    let m = 0;
    for (let k = 0; k < this.hazard.length; k++) if (this.hazard[k] > m) m = this.hazard[k];
    return m;
  }

  /**
   * 波前最遠推進距離(距 sourceIJ 的最遠濕潤格,歐氏距離,m)。
   * 未提供 sourceIJ 時回傳 null。
   */
  frontDistance() {
    if (!this.sourceIJ) return null;
    const g = this.grid;
    const { i: si, j: sj } = this.sourceIJ;
    let maxDist = 0;
    for (let j = 0; j < g.ny; j++) {
      for (let i = 0; i < g.nx; i++) {
        const k = g.idx(i, j);
        if (this.arrivalTime[k] < 0) continue;
        const dx = (i - si) * g.dx, dy = (j - sj) * g.dy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > maxDist) maxDist = d;
      }
    }
    return maxDist;
  }

  /** 一次取得所有純量統計(供儀表板顯示) */
  summary() {
    return {
      inundatedArea_m2: this.inundatedArea(),
      peakDepth_m:      this.peakDepth(),
      peakSpeed_ms:     this.peakSpeed(),
      peakHazard:       this.peakHazard(),  // 單位 m²/s (= m · m/s)
      frontDistance_m:  this.frontDistance(),
    };
  }

  /**
   * 擴散耗盡判定(方案 B 停止條件)。
   * 判據:全場當前最大流速 < velEps,且淹沒面積連續 stableN 次呼叫變化 < areaEps。
   * 需每步呼叫(內部維護面積歷史)。回傳 true 表示可停止模擬。
   * 標記:此判據為工程停止條件(對應 SWE 濕乾前鋒停止),非唯一標準做法;
   *       門檻值 velEps/areaEps 為經驗設定,待技術手冊記錄與校準。
   * @param {object} opt velEps(m/s,預設0.01)、areaEps(相對變化,預設0.001)、stableN(預設20)
   */
  isExhausted(opt = {}) {
    const velEps  = opt.velEps  !== undefined ? opt.velEps  : 0.01;
    const areaEps = opt.areaEps !== undefined ? opt.areaEps : 0.001;
    const stableN = opt.stableN !== undefined ? opt.stableN : 20;

    // 當前全場最大流速(即時,非歷程)
    const g = this.grid;
    let vMax = 0;
    for (let k = 0; k < g.h.length; k++) {
      const h = g.h[k];
      if (h <= this.hWet) continue;
      const u = g.hu[k] / h, v = g.hv[k] / h;
      const s = Math.sqrt(u * u + v * v);
      if (s > vMax) vMax = s;
    }

    // 面積穩定度(維護一個小歷史)
    const area = this.inundatedArea();
    if (!this._areaHist) this._areaHist = [];
    this._areaHist.push(area);
    if (this._areaHist.length > stableN) this._areaHist.shift();

    let areaStable = false;
    if (this._areaHist.length >= stableN) {
      const first = this._areaHist[0], last = this._areaHist[this._areaHist.length - 1];
      const rel = first > 0 ? Math.abs(last - first) / first : 0;
      areaStable = rel < areaEps;
    }

    return vMax < velEps && areaStable;
  }

  /** 重置所有累積場(重跑模擬用) */
  reset() {
    this.arrivalTime.fill(-1);
    this.maxDepth.fill(0);
    this.maxSpeed.fill(0);
    this.hazard.fill(0);
    this._areaHist = [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SWEPostProcess };
}

export { SWEPostProcess };
