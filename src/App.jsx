import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, ScaleControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import "./App.css";
import { CITIES, fetchDustData } from "./api/fetchData";

const TILES = {
  light: { name: "Light (English)", url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", attr: "&copy; OpenStreetMap & CARTO" },
  dark: {  name: "Dark (English)",  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",  attr: "&copy; OpenStreetMap & CARTO" },
};

const riskColors = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };

const REGION_NAMES = ["Middle East", "North Africa", "South Asia", "East Asia", "Australia", "US Southwest", "Global"];

export default function App() {
  const [tab, setTab] = useState("map");
  const [base, setBase] = useState("light");
  const [region, setRegion] = useState("Middle East");

  const [regions, setRegions] = useState([]);       // all cities with scores
  const [seriesByCity, setSeriesByCity] = useState({});
  const [lastUpdated, setLastUpdated] = useState("");

  const [showPanel, setShowPanel] = useState(true);
  const [selectedCity, setSelectedCity] = useState("dubai");

  const mapRef = useRef(null);
  const tile = TILES[base];

  // fetch data initially and every 60s
  useEffect(() => {
    const load = async () => {
      const { regions, seriesByCity } = await fetchDustData();
      setRegions(regions);
      setSeriesByCity(seriesByCity);
      setLastUpdated(new Date().toLocaleTimeString());
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  // list of cities for selected region
  const citiesForRegion = useMemo(() => {
    if (region === "Global") return CITIES;
    return CITIES.filter((c) => c.group === region);
  }, [region]);

  // regions filtered for display
  const displayRegs = useMemo(() => {
    if (region === "Global") return regions;
    return regions.filter((r) => r.group === region);
  }, [region, regions]);

  const alerts = useMemo(() => displayRegs.filter((r) => r.risk === "High"), [displayRegs]);

  // center/fit map to region cities when region changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || citiesForRegion.length === 0) return;
    const bounds = citiesForRegion.reduce((b, c) => b.extend([c.lat, c.lon]), L.latLngBounds([citiesForRegion[0].lat, citiesForRegion[0].lon]));
    map.fitBounds(bounds.pad(0.25));
    // select first city in region for Forecast tab
    setSelectedCity(citiesForRegion[0].id);
  }, [region]); // eslint-disable-line

  const selectedSeries = seriesByCity[selectedCity] || [];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand">
          <h1>🌪️ Dust Storm Forecast & Alerts</h1>
          <span className="subtitle">Last update: {lastUpdated || "Fetching..."}</span>
        </div>

        <div className="righthead">
          <div className="team-badge">Core Four</div>

          <div className="controls">
            <label>Region:&nbsp;
              <select value={region} onChange={(e) => setRegion(e.target.value)}>
                {REGION_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>

            <label>Map Style:&nbsp;
              <select value={base} onChange={(e) => setBase(e.target.value)}>
                {Object.entries(TILES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
            </label>

            <button onClick={() => setShowPanel((p) => !p)}>⚠️ Alerts</button>

            <nav className="tabs">
              {["map", "forecast", "about"].map((t) => (
                <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Map tab */}
      {tab === "map" && (
        <div className="map-container">
          <MapContainer center={[24.5, 54.3]} zoom={5} className="leaflet-root" whenCreated={(m) => (mapRef.current = m)}>
            <TileLayer url={tile.url} attribution={tile.attr} />
            <ScaleControl position="bottomleft" />

            {displayRegs.map((r) => (
              <CircleMarker
                key={r.id}
                center={[r.lat, r.lon]}
                radius={12}
                pathOptions={{ color: riskColors[r.risk], fillOpacity: 0.6, weight: 2 }}
              >
                <Popup>
                  <b>{r.region}</b><br />
                  Risk: {r.risk} (score {r.score})<br />
                  Wind: {r.wind != null ? r.wind.toFixed(1) : "–"} m/s<br />
                  PM10: {r.pm10 ?? "–"} µg/m³ • Dust: {r.dust ?? "–"} µg/m³<br />
                  RH: {r.rh ?? "–"} %
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {showPanel && (
            <div className="alerts-panel">
              <h2>⚠️ Active Alerts — {region}</h2>
              {alerts.length === 0 ? (
                <p>No active alerts right now in this region.</p>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className="alert-card">
                    <p>🚨 Dust Storm Risk in <b>{a.region}</b></p>
                    <p>Composite score: <b>{a.score}</b></p>
                    <p>Wind: {a.wind != null ? a.wind.toFixed(1) : "–"} m/s • PM10: {a.pm10 ?? "–"} • Dust: {a.dust ?? "–"}</p>
                    <p>Expected in 12–24 hrs (prototype)</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Forecast tab */}
      {tab === "forecast" && (
        <div className="forecast-pane">
          <div className="forecast-controls">
            <label>Select City:&nbsp;
              <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                {citiesForRegion.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <span className="hint">12-hour composite risk (real API inputs)</span>
          </div>

          <div className="chart-card">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={selectedSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 3.2]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#ef4444" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="small">
            Risk = f(pm10, dust, wind, dryness). Categories are **rank-based per region** so the relatively highest-risk cities appear as High even on mild days.
          </p>
        </div>
      )}

      {/* About tab */}
      {tab === "about" && (
        <div className="about-pane">
          <h3>About the Project</h3>
          <p>
            Core Four’s MVP blends Open-Meteo’s Air Quality (PM10, Dust) with Forecast (Wind, Humidity) to produce a composite dust risk.
            Switch regions to see global hotspots (Middle East, North Africa, South Asia, East Asia, Australia, US Southwest).
          </p>
          <ul>
            <li>🌍 Map: color-coded risk bubbles</li>
            <li>⏱️ Forecast: 12-hour risk chart per city</li>
            <li>⚠️ Alerts: always surfaces top-risk cities in the region</li>
          </ul>
          <p className="small">
            Next: plug NASA MERRA-2/SMAP/S5P directly, add SMS/email alerts, and animate plumes.
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        Prototype using real Open-Meteo inputs • Built by <b>Core Four</b> • Not for operational use.
      </footer>
    </div>
  );
}
