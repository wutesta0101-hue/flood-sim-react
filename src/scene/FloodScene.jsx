// ══════════════════════════════════════════════════════════
// FloodScene.jsx — 2D SWE 網格視覺化(React Three Fiber)
// 所屬資料夾:flood-sim-react/src/scene/
//
// 由 swe_scene.js 改寫為 R3F 宣告式元件。
// 差異:renderer/camera/animate 由 <Canvas> 接管;本元件只負責
//       地形網格(靜態)與水面網格(每幀更新)。
// 視覺邏輯(高程著色、水深著色)沿用原 swe_scene.js,未更動。
//
// Position 慣例(同原檔):
//   物理 x(橫向)→ Three x;高程 → Three y(向上);縱向 → Three z(負)
// ══════════════════════════════════════════════════════════

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { colormap } from './colormap.js';

// 物理格中心 → 場景座標
function toScene(i, j, elev, grid, SCALE, vScale) {
  const spanX = grid.nx * grid.dx, spanY = grid.ny * grid.dy;
  const x = (i * grid.dx - spanX / 2) * SCALE;
  const z = -(j * grid.dy - spanY / 2) * SCALE;
  const y = elev * vScale * SCALE;
  return [x, y, z];
}

// ── 地形層(靜態,只在 grid 改變時重建)──
function TerrainMesh({ grid, SCALE, vScale }) {
  const geo = useMemo(() => {
    const g = grid;
    const verts = [], colors = [], idx = [];
    let bMin = Infinity, bMax = -Infinity;
    for (let k = 0; k < g.B.length; k++) { bMin = Math.min(bMin, g.B[k]); bMax = Math.max(bMax, g.B[k]); }
    const bRange = (bMax - bMin) || 1;
    for (let j = 0; j < g.ny; j++) {
      for (let i = 0; i < g.nx; i++) {
        const k = g.idx(i, j);
        const [x, y, z] = toScene(i, j, g.B[k], g, SCALE, vScale);
        verts.push(x, y, z);
        const t = (g.B[k] - bMin) / bRange;
        colors.push(0.15 + t * 0.35, 0.18 + t * 0.30, 0.22 + t * 0.28);
      }
    }
    for (let j = 0; j < g.ny - 1; j++) {
      for (let i = 0; i < g.nx - 1; i++) {
        const a = j * g.nx + i, b = a + 1, c = a + g.nx, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(idx);
    geometry.computeVertexNormals();
    return geometry;
  }, [grid, SCALE, vScale]);

  return (
    <mesh geometry={geo}>
      <meshPhongMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── 水面層(每幀更新頂點位置與顏色)──
function WaterMesh({ grid, postRef, layer, SCALE, vScale, hWet }) {
  const meshRef = useRef();
  const geoRef = useRef();

  // 初始化幾何(頂點數固定同地形拓樸)
  const { geometry, posAttr, colAttr } = useMemo(() => {
    const g = grid;
    const N = g.nx * g.ny;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const idx = [];
    for (let j = 0; j < g.ny - 1; j++) {
      for (let i = 0; i < g.nx - 1; i++) {
        const a = j * g.nx + i, b = a + 1, c = a + g.nx, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geom = new THREE.BufferGeometry();
    const posA = new THREE.BufferAttribute(pos, 3);
    const colA = new THREE.BufferAttribute(col, 3);
    geom.setAttribute('position', posA);
    geom.setAttribute('color', colA);
    geom.setIndex(idx);
    return { geometry: geom, posAttr: posA, colAttr: colA };
  }, [grid]);

  geoRef.current = geometry;

  // 每幀更新:依 layer 決定上色方式
  useFrame(() => {
    const g = grid;
    if (!g) return;
    const pos = posAttr.array, col = colAttr.array;
    const post = postRef?.current;

    // 場圖層模式(非即時水深):讀累積場,先求最大值以正規化
    const isField = layer !== 'depth' && post;
    let fieldArr = null, fMax = 1;
    if (isField) {
      if (layer === 'arrival')      fieldArr = post.arrivalTime;
      else if (layer === 'maxdep')  fieldArr = post.maxDepth;
      else if (layer === 'hazard')  fieldArr = post.hazard;
      if (fieldArr) {
        for (let k = 0; k < fieldArr.length; k++) {
          const v = fieldArr[k];
          if (v > fMax && isFinite(v)) fMax = v;
        }
      }
    }

    const dMax = g.maxDepth() || 1;
    for (let j = 0; j < g.ny; j++) {
      for (let i = 0; i < g.nx; i++) {
        const k = g.idx(i, j);
        const h = g.h[k];

        if (isField && fieldArr) {
          // ── 場圖層:熱力圖鋪在地表 ──
          const raw = fieldArr[k];
          const hasData = (layer === 'arrival') ? (raw >= 0) : (raw > 0);
          const elev = g.B[k]; // 貼地形
          const [x, y, z] = toScene(i, j, elev, g, SCALE, vScale);
          pos[k * 3] = x; pos[k * 3 + 1] = y + 0.05; pos[k * 3 + 2] = z; // 微抬避免 z-fighting
          if (hasData) {
            const t = Math.min(raw / fMax, 1);
            const [r, gg, b] = colormap(t);
            col[k * 3] = r; col[k * 3 + 1] = gg; col[k * 3 + 2] = b;
          } else {
            col[k * 3] = 0.15; col[k * 3 + 1] = 0.18; col[k * 3 + 2] = 0.22; // 無資料
          }
        } else {
          // ── 即時水深模式(原邏輯)──
          const wet = h > hWet;
          const elev = wet ? (g.B[k] + h) : g.B[k];
          const [x, y, z] = toScene(i, j, elev, g, SCALE, vScale);
          pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
          if (wet) {
            const t = Math.min(h / dMax, 1);
            col[k * 3] = 0.0; col[k * 3 + 1] = 0.5 + t * 0.3; col[k * 3 + 2] = 0.85 - t * 0.15;
          } else {
            col[k * 3] = 0.15; col[k * 3 + 1] = 0.18; col[k * 3 + 2] = 0.22;
          }
        }
      }
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhongMaterial vertexColors transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ── 主場景元件 ──
export default function FloodScene({ gridRef, postRef, layer = 'depth', vScale = 1, hWet = 1e-3 }) {
  const grid = gridRef?.current;
  if (!grid) return null;

  // 自動場景縮放:較長邊約 100 場景單位
  const spanX = grid.nx * grid.dx, spanY = grid.ny * grid.dy;
  const SCALE = 100 / Math.max(spanX, spanY);

  return (
    <>
      <ambientLight intensity={2.2} color={0x2a3a4a} />
      <directionalLight position={[60, 120, 60]} intensity={1.0} />
      <TerrainMesh grid={grid} SCALE={SCALE} vScale={vScale} />
      <WaterMesh grid={grid} postRef={postRef} layer={layer} SCALE={SCALE} vScale={vScale} hWet={hWet} />
    </>
  );
}
