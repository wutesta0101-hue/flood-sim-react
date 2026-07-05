# Validation Case: 2014 Jure Landslide Dam Breach near Mankha, Nepal

## 1. Purpose

This case is used to validate the 2D shallow-water-equation flood engine in `flood-sim-react` against a real landslide-dam event: the 2014 Jure landslide dam and subsequent breach on the Sunkoshi River in Sindhupalchok District, Nepal.

The validation goal is to compare model outputs such as inundation extent, arrival time, downstream hydrograph response, and reservoir drawdown against reported event characteristics and published observations, and then use the mismatch to guide calibration of terrain handling, roughness, and breach representation.

## 2. Simulation Engine Overview

### 2.1 Governing equations

The engine solves the two-dimensional Saint-Venant equations (2D shallow water equations, SWE) in conservative form, including a bed-slope source term and a Manning friction source term:

```
∂h/∂t   + ∂(hu)/∂x           + ∂(hv)/∂y             = 0
∂(hu)/∂t + ∂(hu² + ½gh²)/∂x  + ∂(huv)/∂y            = -g h ∂B/∂x - Cf u|U|
∂(hv)/∂t + ∂(huv)/∂x         + ∂(hv² + ½gh²)/∂y     = -g h ∂B/∂y - Cf v|U|
```

where `h` is water depth, `u, v` are depth-averaged velocity components, `B` is bed elevation, `g` is gravitational acceleration, `|U| = √(u²+v²)`, and `Cf = g n² / h^(1/3)` is the Manning friction coefficient.

### 2.2 Numerical method

| Component | Method |
|---|---|
| Spatial discretization | Finite volume, cell-centered, structured Cartesian grid |
| Interface flux | HLL approximate Riemann solver |
| Bed-slope treatment | Hydrostatic reconstruction (well-balanced scheme), preventing spurious velocities in still water over uneven terrain |
| Friction term | Semi-implicit Manning friction, stable as depth approaches zero |
| Wetting/drying | Explicit dry-cell velocity reset and wetting/drying velocity correction |
| Time stepping | Explicit, CFL-constrained (Courant number ≈ 0.4–0.45) |

### 2.3 Post-processing outputs

The post-processing module accumulates the following fields over the course of a simulation:

- **Arrival time** — first wetting time of each grid cell
- **Maximum depth** — per-cell peak water depth over the run
- **Maximum speed** — per-cell peak flow speed over the run
- **Hazard index** — per-cell peak value of `h·|U|`, a standard dam-break hazard indicator
- **Scalar summaries** — inundated area, peak depth, peak speed, peak hazard, and wavefront (flood-front) distance from a reference source point
- **Exhaustion criterion** — an empirical stopping condition based on current maximum velocity and stabilization of inundated area over a rolling window

### 2.4 Source files

| File | Role |
|---|---|
| `swe_grid.js` | Grid data structure holding conserved variables `h`, `hu`, `hv` and bed elevation `B` |
| `swe_terrain.js` | Terrain generation (currently a synthetic valley-and-plain profile; to be replaced by DEM-derived terrain for this validation case, see §4–§6) |
| `swe_solver.js` | Core solver implementing the HLL flux, hydrostatic reconstruction, and semi-implicit friction update |
| `swe_postprocess.js` | Accumulates hazard-relevant output fields and evaluates the exhaustion/stopping criterion |

### 2.5 Design note

The current solver implements a Godunov-type finite volume scheme with an HLL Riemann solver and hydrostatic reconstruction, which is the more rigorous of two schemes considered during development. A simplified local-inertial approximation (in the style of LISFLOOD-FP), which omits convective momentum terms, is not currently implemented but is noted in the source as a lower-cost alternative if front-end computational performance becomes a constraint.

## 3. Event Overview

A large rainfall-triggered landslide occurred near Jure village in the Mankha area of Sindhupalchok District, Nepal, at about 02:36 local time on 2 August 2014, blocking the Sunkoshi River and forming a landslide dam and upstream impoundment.

The event is commonly referred to as the **Jure landslide** or the **Sunkoshi landslide**, while Taiwanese secondary reporting often describes it as the Mankha landslide-dam event because Jure lies near Mankha in Sindhupalchok District.

The landslide itself caused severe destruction and significant loss of life, with widely reported death tolls around 156 people, while the later breach phase did not cause the same scale of casualties because downstream evacuation and emergency response had already been activated.

## 4. Key Event Data

The values below are suitable as first-pass validation targets or initial model constraints. Some values come from field investigation summaries and secondary synthesis reports, so they should be treated as approximate rather than exact survey-grade truths.

### 4.1 Landslide and dam

