# Graphing Library Options for PVRD Framework

## Current Project Context
- Frontend: React 19 + TypeScript + Vite
- Backend: Django + Django Ninja + Celery
- Existing pattern to emulate: source mapping style CRUD/editor workflow

## What You Need
- Multiple chart types (line, bar, area, scatter, pie, heatmap, etc.)
- User-created graphs via UI (not hard-coded)
- Long-term maintainability
- Fits existing React + Django architecture

---

## React Options

### Option R1: Apache ECharts (via echarts-for-react)
**Best for:** broad chart coverage + highly configurable user-defined charts.

**Why it fits**
- Very wide chart type support (line, bar, pie, scatter, heatmap, radar, candlestick, sankey, treemap, geo/map, mixed charts).
- JSON config model is ideal for storing user graph definitions in DB.
- Mature ecosystem and strong long-term governance (Apache Software Foundation).
- Good performance for medium/large datasets.

**Tradeoffs**
- API surface is large; needs a schema/validation layer for safe user-driven config.
- Theming and defaults should be wrapped in your own adapter.

**Maintenance profile**
- Well maintained; enterprise-grade adoption; steady releases.

---

### Option R2: Plotly.js (via react-plotly.js)
**Best for:** advanced interactive analytics and scientific charting.

**Why it fits**
- Strong support for advanced visuals (3D, contour, financial, statistical plots).
- Rich built-in interactivity and export tooling.
- Works well when backend also uses Python Plotly.

**Tradeoffs**
- Heavier bundle than most alternatives.
- Configuration can become verbose for builder UIs.

**Maintenance profile**
- Well maintained; widely used in data products.

---

### Option R3: Nivo
**Best for:** modern React-native charting UX with clean component patterns.

**Why it fits**
- Excellent React DX and consistent component model.
- Good defaults and animations out of the box.

**Tradeoffs**
- Fewer niche chart types than ECharts/Plotly.
- User-driven, arbitrary chart-builder flexibility is more limited than config-first engines.

**Maintenance profile**
- Actively maintained and widely used in React apps.

---

## Python Options

### Option P1: Plotly (Python)
**Best for:** backend chart rendering, export images/HTML, and parity with frontend Plotly.

**Why it fits**
- Strong multi-chart support and interactivity.
- Easy to serialize figure JSON for persistence.
- Good if you want server-side generation for reports/snapshots.

**Tradeoffs**
- Heavier than minimal plotting stacks.
- If frontend is not Plotly, maintain a translation layer.

**Maintenance profile**
- Well maintained, very common in production analytics.

---

### Option P2: Altair (Vega-Lite)
**Best for:** safe declarative chart specs and user-generated chart definitions.

**Why it fits**
- Declarative grammar is excellent for "builder-style" systems.
- Easier to validate user-created chart configs against a schema.
- Great for producing reproducible specs and lightweight config management.

**Tradeoffs**
- Some advanced visualizations may need Vega custom work.
- Less direct control than imperative plotting in some edge cases.

**Maintenance profile**
- Well maintained and popular in data science workflows.

---

### Option P3: Bokeh
**Best for:** Python-heavy interactive dashboards/server-driven plots.

**Why it fits**
- Good server-linked interactivity and custom callbacks.
- Works well when backend controls interaction lifecycle.

**Tradeoffs**
- Less natural fit if most UI is already React-driven.
- May introduce parallel UI paradigms.

**Maintenance profile**
- Maintained and stable, but less common than Plotly for mixed React stacks.

---

## Recommended Combinations

### Recommendation A (Most Balanced): ECharts + Python Plotly
- Use ECharts for all interactive app charts in React.
- Use Python Plotly for report exports/scheduled snapshots where needed.
- Keep a normalized internal chart-definition model and adapter layer.

### Recommendation B (Most Builder-Friendly): ECharts + Altair
- Use ECharts renderer in frontend.
- Use Altair/Vega-Lite-style spec model in backend for validation and versioning.
- Best when user-defined graph creation is the top priority.

### Recommendation C (Single Family): Plotly React + Plotly Python
- Unified plotting semantics across front and back.
- Best when advanced analytics charts matter more than frontend bundle size.

---

## Implementation Blueprint (Source-Mapping Style)

## 1) Data Model (Django)
Create entities similar to your source mapping flow:
- `chart_definition`
  - `chart_definition_id`
  - `name`
  - `description`
  - `chart_type`
  - `module_name`
  - `source_system`
  - `dataset_key`
  - `x_field`
  - `y_field`
  - `series_field` (optional)
  - `filters_json`
  - `style_json`
  - `is_public`
  - `owner_user_id`
- `chart_layout`
  - `dashboard_id`
  - `chart_definition_id`
  - `position_json`
- `chart_run` (optional for scheduled snapshots)
  - `chart_definition_id`
  - `run_status`
  - `output_path`
  - `created_at`

Use `column_mapping` + `unit_type` for field pickers and data-type-safe graph options.

## 2) API Layer (Django Ninja)
Add endpoints:
- `GET /api/core/charts/list/`
- `POST /api/core/charts/create/`
- `PATCH /api/core/charts/update/`
- `DELETE /api/core/charts/delete/`
- `POST /api/core/charts/preview/` (returns chart-ready dataset)
- `POST /api/core/charts/validate/` (checks fields, data types, filters)

