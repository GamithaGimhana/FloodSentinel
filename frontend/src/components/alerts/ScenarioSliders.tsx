import { Sliders, RotateCcw, CloudRain, Waves, Mountain, Droplet } from "lucide-react";

export interface ScenarioParameters {
  rainfall7dMm: number; // 0 to 300
  riverProximityM: number; // 50 to 5000
  elevationM: number; // 5 to 500
  soilSaturationPercent: number; // 0 to 100
}

export interface ScenarioSlidersProps {
  parameters: ScenarioParameters;
  onChange: (newParams: ScenarioParameters) => void;
}

export const SCENARIO_PRESETS: Record<
  string,
  { name: string; desc: string; params: ScenarioParameters }
> = {
  dry: {
    name: "Dry / Seasonal Normal",
    desc: "Baseline conditions with minimal rainfall and dry catchments.",
    params: {
      rainfall7dMm: 15,
      riverProximityM: 2500,
      elevationM: 35,
      soilSaturationPercent: 20,
    },
  },
  monsoon: {
    name: "SW Monsoon Heavy Spill",
    desc: "Continuous multi-day monsoon downpours across Western/Sabaragamuwa catchments.",
    params: {
      rainfall7dMm: 180,
      riverProximityM: 400,
      elevationM: 12,
      soilSaturationPercent: 78,
    },
  },
  cyclone: {
    name: "Cyclone Roanu (2016 Overbank)",
    desc: "Severe tropical cloudburst exceeding 280mm with catastrophic Kelani basin breach.",
    params: {
      rainfall7dMm: 290,
      riverProximityM: 120,
      elevationM: 7,
      soilSaturationPercent: 95,
    },
  },
  highlands: {
    name: "Central Highlands Steep Runoff",
    desc: "High elevation rainfall causing flash torrents into downstream tributary valleys.",
    params: {
      rainfall7dMm: 130,
      riverProximityM: 650,
      elevationM: 180,
      soilSaturationPercent: 65,
    },
  },
};

/**
 * ScenarioSliders Component (TypeScript)
 * Member B: Alert Dashboard & Simulation Lead
 *
 * Interactive "What-If" flood scenario testing control panel.
 */
export default function ScenarioSliders({
  parameters,
  onChange,
}: ScenarioSlidersProps) {
  const handleChange = (field: keyof ScenarioParameters, val: number) => {
    onChange({
      ...parameters,
      [field]: val,
    });
  };

  const handleApplyPreset = (presetKey: string) => {
    const preset = SCENARIO_PRESETS[presetKey];
    if (preset) {
      onChange(preset.params);
    }
  };

  return (
    <div className="scenario-sliders-card">
      <div className="scenario-card-header">
        <div className="scenario-title-group">
          <Sliders className="text-sky-400" size={18} />
          <div>
            <h3 className="scenario-card-title">"What-If" Hydrological Scenario Simulator</h3>
            <p className="scenario-card-desc">
              Adjust environmental stress variables to test flood susceptibility thresholds for disaster planning.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleApplyPreset("dry")}
          className="scenario-reset-btn"
          title="Reset to Baseline Normal"
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>
      </div>

      {/* Preset Buttons */}
      <div className="scenario-presets-bar">
        <span className="presets-label">Quick Presets:</span>
        <div className="preset-buttons-wrap">
          {Object.entries(SCENARIO_PRESETS).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleApplyPreset(key)}
              className="preset-chip-btn"
              title={item.desc}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Sliders Grid */}
      <div className="sliders-control-grid">
        {/* Slider 1: 7-Day Rainfall */}
        <div className="slider-item-box">
          <div className="slider-header-row">
            <span className="slider-param-label">
              <CloudRain size={15} className="text-sky-400" />
              <span>7-Day Cumulative Rainfall</span>
            </span>
            <span className="slider-current-val">
              {parameters.rainfall7dMm} <small>mm</small>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={300}
            step={5}
            value={parameters.rainfall7dMm}
            onChange={(e) => handleChange("rainfall7dMm", Number(e.target.value))}
            className="styled-scenario-slider"
          />
          <div className="slider-minmax-row">
            <span>0 mm (Drought)</span>
            <span>150 mm (Alert)</span>
            <span>300 mm (Cloudburst)</span>
          </div>
        </div>

        {/* Slider 2: River Proximity */}
        <div className="slider-item-box">
          <div className="slider-header-row">
            <span className="slider-param-label">
              <Waves size={15} className="text-blue-400" />
              <span>River / Canal Proximity</span>
            </span>
            <span className="slider-current-val">
              {parameters.riverProximityM} <small>meters</small>
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={5000}
            step={50}
            value={parameters.riverProximityM}
            onChange={(e) => handleChange("riverProximityM", Number(e.target.value))}
            className="styled-scenario-slider"
          />
          <div className="slider-minmax-row">
            <span>50m (Riverbank)</span>
            <span>2,500m (Buffer)</span>
            <span>5,000m (Upland)</span>
          </div>
        </div>

        {/* Slider 3: Base Elevation */}
        <div className="slider-item-box">
          <div className="slider-header-row">
            <span className="slider-param-label">
              <Mountain size={15} className="text-emerald-400" />
              <span>Terrain Elevation (MSL)</span>
            </span>
            <span className="slider-current-val">
              {parameters.elevationM} <small>meters</small>
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={500}
            step={5}
            value={parameters.elevationM}
            onChange={(e) => handleChange("elevationM", Number(e.target.value))}
            className="styled-scenario-slider"
          />
          <div className="slider-minmax-row">
            <span>5m (Coastal Plain)</span>
            <span>250m (Mid-Country)</span>
            <span>500m (Highland)</span>
          </div>
        </div>

        {/* Slider 4: Soil Drainage Saturation */}
        <div className="slider-item-box">
          <div className="slider-header-row">
            <span className="slider-param-label">
              <Droplet size={15} className="text-cyan-400" />
              <span>Soil Drainage Saturation</span>
            </span>
            <span className="slider-current-val">
              {parameters.soilSaturationPercent} <small>%</small>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={parameters.soilSaturationPercent}
            onChange={(e) => handleChange("soilSaturationPercent", Number(e.target.value))}
            className="styled-scenario-slider"
          />
          <div className="slider-minmax-row">
            <span>0% (Dry Soil)</span>
            <span>50% (Saturated)</span>
            <span>100% (Waterlogged)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