| Item | Reported value | Notes |
|---|---:|---|
| Landslide occurrence time | ~02:36 local time, 2014-08-02 | Seismic/investigation reports |
| Estimated landslide volume | ~5.5 × 10^6 m³ | Commonly cited estimate |
| Landslide length | ~1,220 m | Secondary synthesis |
| Basal width | ~930 m | Secondary synthesis |
| Landslide area | ~83 ha | Secondary synthesis |
| Deposit area | ~57 ha | Secondary synthesis |
| Mean slide depth | ~7 m | Secondary synthesis |
| Dam height | ~50–55 m | See Note (a) |

> **Note (a):** The landslide dam retaining structure is reported at approximately 50–55 m in height. A separately reported figure describing debris rising more than 100 m above the water surface on the opposite bank refers to deposit thickness at the slide's far margin, not the hydraulic retaining height of the dam, and should not be used as the dam height for terrain or reservoir setup.

### 4.2 Impounded lake

| Item | Reported value | Notes |
|---|---:|---|
| Reservoir volume | ~7 × 10^6 m³ | Frequently cited event summary (other sources cite ~8 × 10^6 m³; same order of magnitude) |
| Water surface area | ~56 ha | Secondary synthesis |
| Backwater length | ~2,450 m | Secondary synthesis (independent sources report a range of ~2–3 km; consistent) |
| Maximum width | ~580 m | Secondary synthesis |
| Lifetime before breach | 36 days | From 2014-08-02 to 2014-09-07 |

### 4.3 Inflow and breach outflow discharge

Two distinct discharge quantities are relevant to model calibration and are listed separately below.

| Metric | Reported value | Definition |
|---|---:|---|
| Mean inflow (pre-breach, into the impounded lake) | ~155 m³/s | Average river discharge feeding the reservoir while it was filling, upstream of the dam |
| Peak inflow (pre-breach, into the impounded lake) | ~160–198 m³/s | Peak river discharge into the reservoir before breach (e.g., gauge readings near Barhabise); appropriate target for the model's upstream boundary condition |
| Peak breach outflow (during the breach event) | ~6,436 m³/s | Peak discharge at the dam outlet during the 7 September breach, per erosion-based dam-breach modeling; breach duration estimated at ~26 minutes |

The pre-breach inflow (~155–198 m³/s) and the peak breach outflow (~6,436 m³/s) should be treated as separate, non-interchangeable calibration targets: the former validates the upstream boundary condition of the standing-lake phase, while the latter validates the breach-opening / dam-break phase of the simulation.

### 4.4 Breach and downstream effects

Emergency drainage works were undertaken at the dam, and reporting indicates that the spillway/drainage opening was widened by roughly 30 m on 6 September 2014 before the major breach occurred early on 7 September 2014.

Reported post-breach lake-level drop was about 15–18 m, and downstream impacts included property damage several kilometers downstream but limited loss of life during the breach phase because warnings and evacuation were already in place.

## 5. DEM Preparation Status

### 5.1 Source terrain

The terrain source is an SRTM GeoTIFF in geographic coordinates (EPSG:4326 / WGS 84), with a raster size of 6000 × 6000 pixels and a pixel size of 0.0008333333 degrees, corresponding to approximately 3 arc-seconds.

The original raster metadata also defines NoData as `-32768`, which should be preserved and explicitly handled when importing the DEM into the simulation pipeline.

### 5.2 Reprojected DEM used for modeling

The current processed model DEM is a projected GeoTIFF in **EPSG:32645 – WGS 84 / UTM zone 45N**, which places all coordinates in meters and makes it suitable for SWE grid generation and distance-based geometric operations.

Current raster properties:

| Item | Value |
|---|---|
| File | `DEM/04.tif` |
| CRS | EPSG:32645 – WGS 84 / UTM zone 45N |
| Pixel size | 85.45369563796066 m |
| Raster width | 1226 |
| Raster height | 931 |
| West | 358991.0382559075 m |
| East | 463757.2691080472 m |
| South | 3027327.6718171020 m |
| North | 3106885.0624560434 m |
| NoData | -32768 |
| Elevation range | 468–7086 m |

This processed raster corresponds to an area of roughly 105 km × 80 km based on raster width, height, and pixel size, which is substantially smaller than the full SRTM tile but is still broader than the immediate dam-and-lake system.

## 6. Coordinate Notes

A commonly referenced location for the Jure event area is approximately **27.767, 85.872** in latitude/longitude, but this point should be treated as an approximate center of the broader landslide-dam zone rather than the exact crest location of the landslide dam.

For model setup, the dam crest, lake boundary, breach section, and downstream validation transects should ultimately be digitized as explicit vector geometry in QGIS and then reprojected into EPSG:32645 so that they align directly with the DEM in meters.

### 6.1 Simulation domain map

The figure below shows the QGIS-delineated simulation domain overlaid on a topographic base map, spanning from the upstream reference point near Fulpingdanda to the downstream boundary near Barabise, with the Jure dam/lake area marked in the middle segment.

![Simulation domain map](/assets/ppt/simulation-range-map.png)

Reference coordinates marked on the map (WGS 84, decimal degrees):

