# flood-sim-react

堰塞湖洪水擴散模擬 — 2D 淺水波方程（SWE）引擎 + React Three Fiber 前端

本專案以二維聖維南方程（Saint-Venant equations）為核心，模擬堰塞壩潰決後下游的洪水擴散過程，並以 3D 場景即時視覺化水深、到達時間、破壞參數等災害輸出指標。目前正以 2014 年尼泊爾 Jure（滿卡村）堰塞湖事件進行引擎效度驗證。

## 示範影片

點擊觀看擴散引擎運作示範：
[▶ simulation-demo.mp4](assets/media/simulation-demo.mp4)

## 專案特色

- **物理引擎**：二維淺水波方程，有限體積法 + HLL 黎曼求解器 + hydrostatic reconstruction（靜水平衡重建）+ 半隱式曼寧摩擦，可正確處理不規則地形上的濕乾前鋒
- **即時 3D 視覺化**：React Three Fiber 呈現地形與水面，支援四種顯示圖層（即時水深 / 到達時間 / 最大水深 / 破壞參數）
- **災害輸出指標**：淹沒面積、最大水深、最大流速、破壞參數（h·|U|）、波前推進距離
- **互動式參數調整**：山谷幾何、曼寧糙率、網格解析度皆可即時調整並重建模擬
- **事件日誌與時間軸控制**：播放/暫停/重置，並自動偵測擴散耗盡以停止模擬
- **真實案例驗證**：以 2014 尼泊爾 Jure 堰塞湖事件驗證引擎效度（詳見 `docs/VALIDATION_JURE_README.md`）

## 技術棧

- **前端框架**：React 18、Vite
- **3D 渲染**：Three.js、@react-three/fiber、@react-three/drei
- **物理引擎**：純 JavaScript 實作，無外部數值運算套件依賴

## 安裝與執行

```bash
# 安裝相依套件
npm install

# 啟動開發伺服器
npm run dev

# 建置正式版本
npm run build

# 預覽建置結果
npm run preview
```

開發伺服器預設執行於 `http://localhost:5173`。

## 專案結構

```
flood-sim-react/
├── index.html
├── package.json
├── vite.config.js
├── docs/
│   ├── VALIDATION_JURE_README.md      # Jure 堰塞湖驗證案例（英文版）
│   └── VALIDATION_JURE_README_zh.md   # Jure 堰塞湖驗證案例（中文版）
├── assets/
│   ├── ppt/
│   │   └── simulation-range-map.png   # 模擬範圍地圖
│   └── media/
│       └── simulation-demo.mp4        # 引擎示範影片
├── data/                               # DEM 與座標資料（驗證案例用）
│   ├── srtm_original.tif
│   ├── 04.tif
│   ├── jure_dam_polygon.geojson
│   └── jure_lake_polygon.geojson
└── src/
    ├── main.jsx
    ├── App.jsx                        # 主版面，整合 3D 場景與控制面板
    ├── styles/
    │   └── app.css
    ├── engine/                        # 核心物理引擎
    │   ├── swe_grid.js                # 網格資料結構（h, hu, hv, B）
    │   ├── swe_terrain.js             # 地形產生器（合成地形 / DEM 匯入）
    │   ├── swe_solver.js              # 核心求解器（HLL + hydrostatic reconstruction）
    │   └── swe_postprocess.js         # 後處理累積器（到達時間、破壞參數等）
    ├── scene/                         # 3D 視覺化
    │   ├── FloodScene.jsx             # R3F 場景元件（地形網格 + 水面網格）
    │   └── colormap.js                # 熱力圖色階與圖層定義
    ├── hooks/
    │   └── useSWESimulation.js        # 模擬迴圈 React Hook
    └── components/                    # UI 元件
        ├── ParamPanel.jsx             # 參數輸入面板
        ├── DashboardPanel.jsx         # 災害輸出儀表板
        ├── Timeline.jsx               # 播放/暫停/重置與進度條
        ├── LayerSwitch.jsx            # 圖層切換
        └── EventLog.jsx               # 事件日誌
```

## 引擎概述

模擬採用守恆形式的二維淺水波方程：

```
∂h/∂t    + ∂(hu)/∂x           + ∂(hv)/∂y             = 0
∂(hu)/∂t + ∂(hu² + ½gh²)/∂x  + ∂(huv)/∂y            = -g h ∂B/∂x - Cf u|U|
∂(hv)/∂t + ∂(huv)/∂x         + ∂(hv² + ½gh²)/∂y     = -g h ∂B/∂y - Cf v|U|
```

數值方法採用有限體積法搭配 HLL 近似黎曼求解器，並以 hydrostatic reconstruction 處理底床坡度源項，避免不規則地形上的靜水狀態產生假流速；摩擦項則採半隱式曼寧公式，確保水深趨近於零時仍維持數值穩定。

詳細的控制方程、數值方法設計依據與各原始碼檔案角色，請參見 [`docs/VALIDATION_JURE_README.md`](docs/VALIDATION_JURE_README.md) 第 2 節「模擬引擎概述」。

## 案例驗證

本引擎正以 2014 年尼泊爾 Sindhupalchok 縣 Jure 堰塞湖潰決事件進行效度驗證，比對模擬輸出（淹沒面積、到達時間、下游流量歷線、蓄水位下降）與已發表之事件觀測資料。

詳見：
- [`docs/VALIDATION_JURE_README.md`](docs/VALIDATION_JURE_README.md)（英文版）
- [`docs/VALIDATION_JURE_README_zh.md`](docs/VALIDATION_JURE_README_zh.md)（中文版）

## 授權

（依專案需求填入授權條款，例如 MIT License）
