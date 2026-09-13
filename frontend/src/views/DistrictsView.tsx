import { useState, useMemo } from "react";
import { SRI_LANKA_DISTRICTS, District } from "../data/sriLankaDistricts";
import { Search, Filter, MapPin, Landmark, ShieldAlert, ArrowRight, Droplets } from "lucide-react";

interface DistrictsViewProps {
  onSelectDistrictAndNavigate: (district: District) => void;
}

export default function DistrictsView({ onSelectDistrictAndNavigate }: DistrictsViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedRisk, setSelectedRisk] = useState<string>("all");
  const [selectedProvince, setSelectedProvince] = useState<string>("all");

  const provinces = useMemo(() => {
    return Array.from(new Set(SRI_LANKA_DISTRICTS.map((d) => d.province))).sort();
  }, []);

  const filteredDistricts = useMemo(() => {
    return SRI_LANKA_DISTRICTS.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.riverBasin.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRisk =
        selectedRisk === "all" || d.baseRisk.toLowerCase() === selectedRisk.toLowerCase();

      const matchesProvince =
        selectedProvince === "all" || d.province.toLowerCase() === selectedProvince.toLowerCase();

      return matchesSearch && matchesRisk && matchesProvince;
    });
  }, [searchTerm, selectedRisk, selectedProvince]);

  const riskCounts = useMemo(() => {
    const counts: Record<string, number> = { Critical: 0, High: 0, Moderate: 0, Safe: 0 };
    SRI_LANKA_DISTRICTS.forEach((d) => {
      if (d.baseRisk in counts) {
        counts[d.baseRisk]++;
      } else {
        counts.Moderate++;
      }
    });
    return counts;
  }, []);

  return (
    <div className="districts-view-container">
      {/* Top Banner & Summary */}
      <div className="view-hero-header">
        <div>
          <h2 className="view-hero-title">Sri Lanka District Flood Risk Registry</h2>
          <p className="view-hero-desc">
            National flood vulnerability index, river catchment basins, and designated evacuation shelters across all 25 administrative districts.
          </p>
        </div>

        {/* Quick summary counters */}
        <div className="risk-counters-row">
          <div className="risk-counter-chip red">
            <span className="counter-num">{riskCounts.Critical}</span>
            <span className="counter-label">Critical</span>
          </div>
          <div className="risk-counter-chip orange">
            <span className="counter-num">{riskCounts.High}</span>
            <span className="counter-label">High Risk</span>
          </div>
          <div className="risk-counter-chip yellow">
            <span className="counter-num">{riskCounts.Moderate}</span>
            <span className="counter-label">Moderate</span>
          </div>
          <div className="risk-counter-chip green">
            <span className="counter-num">{riskCounts.Safe}</span>
            <span className="counter-label">Safe</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="districts-filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search district, river basin (e.g. Kalutara, Kelani Ganga)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-dropdowns">
          <div className="filter-group">
            <Filter size={15} />
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical Risk</option>
              <option value="high">High Risk</option>
              <option value="moderate">Moderate Risk</option>
              <option value="safe">Safe</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Provinces</option>
              {provinces.map((prov) => (
                <option key={prov} value={prov.toLowerCase()}>
                  {prov} Province
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* District Cards Grid */}
      <div className="districts-cards-grid">
        {filteredDistricts.length === 0 ? (
          <div className="no-results-box">
            <ShieldAlert size={36} className="text-slate-500 mb-2" />
            <p>No districts match your search criteria.</p>
          </div>
        ) : (
          filteredDistricts.map((district) => {
            const riskClass = district.baseRisk.toLowerCase();
            return (
              <div key={district.id} className={`district-card border-top-${riskClass}`}>
                <div className="district-card-header">
                  <div>
                    <h3 className="district-card-title">{district.name}</h3>
                    <span className="district-card-province">{district.province} Province</span>
                  </div>
                  <span className={`risk-badge badge-${riskClass}`}>
                    {district.baseRisk}
                  </span>
                </div>

                <div className="district-card-body">
                  <div className="district-detail-row">
                    <span className="detail-label">
                      <Droplets size={14} /> River Basin
                    </span>
                    <span className="detail-value">{district.riverBasin}</span>
                  </div>

                  <div className="district-detail-row">
                    <span className="detail-label">
                      <MapPin size={14} /> Base Elevation
                    </span>
                    <span className="detail-value">{district.elevation}m MSL</span>
                  </div>

                  <div className="district-detail-row">
                    <span className="detail-label">
                      <Landmark size={14} /> Designated Shelter
                    </span>
                    <span className="detail-value truncate" title={district.nearestEvacCenter}>
                      {district.nearestEvacCenter}
                    </span>
                  </div>
                </div>

                <div className="district-card-footer">
                  <button
                    className="inspect-map-btn"
                    onClick={() => onSelectDistrictAndNavigate(district)}
                  >
                    <span>View on Live Radar Map</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