| Label | Latitude | Longitude | Location |
|---|---:|---:|---|
| Downstream boundary (NE) | 27.7783 | 85.8925 | Near Barabise Hospital |
| Mid-domain reference | 27.767 | 85.872 | Near Jure dam/lake area |
| Dam/lake marker | 27.7684 | 85.8765 | Near Jureko Pahiro |
| Upstream boundary (SW) | 27.753207 | 85.800804 | Near Fulpingdanda |
| Domain south corner | 27.736126 | 85.801897 | Southern extent |

## 7. Intended Model Setup

The processed DEM will replace the current synthetic terrain generation logic in `swe_terrain.js`, so the simulation uses observed topography instead of the current idealized valley-plain surface.

The SWE grid dimensions (`nx`, `ny`) and spacings (`dx`, `dy`) should be chosen from the projected DEM resolution and the desired computational cost. Because the DEM is already in UTM meters, grid spacing can be defined directly in meters without ambiguity from geographic degrees.

The initial reservoir state should be imposed using the mapped impounded lake geometry and a target storage on the order of 7 × 10^6 m³, with a dam height of approximately 50–55 m (§4.1), while the breach should be represented either as a time-varying erosion/opening process or as a simplified staged opening calibrated to the reported drawdown, downstream response, and the ~6,436 m³/s peak breach-outflow target (§4.3).

A Manning roughness value near `n = 0.03` may be used as an initial river-valley assumption, but it should be treated as a calibration parameter rather than a fixed truth.

## 8. Validation Targets

The following targets are appropriate for first-round model evaluation.

| Metric | Reported target | Model output to compare |
|---|---|---|
| Reservoir area | ~56 ha | Simulated initial/final lake footprint |
| Backwater length | ~2,450 m | Simulated impoundment length |
| Water-level drop after breach | ~15–18 m | Simulated drawdown curve |
| Dam height | ~50–55 m | Terrain/dam geometry consistency |
| Mean/peak inflow (pre-breach) | ~155–198 m³/s | Upstream boundary discharge |
| Peak breach outflow | ~6,436 m³/s | Simulated breach hydrograph peak |
| Downstream impact zone | Damage several km downstream | Arrival time and inundation extent |

If additional satellite interpretation or field mapping becomes available, downstream inundation extent should also be compared against mapped flood traces or image-derived flood polygons.

## 9. Remaining Tasks

1. Finalize the exact dam-crest and lake-boundary geometry in QGIS.
2. Export the dam/lake polygons and centerline or control sections as GeoJSON or Shapefile in EPSG:32645.
3. Convert `DEM/04.tif` into the internal terrain representation required by the React SWE engine.
4. Replace synthetic initial water storage with reservoir geometry derived from the mapped impoundment, using a dam height of ~50–55 m.
5. Implement or approximate a breach-opening mechanism calibrated against the ~6,436 m³/s peak breach-outflow target.
6. Run calibration experiments on roughness, breach width growth, and initial lake stage.
7. Compare inundation extent, travel time, and hydrograph behavior against reported event characteristics.

## 10. Suggested Repository Layout

```text
data/
├── srtm_original.tif          # Original SRTM DEM in EPSG:4326
├── 04.tif                     # Reprojected/cropped UTM DEM for modeling
├── jure_dam_polygon.geojson   # Dam crest / dam body geometry
├── jure_lake_polygon.geojson  # Initial impounded lake extent
└── validation_targets.json    # Event target values for comparison

docs/
└── VALIDATION_JURE_README.md
```

## 11. References

ICIMOD. (2014). *ICIMOD rapid field investigation: Jure landslide dam site, Jure, Sindhupalchowk district, Nepal*. International Centre for Integrated Mountain Development. Retrieved from ReliefWeb: https://reliefweb.int/report/nepal/icimod-rapid-field-investigation-jure-landslide-dam-site-jure-sindhupalchowk-district

Ministry of Irrigation, Nepal / Department of Water Induced Disaster Prevention (DWIDP). (2014). *Report on Jure Landslide, Mankha VDC, Sindhupalchowk District, Nepal*. Kathmandu: Government of Nepal.

呂喬茵、張志新、林聖琪、傅鏸漩(2014)。《2014 尼泊爾滿卡村（Mankha）山崩及堰塞湖之探討》。國家災害防救科技中心《災害防救電子報》,2014 年 12 月特刊。

## 12. Notes for Implementation

- Keep the DEM NoData definition as `-32768` unless the modeling code is explicitly updated to use a different NoData convention.
- Treat the currently used point near 27.767, 85.872 as an area reference point, not as the final dam-crest coordinate.
- If a smaller computational domain is needed, clip the projected DEM again using UTM-based dam/lake polygons instead of clipping with approximate geographic center points.
- Use ~50–55 m for dam/barrier height in terrain and initial-condition setup (§4.1).
- Keep pre-breach inflow (~155–198 m³/s) and peak breach outflow (~6,436 m³/s) as two separate, non-interchangeable calibration targets (§4.3, §8).
