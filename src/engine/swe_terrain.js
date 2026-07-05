// ══════════════════════════════════════════════════════════
// swe_terrain.js — 合成地形產生器
// 所屬資料夾:flood-physics-lab/js/swe/
//
// 方案 b(使用者選定):斜面 + V型谷 + 出口平地
//   - 上游段:V型谷(左右壁坡角 alpha_L, alpha_R),沿 y 向下游有縱向坡度 S
//   - 下游段:出口後平地(緩坡 S_out),水可往兩側漫開 → 用於觀察真實擴散面積
//
// 底床高程 B(x,y) 寫入 grid.B。座標約定:
//   x:橫向(河道寬度方向),y:縱向(上游→下游)
// ══════════════════════════════════════════════════════════

const SWETerrain = {
  /**
   * 產生「斜面+V型谷+出口平地」地形,寫入 grid.B
   * @param {SWEGrid} grid
   * @param {object} opt
   *   L         谷段縱向長度(m)
   *   dh        谷段總高程差(m)→ 縱向坡度 S = dh/L
   *   w_bottom  V型谷谷底寬(m)
   *   alpha_L   左壁坡角(度)
   *   alpha_R   右壁坡角(度)
   *   S_out     出口平地坡度(無因次)
   *   outletFrac 出口位置佔縱向比例(0~1),之後為平地
   */
  buildValleyPlain(grid, opt) {
    const {
      L = 100, dh = 10, w_bottom = 0.5,
      alpha_L = 70, alpha_R = 35, S_out = 0.02,
      outletFrac = 0.6,
    } = opt;

    const { nx, ny, dx, dy } = grid;
    const aL = alpha_L * Math.PI / 180;
    const aR = alpha_R * Math.PI / 180;
    const S  = dh / L;                      // 縱向坡度
    const tanL = Math.tan(aL), tanR = Math.tan(aR);

    // 網格實際覆蓋的物理範圍
    const domainY = ny * dy;                // 縱向總長
    const cx = (nx * dx) / 2;               // 橫向中心 x 座標
    const yOutlet = domainY * outletFrac;   // 出口縱向位置

    // 谷段底部高程(縱向):上游高、下游低
    // 以出口處為基準高程 0,上游為 +? 、平地段繼續緩降
    for (let j = 0; j < ny; j++) {
      const y = j * dy;                     // 0=上游頂端 → 增加為下游
      // 谷底縱向高程
      let bedZ;
      let inValley;
      if (y <= yOutlet) {
        // 谷段:縱向線性下降
        bedZ = (yOutlet - y) * S;           // 出口處=0,上游最高
        inValley = true;
      } else {
        // 平地段:從出口續以 S_out 緩降
        bedZ = -(y - yOutlet) * S_out;
        inValley = false;
      }

      for (let i = 0; i < nx; i++) {
        const x  = i * dx;
        const dxc = x - cx;                 // 距中心橫向距離
        let B;
        if (inValley) {
          // V型谷:離谷底中心越遠,谷壁越高
          const half = w_bottom / 2;
          let wall = 0;
          if (dxc < -half)      wall = (-dxc - half) * tanL; // 左壁(陡)
          else if (dxc > half)  wall = ( dxc - half) * tanR; // 右壁(緩)
          B = bedZ + wall;
        } else {
          // 出口平地:平坦(僅縱向緩降),兩側可自由漫開
          B = bedZ;
        }
        grid.B[grid.idx(i, j)] = B;
      }
    }

    return {
      S, yOutlet, domainY,
      note: 'valley+plain 地形;出口後為平地供二維擴散',
    };
  },

  /**
   * 純斜面(方案 a 備用,對齊筆記第十節第一層解析解;此處保留供對照驗證)
   * B = (domainY - y) * S,無側壁
   */
  buildPlaneSlope(grid, opt) {
    const { S = 0.1 } = opt;
    const { nx, ny, dy } = grid;
    const domainY = ny * dy;
    for (let j = 0; j < ny; j++) {
      const bedZ = (domainY - j * dy) * S;
      for (let i = 0; i < nx; i++) grid.B[grid.idx(i, j)] = bedZ;
    }
    return { S, note: '純斜面(對照驗證用)' };
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SWETerrain };
}

export { SWETerrain };
