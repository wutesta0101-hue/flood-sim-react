// ══════════════════════════════════════════════════════════
// swe_solver.js — 2D 淺水方程核心求解器
// 所屬資料夾:flood-physics-lab/js/swe/
//
// 【採用方案 X(嚴謹)】
//   Godunov 型有限體積 + HLL 近似黎曼求解器 + 半隱式曼寧摩擦 + 濕乾前鋒
//   來源:
//     - 有限體積 / CFL:Bi 2014, Wiley (10.1155/2014/209562),Courant 數 C≈0.8
//     - 半隱式摩擦(水深趨零時穩定):Cea & Bladé 2015, AGU WRR (10.1002/2014WR016547)
//     - 濕乾速度修正:arXiv:2207.07261
//
// 【另有方案 Y(簡化,未採用)】
//   局部慣性近似(de Almeida / LISFLOOD-FP 類):省略對流慣性項,較易寫且前端較快,
//   但弱於完整動量守恆。若前端效能不足,可將 computeFluxHLL 換成局部慣性通量。
//   標記:此為簡化替代,非本檔目前實作。
//
// 控制方程(守恆形式,含地形源項 -g h ∂B 與曼寧摩擦源項):
//   ∂h/∂t + ∂(hu)/∂x + ∂(hv)/∂y = 0
//   ∂(hu)/∂t + ∂(hu²+½gh²)/∂x + ∂(huv)/∂y = -g h ∂B/∂x - C_f u|U|
//   ∂(hv)/∂t + ∂(huv)/∂x + ∂(hv²+½gh²)/∂y = -g h ∂B/∂y - C_f v|U|
//   其中 C_f = g n² / h^{1/3}
// ══════════════════════════════════════════════════════════

class SWESolver {
  constructor(grid, opt = {}) {
    this.grid = grid;
    this.g    = 9.81;
    this.n    = opt.n !== undefined ? opt.n : 0.03;  // 曼寧係數
    this.hDry = opt.hDry !== undefined ? opt.hDry : 1e-4; // 乾判定門檻(m)
    this.cfl  = opt.cfl !== undefined ? opt.cfl : 0.45;   // Courant 數(≤ ~0.5 for 2D 顯式)
    this.t    = 0;
  }

  // ── HLL 一維界面通量(給定左右狀態的守恆量 (h, hn) ,n 為法向動量)──
  // 回傳 [Fh, Fhn, Fht](質量、法向動量、切向動量 通量)
  // 標準 HLL:來源 Bi 2014 引用 HLL/HLLC(Toro)
  _hll(hL, hnL, htL, hR, hnR, htR) {
    const g = this.g;
    const uL = hL > this.hDry ? hnL / hL : 0;
    const uR = hR > this.hDry ? hnR / hR : 0;
    const cL = Math.sqrt(g * Math.max(hL, 0));
    const cR = Math.sqrt(g * Math.max(hR, 0));

    // 波速估計(Einfeldt 型)
    const uStar = 0.5 * (uL + uR) + cL - cR;
    const cStar = 0.5 * (cL + cR) + 0.25 * (uL - uR);
    const sL = Math.min(uL - cL, uStar - cStar);
    const sR = Math.max(uR + cR, uStar + cStar);

    // 法向通量函數 f(U) = [h u, h u² + ½gh², h u v_t]
    const fL = [hnL, hnL * uL + 0.5 * g * hL * hL, hnL * (htL / (hL > this.hDry ? hL : 1))];
    const fR = [hnR, hnR * uR + 0.5 * g * hR * hR, hnR * (htR / (hR > this.hDry ? hR : 1))];
    const UL = [hL, hnL, htL];
    const UR = [hR, hnR, htR];

    if (sL >= 0) return fL;
    if (sR <= 0) return fR;
    // HLL 中間狀態通量
    const out = [0, 0, 0];
    const inv = 1 / (sR - sL);
    for (let m = 0; m < 3; m++) {
      out[m] = (sR * fL[m] - sL * fR[m] + sL * sR * (UR[m] - UL[m])) * inv;
    }
    return out;
  }

