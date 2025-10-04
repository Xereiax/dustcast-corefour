// Real-data fetch + scoring used by the app.
// Uses Open-Meteo Forecast API (wind, humidity) and Air-Quality API (pm10, dust).
// Then computes a composite risk score and returns categories + a 12h series.

export const CITIES = [
  // ------- Middle East -------
  { id: "dubai", name: "Dubai", lat: 25.276987, lon: 55.296249, group: "Middle East" },
  { id: "abudhabi", name: "Abu Dhabi", lat: 24.4539, lon: 54.3773, group: "Middle East" },
  { id: "sharjah", name: "Sharjah", lat: 25.3463, lon: 55.4209, group: "Middle East" },
  { id: "riyadh", name: "Riyadh", lat: 24.7136, lon: 46.6753, group: "Middle East" },
  { id: "jeddah", name: "Jeddah", lat: 21.4858, lon: 39.1925, group: "Middle East" },
  { id: "doha", name: "Doha", lat: 25.2854, lon: 51.531, group: "Middle East" },
  { id: "muscat", name: "Muscat", lat: 23.588, lon: 58.3829, group: "Middle East" },
  { id: "kuwait", name: "Kuwait City", lat: 29.3759, lon: 47.9774, group: "Middle East" },
  { id: "baghdad", name: "Baghdad", lat: 33.3152, lon: 44.3661, group: "Middle East" },
  { id: "tehran", name: "Tehran", lat: 35.6892, lon: 51.389, group: "Middle East" },
  { id: "manama", name: "Manama", lat: 26.2285, lon: 50.586, group: "Middle East" },

  // ------- North Africa -------
  { id: "cairo", name: "Cairo", lat: 30.0444, lon: 31.2357, group: "North Africa" },
  { id: "alex", name: "Alexandria", lat: 31.2001, lon: 29.9187, group: "North Africa" },
  { id: "tripoli", name: "Tripoli", lat: 32.8872, lon: 13.1913, group: "North Africa" },
  { id: "benghazi", name: "Benghazi", lat: 32.1167, lon: 20.0667, group: "North Africa" },
  { id: "tunis", name: "Tunis", lat: 36.8065, lon: 10.1815, group: "North Africa" },
  { id: "algiers", name: "Algiers", lat: 36.7372, lon: 3.0863, group: "North Africa" },
  { id: "nouakchott", name: "Nouakchott", lat: 18.0735, lon: -15.9582, group: "North Africa" },
  { id: "agadez", name: "Agadez", lat: 16.9733, lon: 7.9911, group: "North Africa" },
  { id: "khartoum", name: "Khartoum", lat: 15.5007, lon: 32.5599, group: "North Africa" },

  // ------- South Asia -------
  { id: "delhi", name: "New Delhi", lat: 28.6139, lon: 77.209, group: "South Asia" },
  { id: "lahore", name: "Lahore", lat: 31.5204, lon: 74.3587, group: "South Asia" },
  { id: "karachi", name: "Karachi", lat: 24.8607, lon: 67.0011, group: "South Asia" },
  { id: "ahmedabad", name: "Ahmedabad", lat: 23.0225, lon: 72.5714, group: "South Asia" },
  { id: "jaipur", name: "Jaipur", lat: 26.9124, lon: 75.7873, group: "South Asia" },

  // ------- East Asia -------
  { id: "beijing", name: "Beijing", lat: 39.9042, lon: 116.4074, group: "East Asia" },
  { id: "ulaan", name: "Ulaanbaatar", lat: 47.8864, lon: 106.9057, group: "East Asia" },

  // ------- Australia -------
  { id: "alice", name: "Alice Springs", lat: -23.698, lon: 133.8807, group: "Australia" },
  { id: "mildura", name: "Mildura", lat: -34.1855, lon: 142.1625, group: "Australia" },
  { id: "brokenhill", name: "Broken Hill", lat: -31.953, lon: 141.453, group: "Australia" },

  // ------- US Southwest -------
  { id: "phoenix", name: "Phoenix", lat: 33.4484, lon: -112.074, group: "US Southwest" },
  { id: "tucson", name: "Tucson", lat: 32.2226, lon: -110.9747, group: "US Southwest" },
  { id: "elpaso", name: "El Paso", lat: 31.7619, lon: -106.485, group: "US Southwest" },
  { id: "abq", name: "Albuquerque", lat: 35.0844, lon: -106.6504, group: "US Southwest" },
  { id: "bakers", name: "Bakersfield", lat: 35.3733, lon: -119.0187, group: "US Southwest" },
  { id: "vegas", name: "Las Vegas", lat: 36.1699, lon: -115.1398, group: "US Southwest" },
];

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

