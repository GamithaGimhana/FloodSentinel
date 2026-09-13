import React, { useState, useEffect } from "react";
import { Bell, ShieldCheck, AlertTriangle, CheckCircle, Home, Phone, Mail, MapPin, Trash2, ArrowRight } from "lucide-react";
import { SRI_LANKA_DISTRICTS, District } from "../data/sriLankaDistricts";

export interface CitizenProfile {
  name: string;
  phone: string;
  email: string;
  homeDistrictId: string;
  homeAddress: string;
  enableSms: boolean;
  enableWhatsapp: boolean;
  registeredAt: string;
}

const STORAGE_KEY = "floodsentinel_citizen_profile";

interface RegistrationViewProps {
  onNavigateToMap: (districtId: string) => void;
}

export default function RegistrationView({ onNavigateToMap }: RegistrationViewProps) {
  const [profile, setProfile] = useState<CitizenProfile | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [homeDistrictId, setHomeDistrictId] = useState(SRI_LANKA_DISTRICTS[0].id);
  const [homeAddress, setHomeAddress] = useState("");
  const [enableSms, setEnableSms] = useState(true);
  const [enableWhatsapp, setEnableWhatsapp] = useState(true);
  const [successMsg, setSuccessMsg] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        setName(parsed.name || "");
        setPhone(parsed.phone || "");
        setEmail(parsed.email || "");
        setHomeDistrictId(parsed.homeDistrictId || SRI_LANKA_DISTRICTS[0].id);
        setHomeAddress(parsed.homeAddress || "");
        setEnableSms(parsed.enableSms ?? true);
        setEnableWhatsapp(parsed.enableWhatsapp ?? true);
      } catch (e) {
        console.warn("Could not parse saved citizen profile:", e);
      }
    }
  }, []);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert("Please provide your Name and Mobile Number for emergency flood alerts.");
      return;
    }

    const newProfile: CitizenProfile = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      homeDistrictId,
      homeAddress: homeAddress.trim(),
      enableSms,
      enableWhatsapp,
      registeredAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    setProfile(newProfile);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 4000);
  };

  const handleUnregister = () => {
    if (window.confirm("Are you sure you want to disable emergency flood alerts for your registered home?")) {
      localStorage.removeItem(STORAGE_KEY);
      setProfile(null);
      setName("");
      setPhone("");
      setEmail("");
      setHomeAddress("");
    }
  };

  const registeredDistrict: District | undefined = SRI_LANKA_DISTRICTS.find(
    (d) => d.id === (profile?.homeDistrictId || homeDistrictId)
  );

  const isHomeAtRisk =
    registeredDistrict?.baseRisk === "Critical" ||
    registeredDistrict?.baseRisk === "High";

  return (
    <div className="registration-view-container">
      <div className="view-hero-header">
        <div>
          <h2 className="view-hero-title">Citizen Early Warning Flood Alert Registration</h2>
          <p className="view-hero-desc">
            Register your home district and residential location to receive immediate SMS & broadcast alerts whenever severe river basin inundation risks threaten your area.
          </p>
        </div>
      </div>

      <div className="registration-layout-grid">
        {/* Left Form: Registration Input */}
        <div className="registration-card">
          <div className="reg-card-header">
            <Bell size={20} className="text-sky-400" />
            <h3 className="reg-card-title">
              {profile ? "Update Home Alert Registration" : "New Citizen Alert Enrollment"}
            </h3>
          </div>

          {successMsg && (
            <div className="reg-alert-banner success">
              <CheckCircle size={18} />
              <span>Registration successfully saved! Emergency alert protection is active.</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="reg-form">
            <div className="form-group">
              <label className="form-label" htmlFor="citizen-name">
                Full Name *
              </label>
              <input
                id="citizen-name"
                type="text"
                placeholder="e.g. Kasun Perera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="citizen-phone">
                  <Phone size={13} /> Mobile Phone (for SMS Alerts) *
                </label>
                <input
                  id="citizen-phone"
                  type="tel"
                  placeholder="077 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="citizen-email">
                  <Mail size={13} /> Email Address (Optional)
                </label>
                <input
                  id="citizen-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="home-district">
                <MapPin size={13} /> Home Administrative District *
              </label>
              <select
                id="home-district"
                value={homeDistrictId}
                onChange={(e) => setHomeDistrictId(e.target.value)}
                className="form-select"
              >
                {SRI_LANKA_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.province} Province) — {d.riverBasin}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="home-address">
                <Home size={13} /> Home Town / Neighborhood Address
              </label>
              <input
                id="home-address"
                type="text"
                placeholder="e.g. 45 Kaduwela Road, Malabe"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-checkbox-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={enableSms}
                  onChange={(e) => setEnableSms(e.target.checked)}
                />
                <span>Receive Instant SMS Early Warnings</span>
              </label>

              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={enableWhatsapp}
                  onChange={(e) => setEnableWhatsapp(e.target.checked)}
                />
                <span>Receive Weather Radar Broadcast Bulletins</span>
              </label>
            </div>

            <div className="reg-actions-row">
              <button type="submit" className="reg-submit-btn">
                <ShieldCheck size={18} />
                <span>{profile ? "Update Alert Settings" : "Enable Flood Alert Protection"}</span>
              </button>

              {profile && (
                <button
                  type="button"
                  onClick={handleUnregister}
                  className="reg-delete-btn"
                  title="Remove registration"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Status Card: Live Alert Evaluation for Citizen's Home */}
        <div className="registration-status-panel">
          {profile ? (
            <div className="active-protection-card">
              <div className="status-badge-row">
                <span className="live-shield-pill">
                  <ShieldCheck size={16} />
                  <span>Protection Active</span>
                </span>
                <span className="registered-date">
                  Enrolled: {new Date(profile.registeredAt).toLocaleDateString()}
                </span>
              </div>

              <h3 className="profile-citizen-name">{profile.name}</h3>
              <p className="profile-phone-text">
                Alerts routed to: <strong>{profile.phone}</strong>
              </p>

              {/* Dynamic Risk Alert for Registered District */}
              {isHomeAtRisk ? (
                <div className="home-alert-box red">
                  <div className="home-alert-header">
                    <AlertTriangle size={20} className="alert-pulse-icon" />
                    <strong>ACTIVE FLOOD RISK IN YOUR HOME AREA</strong>
                  </div>
                  <p className="home-alert-body">
                    Your registered home in <strong>{registeredDistrict?.name} District</strong> is currently under <strong>{registeredDistrict?.baseRisk} Alert</strong> due to rising water levels in the <strong>{registeredDistrict?.riverBasin}</strong> basin!
                  </p>
                  <div className="shelter-reminder">
                    <span>Designated Evacuation Assembly:</span>
                    <strong>{registeredDistrict?.nearestEvacCenter}</strong>
                  </div>
                </div>
              ) : (
                <div className="home-alert-box green">
                  <div className="home-alert-header">
                    <CheckCircle size={20} />
                    <strong>Home Area Normal / Safe Buffer</strong>
                  </div>
                  <p className="home-alert-body">
                    Your registered home in <strong>{registeredDistrict?.name} District</strong> is currently in a safe status. We continuously monitor live Doppler radar precipitation for sudden cloudbursts.
                  </p>
                </div>
              )}

              <div className="home-meta-box">
                <div className="meta-item">
                  <span className="meta-label">Primary River Basin</span>
                  <span className="meta-value">{registeredDistrict?.riverBasin}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">District Base Hospital</span>
                  <span className="meta-value">{registeredDistrict?.nearestHospital}</span>
                </div>
              </div>

              <button
                className="view-home-map-btn"
                onClick={() => registeredDistrict && onNavigateToMap(registeredDistrict.id)}
              >
                <span>Track {registeredDistrict?.name} on Live Radar Map</span>
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="unregistered-guide-card">
              <div className="guide-icon-box">
                <ShieldCheck size={38} className="text-sky-400" />
              </div>
              <h3 className="guide-title">Why Register Your Home Location?</h3>
              <ul className="guide-points">
                <li>
                  ⚡ <strong>Advance Lead Time:</strong> Receive flash-flood and river bank breach warnings up to 3 hours before waters reach your street.
                </li>
                <li>
                  📍 <strong>Location-Targeted:</strong> Alerts are specifically tailored to your river basin ({registeredDistrict?.riverBasin}).
                </li>
                <li>
                  🏥 <strong>Evacuation Guidance:</strong> Immediate directions to your designated high-ground assembly shelter ({registeredDistrict?.nearestEvacCenter}).
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