  // ── 依 CFL 計算穩定時間步 ──
  computeDt() {
    const { h, hu, hv, dx, dy } = this.grid;
    let maxSpeed = 1e-6;
    for (let k = 0; k < h.length; k++) {
      if (h[k] <= this.hDry) continue;
      const u = hu[k] / h[k], v = hv[k] / h[k];
      const c = Math.sqrt(this.g * h[k]);
      maxSpeed = Math.max(maxSpeed, Math.abs(u) + c, Math.abs(v) + c);
    }
    const dmin = Math.min(dx, dy);
    return this.cfl * dmin / maxSpeed;
  }

  // ── 單一時間步(算子分裂:先通量更新,再半隱式摩擦)──
  step(dtMax = Infinity) {
    const g = this.grid;
    const { nx, ny, dx, dy } = g;
    let dt = Math.min(this.computeDt(), dtMax);
    if (!isFinite(dt) || dt <= 0) dt = 1e-4;

    // 複製現值
    g.h_new.set(g.h); g.hu_new.set(g.hu); g.hv_new.set(g.hv);

    // x 方向界面通量 — 含 Hydrostatic Reconstruction(靜水平衡 well-balanced)
    // 來源:Audusse et al. 2004 (SIAM J. Sci. Comput. 25:2050),經 arXiv:2207.07261 / Cea&Bladé 2015 引用
    // 作法:界面底床 Bface=max(BL,BR),重建 h*=max(0,η-Bface),用 h* 算通量,
    //       並補平衡源項 ½g(h*² - h²),使靜水(η=const)時通量與源項精確抵消。
    // (此段修正先前「靜水平衡殘餘假流速」問題 — 已知問題修正,詳見技術手冊)
    const g_ = this.g;
    for (let j = 0; j < ny; j++) {
      for (let i = -1; i < nx; i++) {
        const iL = i, iR = i + 1;
        let hL, hnL, htL, BL, hR, hnR, htR, BR;
        if (iL < 0) {
          const kR0 = g.idx(iR, j);
          hR = g.h[kR0]; hnR = g.hu[kR0]; htR = g.hv[kR0]; BR = g.B[kR0];
          hL = hR; hnL = -hnR; htL = htR; BL = BR;               // 反射左邊界
        } else if (iR >= nx) {
          const kL0 = g.idx(iL, j);
          hL = g.h[kL0]; hnL = g.hu[kL0]; htL = g.hv[kL0]; BL = g.B[kL0];
          hR = hL; hnR = -hnL; htR = htL; BR = BL;               // 反射右邊界
        } else {
          const kL0 = g.idx(iL, j), kR0 = g.idx(iR, j);
          hL = g.h[kL0]; hnL = g.hu[kL0]; htL = g.hv[kL0]; BL = g.B[kL0];
          hR = g.h[kR0]; hnR = g.hu[kR0]; htR = g.hv[kR0]; BR = g.B[kR0];
        }
        // Hydrostatic reconstruction
        const Bface = Math.max(BL, BR);
        const etaL = BL + hL, etaR = BR + hR;
        const hLs = Math.max(0, etaL - Bface);
        const hRs = Math.max(0, etaR - Bface);
        const uL = hL > this.hDry ? hnL / hL : 0, vL = hL > this.hDry ? htL / hL : 0;
        const uR = hR > this.hDry ? hnR / hR : 0, vR = hR > this.hDry ? htR / hR : 0;
        const F = this._hll(hLs, hLs*uL, hLs*vL, hRs, hRs*uR, hRs*vR);
        const c = dt / dx;
        // 平衡地形源項(僅作用於法向動量):½g(h*² - h²)
        const srcL = 0.5 * g_ * (hLs*hLs - hL*hL);
        const srcR = 0.5 * g_ * (hRs*hRs - hR*hR);
        if (iL >= 0) { const kL0 = g.idx(iL, j); g.h_new[kL0] -= c*F[0]; g.hu_new[kL0] -= c*(F[1] - srcL); g.hv_new[kL0] -= c*F[2]; }
        if (iR < nx) { const kR0 = g.idx(iR, j); g.h_new[kR0] += c*F[0]; g.hu_new[kR0] += c*(F[1] - srcR); g.hv_new[kR0] += c*F[2]; }
      }
    }
    // y 方向界面通量 — 含 Hydrostatic Reconstruction(法向 = y,切向 = x;含上下反射邊界)
    for (let i = 0; i < nx; i++) {
      for (let j = -1; j < ny; j++) {
        const jL = j, jR = j + 1;
        let hL, hnL, htL, BL, hR, hnR, htR, BR;
        if (jL < 0) {
          const kR0 = g.idx(i, jR);
          hR = g.h[kR0]; hnR = g.hv[kR0]; htR = g.hu[kR0]; BR = g.B[kR0];
          hL = hR; hnL = -hnR; htL = htR; BL = BR;
        } else if (jR >= ny) {
          const kL0 = g.idx(i, jL);
          hL = g.h[kL0]; hnL = g.hv[kL0]; htL = g.hu[kL0]; BL = g.B[kL0];
          hR = hL; hnR = -hnL; htR = htL; BR = BL;
        } else {
          const kL0 = g.idx(i, jL), kR0 = g.idx(i, jR);
          hL = g.h[kL0]; hnL = g.hv[kL0]; htL = g.hu[kL0]; BL = g.B[kL0];
          hR = g.h[kR0]; hnR = g.hv[kR0]; htR = g.hu[kR0]; BR = g.B[kR0];
        }
        const Bface = Math.max(BL, BR);
        const hLs = Math.max(0, BL + hL - Bface);
        const hRs = Math.max(0, BR + hR - Bface);
        const uL = hL > this.hDry ? hnL / hL : 0, vL = hL > this.hDry ? htL / hL : 0;
        const uR = hR > this.hDry ? hnR / hR : 0, vR = hR > this.hDry ? htR / hR : 0;
        const F = this._hll(hLs, hLs*uL, hLs*vL, hRs, hRs*uR, hRs*vR);
        const c = dt / dy;
        const srcL = 0.5 * g_ * (hLs*hLs - hL*hL);
        const srcR = 0.5 * g_ * (hRs*hRs - hR*hR);
        if (jL >= 0) { const kL0 = g.idx(i, jL); g.h_new[kL0] -= c*F[0]; g.hv_new[kL0] -= c*(F[1] - srcL); g.hu_new[kL0] -= c*F[2]; }
        if (jR < ny) { const kR0 = g.idx(i, jR); g.h_new[kR0] += c*F[0]; g.hv_new[kR0] += c*(F[1] - srcR); g.hu_new[kR0] += c*F[2]; }
      }
    }

    // 半隱式曼寧摩擦(地形源項已於 hydrostatic reconstruction 界面平衡,此處不再重複)
    // 來源:Cea & Bladé 2015 — 半隱式,保證水深趨零時單寬流量平滑趨零
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = g.idx(i, j);
        let h = g.h_new[k];
        if (h < 0) h = 0;
        if (h > this.hDry) {
          const u = g.hu_new[k] / h, v = g.hv_new[k] / h;
          const speed = Math.sqrt(u * u + v * v);
          const Cf = this.g * this.n * this.n / Math.pow(h, 1 / 3);
          const denom = 1 + dt * Cf * speed / h;
          g.hu_new[k] /= denom;
          g.hv_new[k] /= denom;
        } else {
          g.hu_new[k] = 0;   // 乾格:速度歸零(濕乾處理)
          g.hv_new[k] = 0;
        }
        g.h_new[k] = h;
      }
    }

    // 提交
    g.h.set(g.h_new); g.hu.set(g.hu_new); g.hv.set(g.hv_new);
    this.t += dt;
    return dt;
  }

  // 邊界:預設反射(閉邊界)。入流由外部在指定格注入。
  applyReflectiveBC() {
    const g = this.grid, { nx, ny } = g;
    for (let i = 0; i < nx; i++) {
      // 上下邊
      let kt = g.idx(i, 0), kb = g.idx(i, ny - 1);
      g.hv[kt] = 0; g.hv[kb] = 0;
    }
    for (let j = 0; j < ny; j++) {
      let kl = g.idx(0, j), kr = g.idx(nx - 1, j);
      g.hu[kl] = 0; g.hu[kr] = 0;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SWESolver };
}

export { SWESolver };
