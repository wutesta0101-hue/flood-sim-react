// ══════════════════════════════════════════════════════════
// useSWESimulation.js — 2D SWE 模擬迴圈 React Hook
// 所屬資料夾:flood-sim-react/src/hooks/
//
// 職責:建立引擎(grid/terrain/solver/postprocess)、每幀推進、
//       耗盡自動停止(方案 B)、對外提供即時摘要數據。
//
// 設計(R3F 效能慣例):
//   - 引擎重物件(grid/solver/post)放 useRef,避免每幀觸發 re-render
//   - 僅「要顯示的摘要」放 state,且節流更新(每數幀一次)
//   - 每幀推進由呼叫端的 useFrame 驅動(呼叫 stepSim),此 hook 不自帶 rAF
// ══════════════════════════════════════════════════════════

import { useRef, useState, useCallback } from 'react';
import { SWEGrid } from '../engine/swe_grid.js';
import { SWETerrain } from '../engine/swe_terrain.js';
import { SWESolver } from '../engine/swe_solver.js';
import { SWEPostProcess } from '../engine/swe_postprocess.js';

const DEFAULT_PARAMS = {
  // 參數組一(山谷幾何)
  L: 100, dh: 10, w_bottom: 4, alpha_L: 70, alpha_R: 35,
  // 參數組二(擴散/曼寧)
  n: 0.03, S_out: 0.02,
  // 網格
  nx: 60, ny: 80, dc: 1.5,
  // 停止上限(秒)
  maxSimTime: 600,
};

export function useSWESimulation() {
  // 引擎重物件(不進 React state)
  const gridRef   = useRef(null);
  const solverRef = useRef(null);
  const postRef   = useRef(null);
  const paramsRef = useRef({ ...DEFAULT_PARAMS });
  const frameCount = useRef(0);

  // 對外顯示狀態(節流更新)
  const [summary, setSummary] = useState(null);
  const [simTime, setSimTime] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);

  // 事件記錄(新增,供 EventLog 元件)
  const [logs, setLogs] = useState([]);
  const addLog = useCallback((msg, level = 'info') => {
    const now = new Date();
    const ts = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLogs(prev => [...prev.slice(-49), { ts, msg, level }]); // 最多留 50 筆
  }, []);

  // ── 建立/重建引擎 ──
  const build = useCallback((overrides = {}) => {
    const p = { ...paramsRef.current, ...overrides };
    paramsRef.current = p;

    const grid = new SWEGrid(p.nx, p.ny, p.dc, p.dc);
    SWETerrain.buildValleyPlain(grid, {
      L: p.L, dh: p.dh, w_bottom: p.w_bottom,
      alpha_L: p.alpha_L, alpha_R: p.alpha_R,
      S_out: p.S_out, outletFrac: 0.55,
    });
    // 初始蓄水:上游頂端 V 谷內注水
    grid.h.fill(0); grid.hu.fill(0); grid.hv.fill(0);
    const fillRows = Math.max(6, Math.floor(p.ny * 0.12));
    for (let j = 0; j < fillRows; j++) {
      for (let i = 0; i < p.nx; i++) {
        const k = grid.idx(i, j);
        const bedCenter = grid.B[grid.idx(Math.floor(p.nx / 2), j)];
        const fill = (p.dh * 0.6) - (grid.B[k] - bedCenter);
        if (fill > 0) grid.h[k] = Math.min(fill, p.dh * 0.4);
      }
    }
    gridRef.current   = grid;
    solverRef.current = new SWESolver(grid, { n: p.n, cfl: 0.4, hDry: 1e-4 });
    postRef.current   = new SWEPostProcess(grid, { hWet: 1e-3, sourceIJ: { i: Math.floor(p.nx / 2), j: 0 } });

    frameCount.current = 0;
    setExhausted(false);
    setRunning(false);
    setSimTime(0);
    setSummary(postRef.current.summary());
    setReady(true);
    addLog(`SWE 建立 ${p.nx}×${p.ny} 格距${p.dc}m`, 'info');
  }, [addLog]);

  // ── 每幀推進(由呼叫端 useFrame 驅動)──
  // 回傳 true 表示本幀有更新(供場景決定是否重繪水面)
  const stepSim = useCallback((substeps = 4) => {
    if (!running || exhausted) return false;
    const solver = solverRef.current, post = postRef.current;
    if (!solver || !post) return false;

    for (let s = 0; s < substeps; s++) {
      solver.step();
      post.accumulate(solver.t);
    }
    frameCount.current++;

    // 節流:每 3 幀更新一次顯示狀態
    if (frameCount.current % 3 === 0) {
      setSimTime(solver.t);
      setSummary(post.summary());
    }

    // 耗盡判定(方案 B)
    if (post.isExhausted({ velEps: 0.01, areaEps: 0.001, stableN: 30 })) {
      setExhausted(true);
      setRunning(false);
      setSimTime(solver.t);
      setSummary(post.summary());
      addLog(`擴散耗盡 t=${solver.t.toFixed(1)}s 面積=${post.inundatedArea().toFixed(0)}m²`, 'ok');
      return true;
    }
    // 時間上限
    if (solver.t >= paramsRef.current.maxSimTime) {
      setRunning(false);
      setSimTime(solver.t);
      setSummary(post.summary());
    }
    return true;
  }, [running, exhausted, addLog]);

  const play  = useCallback(() => { if (ready && !exhausted) { setRunning(true); addLog('開始模擬', 'info'); } }, [ready, exhausted, addLog]);
  const pause = useCallback(() => { setRunning(false); addLog('暫停', 'info'); }, [addLog]);
  const reset = useCallback(() => { build(); addLog('重置', 'info'); }, [build, addLog]);

  return {
    // 引擎存取(供場景讀 grid / 累積場)
    gridRef,
    postRef,
    // 狀態
    summary, simTime, exhausted, running, ready,
    logs,
    params: paramsRef.current,
    maxSimTime: paramsRef.current.maxSimTime,
    // 控制
    build, stepSim, play, pause, reset, addLog,
  };
}