Validation rules should enforce:
- Allowed chart types
- Required axis fields
- Data type compatibility (`unit_type.base_data_type`)
- Row limits and aggregation limits

## 3) Frontend Builder (React)
Build two pages mirroring source mapping UX:
- `chart_manager.tsx` (list/search/filter)
- `chart_editor.tsx` (create/edit/clone)

Editor sections:
- Metadata: name, description, chart type
- Data binding: source system + dataset + x/y/series fields
- Transform: group by, aggregate, filters
- Style: colors, axis labels, legend, tooltip format
- Preview panel: render chart with sample data

Store only your normalized config in DB; render through adapters:
- `toEchartsOption(chartDefinition, data)`
- `toPlotlyFigure(chartDefinition, data)`

## 4) Security and Guardrails
- Restrict selectable fields to approved mapped columns.
- Enforce query bounds (`max_rows`, time windows).
- Validate and sanitize all filter inputs.
- Add server-side ownership/visibility checks for user-created charts.

## 5) Rollout Plan
1. Implement chart definition model + CRUD APIs.
2. Build editor and preview with one renderer (ECharts first).
3. Add chart type expansion and saved dashboards.
4. Add scheduled exports (Celery) if needed.

---

## Final Recommendation
For this project, start with:
- **React:** Apache ECharts
- **Python:** Plotly (or Altair if strict declarative builder validation is top priority)

This gives you strong multi-chart capability, safe user-driven graph definitions, and long-term maintainability without fighting your existing React + Django architecture.

---

## Implementation Status

### Completed: ECharts Prototype Page

**Status:** Shipped — available at `/energy_hub/charts`

#### What was implemented

**Backend**
- `server/core/charts/models.py` — `chart_definition` model (JSONB `config_json` + `last_data_json`, `chart_type`, `name`, `description`, `is_pinned`). Table: `core_chart_definition`.
- Migration `0006_chart_definition` applied.
- `server/core/rest_api/chart_api.py` — Ninja API router mounted at `/api/core/charts/`:
  - `GET  /definitions/` — list saved charts
  - `POST /definitions/` — create chart
  - `PUT  /definitions/{id}/` — update chart
  - `DELETE /definitions/{id}/` — delete chart
  - `GET  /column-mappings/` — discover available `source_system` / `dataset_key` / column combos from `column_mapping`
  - `GET  /dimensions/` — discover `dimension_type` / `dimension_key` pairs from `timeseries_point`
  - `GET  /timeseries/` — query `timeseries_point` with optional filters: `column_mapping_id`, `source_system`, `dataset_key`, `semantic_key`, `date_from`, `date_to`, `dimension_type`, `dimension_key`, `aggregation` (none/hourly/daily/monthly), `agg_func` (avg/sum/min/max), `limit` (max 10 000).

**Frontend**
- `modules/energy_hub/client/charts/chart-api.ts` — typed API client for all chart endpoints.
- `modules/energy_hub/client/charts/chart-prototype.tsx` — two-panel prototype page:
  - Left sidebar: chart type toggle (line/bar/area/scatter), source system selector, dataset key selector, column multi-select (from `column_mapping`), date range pickers, dimension type/key dropdowns (from `timeseries_point` distinct values), aggregation + agg-function selects, row limit, Run Query button.
  - Right main: full-height ECharts canvas with zoom slider, toolbox (zoom/restore/save-as-image), multi-series support keyed by `dimension_key` or `semantic_key`.
  - Bottom shelf: saved chart pills — click to reload config, × to delete.
  - Save panel in left sidebar: name + description inputs, Save/Update button; active chart highlighted.
- ECharts installed: `echarts@6.0.0` (direct, no wrapper library — uses `useRef`/`useEffect` init pattern).

**Navigation**
- Route added: `energy_hub/charts` → lazy-loads `chart-prototype`.
- Sidebar entry added: "Chart Prototype" under Energy Hub (order 204).

#### Data flow

```
User selects filters
      ↓
chart-api.ts: queryTimeseries({ source_system, dataset_key, column_mapping_id, dates, dims, agg })
      ↓
GET /api/core/charts/timeseries/
      ↓
Django Ninja: timeseries_point.objects.filter(...)[.annotate(TruncDay/Hour/Month)]
      ↓
[{ ts_utc, value_num, dimension_type, dimension_key, semantic_key, unit_name }]
      ↓
buildEChartsOption() → groups by dimension_key/semantic_key → multi-series ECharts option
      ↓
chartInstance.current.setOption(option, true)
```

#### Extending the prototype

- To add a new chart type (pie, heatmap) extend the `CHART_TYPES` array in `chart-prototype.tsx` and update `buildEChartsOption()`.
- To persist data snapshots in the saved chart, populate `last_data_json` in the save payload.
- To add user ownership/visibility, add a `created_by` field to `chart_definition` and filter in `list_chart_definitions`.
- To expose raw row data instead of timeseries_point, add a second query endpoint hitting `raw_record.row_payload_json`.

