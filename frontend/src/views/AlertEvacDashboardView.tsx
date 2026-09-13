import { useState, useMemo } from "react";
import RiskGauge, { ThreatLevel } from "../components/alerts/RiskGauge";
import AlertBanner from "../components/alerts/AlertBanner";
import ScenarioSliders, { ScenarioParameters, SCENARIO_PRESETS } from "../components/alerts/ScenarioSliders";
import EvacuationGuide from "../components/alerts/EvacuationGuide";
import AlertModal from "../components/alerts/AlertModal";
import { SRI_LANKA_DISTRICTS } from "../data/sriLankaDistricts";
import { MessageSquare, ShieldAlert } from "lucide-react";

export default function AlertEvacDashboardView() {
  const [selectedDistrict, setSelectedDistrict] = useState(SRI_LANKA_DISTRICTS[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Scenario parameters for simulation
  const [params, setParams] = useState<ScenarioParameters>(SCENARIO_PRESETS.monsoon.params);

  // Calculate live simulated probability and threat tier from the scenario parameters
  const { probability, threatLevel } = useMemo(() => {
    const stress = (params.rainfall7dMm * (params.soilSaturationPercent / 100)) / (Math.max(5, params.elevationM) + 5);
    const riverFactor = Math.exp(-params.riverProximityM / 1200);

    const rawProb = Math.min(100, Math.max(5, Math.round(stress * 32 + riverFactor * 38)));

    let level: ThreatLevel = "Safe";
    if (rawProb > 75) level = "Critical";
    else if (rawProb > 50) level = "Warning";
    else if (rawProb > 25) level = "Advisory";

    return { probability: rawProb, threatLevel: level };
  }, [params]);

  return (
    <div className="alert-evac-view-container">
      {/* Dynamic Emergency Banner */}
      <AlertBanner
        probability={probability}
        threatLevel={threatLevel}
        districtName={selectedDistrict.name}
        riverBasin={selectedDistrict.riverBasin}
        onOpenEvacuation={() => {
          const el = document.getElementById("evacuation-guide-section");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
        onOpenSmsModal={() => setIsModalOpen(true)}
      />

      {/* Main Simulation & Intelligence Grid */}
      <div className="alert-evac-main-grid">
        {/* Left Column: Risk Gauge & Interactive Scenario Sliders */}
        <div className="gauge-simulator-col">
          {/* Top Row: Gauge + District Picker */}
          <div className="gauge-card-box">
            <div className="gauge-box-header">
              <div className="header-left">
                <ShieldAlert className="text-sky-400" size={18} />
                <h3 className="box-title">Real-Time Threat Level Assessment</h3>
              </div>

              {/* District Switcher */}
              <select
                value={selectedDistrict.id}
                onChange={(e) => {
                  const found = SRI_LANKA_DISTRICTS.find((d) => d.id === e.target.value);
                  if (found) setSelectedDistrict(found);
                }}
                className="district-select-chip"
                aria-label="Target Administrative District"
              >
                {SRI_LANKA_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.province} Province)
                  </option>
                ))}
              </select>
            </div>

            <div className="gauge-center-wrapper">
              <RiskGauge
                probability={probability}
                threatLevel={threatLevel}
                size={230}
              />
            </div>

            <div className="gauge-action-footer">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="trigger-sms-btn"
              >
                <MessageSquare size={16} />
                <span>Simulate Emergency Citizen SMS Alert</span>
              </button>
            </div>
          </div>

          {/* Interactive What-If Scenario Sliders */}
          <ScenarioSliders
            parameters={params}
            onChange={(newParams) => setParams(newParams)}
          />
        </div>

        {/* Right Column: Evacuation Guide, Safe Shelters & Checklist */}
        <div id="evacuation-guide-section" className="evac-guide-col">
          <EvacuationGuide
            districtName={selectedDistrict.name}
            shelterName={selectedDistrict.nearestEvacCenter}
            shelterDistanceKm={2.8}
            hospitalName={selectedDistrict.nearestHospital}
            hospitalDistanceKm={3.9}
            riverBasin={selectedDistrict.riverBasin}
          />
        </div>
      </div>

      {/* Simulated Mobile Broadcast Modal */}
      <AlertModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        districtName={selectedDistrict.name}
        probability={probability}
        shelterName={selectedDistrict.nearestEvacCenter}
        riverBasin={selectedDistrict.riverBasin}
      />
    </div>
  );
}
