// ══════════════════════════════════════════════════════════
// App.jsx — 主版面(UI 元件化版)
// 所屬資料夾:flood-sim-react/src/
//
// 版面 + 把 useSWESimulation 狀態分發給四個 UI 元件。
// 3D 場景由 <Canvas> + FloodScene 呈現;模擬由 SimDriver(useFrame)驅動。
// ══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSWESimulation } from './hooks/useSWESimulation.js';
import FloodScene from './scene/FloodScene.jsx';
import ParamPanel from './components/ParamPanel.jsx';
import DashboardPanel from './components/DashboardPanel.jsx';
import Timeline from './components/Timeline.jsx';
import EventLog from './components/EventLog.jsx';
import LayerSwitch from './components/LayerSwitch.jsx';

// 在 Canvas 內驅動模擬(useFrame 只能用於 Canvas 內)
function SimDriver({ stepSim }) {
  useFrame(() => { stepSim(4); });
  return null;
}

export default function App() {
  const sim = useSWESimulation();
  const [layer, setLayer] = useState('depth'); // 當前顯示圖層

  // 首次載入建立引擎
  useEffect(() => { sim.build(); /* eslint-disable-next-line */ }, []);

  // 套用參數並重建
  const handleApply = (params) => { sim.build(params); };

  const totalVol = sim.gridRef.current ? sim.gridRef.current.totalVolume() : 0;

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>堰塞湖洪水擴散 / 2D SWE 模擬</span>
        <span style={styles.clock}>t = {sim.simTime.toFixed(1)} s</span>
      </div>

      {/* 3D 場景 */}
      <div style={styles.sceneWrap}>
        <Canvas camera={{ position: [90, 70, 90], fov: 50, near: 0.1, far: 2000 }}>
          <color attach="background" args={['#0a0e14']} />
          {sim.ready && <FloodScene gridRef={sim.gridRef} postRef={sim.postRef} layer={layer} />}
          {sim.ready && <SimDriver stepSim={sim.stepSim} />}
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>

      {/* 右側面板 */}
      <div style={styles.panel}>
        <Timeline
          simTime={sim.simTime}
          maxSimTime={sim.maxSimTime}
          running={sim.running}
          exhausted={sim.exhausted}
          onPlay={sim.play}
          onPause={sim.pause}
          onReset={sim.reset}
        />
        <LayerSwitch current={layer} onChange={setLayer} />
        <DashboardPanel summary={sim.summary} totalVolume={totalVol} />
        <ParamPanel initial={sim.params} onApply={handleApply} />
        <EventLog logs={sim.logs} />
      </div>
    </div>
  );
}

const styles = {
  root: { position: 'fixed', inset: 0, background: '#0a0e14', color: '#e2e8f0', fontFamily: 'Courier New, monospace' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: '1px solid #1a2a3a', zIndex: 10 },
  title: { fontSize: 13, letterSpacing: '0.12em', color: '#00b4d8', textTransform: 'uppercase' },
  clock: { fontSize: 13, color: '#64748b' },
  sceneWrap: { position: 'absolute', top: 46, left: 0, right: 300, bottom: 0 },
  panel: { position: 'absolute', top: 46, right: 0, bottom: 0, width: 300, background: '#0f1923', borderLeft: '1px solid #1a2a3a', padding: 8, overflowY: 'auto' },
};