function riskScore({ wind, pm10, dust, rh }) {
  const nWind = clamp01((wind ?? 0) / 30);     // 0..30 m/s
  const nPM10 = clamp01((pm10 ?? 0) / 150);    // 0..150 µg/m³
  const nDust = clamp01((dust ?? 0) / 200);    // 0..200 µg/m³
  const dryness = clamp01(1 - (rh ?? 50) / 100);
  return 1.1 * nPM10 + 1.1 * nDust + 0.8 * nWind + 0.6 * dryness;
}

function tierByRank(scores) {
  const N = scores.length;
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const highCut = Math.max(1, Math.round(N * 0.3));
  const medCut = Math.max(1, Math.round(N * 0.4));
  const highSet = new Set(sorted.slice(0, highCut).map((s) => s.cityId));
  const medSet = new Set(sorted.slice(highCut, highCut + medCut).map((s) => s.cityId));
  return scores.map((s) => ({
    ...s,
    risk: highSet.has(s.cityId) ? "High" : medSet.has(s.cityId) ? "Medium" : "Low",
  }));
}

async function fetchCity(city) {
  const { lat, lon, id } = city;
  const fURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=windspeed_10m,winddirection_10m,relativehumidity_2m&timezone=auto`;
  const aqURL = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,dust&timezone=auto`;
  try {
    const [fRes, aqRes] = await Promise.all([fetch(fURL), fetch(aqURL)]);
    const [fJson, aqJson] = await Promise.all([fRes.json(), aqRes.json()]);
    const idx = fJson?.hourly?.time?.length ? fJson.hourly.time.length - 1 : 0;

    const wind = fJson?.hourly?.windspeed_10m?.[idx] ?? null;
    const winddir = fJson?.hourly?.winddirection_10m?.[idx] ?? null;
    const rh = fJson?.hourly?.relativehumidity_2m?.[idx] ?? null;
    const pm10 = aqJson?.hourly?.pm10?.[idx] ?? null;
    const dust = aqJson?.hourly?.dust?.[idx] ?? null;

    const horizon = 12;
    const series = [];
    for (let k = Math.max(0, idx - horizon + 1); k <= idx; k++) {
      const w = fJson?.hourly?.windspeed_10m?.[k] ?? wind ?? 0;
      const p = aqJson?.hourly?.pm10?.[k] ?? pm10 ?? 0;
      const d = aqJson?.hourly?.dust?.[k] ?? dust ?? 0;
      const r = fJson?.hourly?.relativehumidity_2m?.[k] ?? rh ?? 50;
      series.push({
        t: fJson?.hourly?.time?.[k] ?? `${k}`,
        score: round(riskScore({ wind: w, pm10: p, dust: d, rh: r }), 2),
      });
    }

    return {
      cityId: id, wind, winddir, pm10, dust, rh,
      score: round(riskScore({ wind, pm10, dust, rh }), 2),
      series,
    };
  } catch (e) {
    console.error("City fetch failed", city.name, e);
    return null;
  }
}

export async function fetchDustData() {
  const results = await Promise.all(CITIES.map((c) => fetchCity(c)));
  const ok = results.filter(Boolean);
  if (ok.length === 0) return { regions: [], seriesByCity: {} };

  const ranked = tierByRank(ok);
  const regions = ranked.map((r) => {
    const city = CITIES.find((c) => c.id === r.cityId);
    return {
      id: r.cityId, region: city.name, lat: city.lat, lon: city.lon, group: city.group,
      wind: r.wind, direction: r.winddir, pm10: r.pm10, dust: r.dust, rh: r.rh,
      risk: r.risk, score: r.score,
    };
  });

  const seriesByCity = {};
  ranked.forEach((r) => (seriesByCity[r.cityId] = r.series));
  return { regions, seriesByCity };
}
