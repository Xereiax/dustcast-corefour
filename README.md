
# dustcast-corefour
Dust Storm Forecast &amp; Alerts - Core Four Hackathon Project
=======
# DustCast — Core Four

Early warnings for dust storms using satellite air quality + weather forecasts.

## Demo
- Run locally: `npm install && npm run dev`
- Switch regions (Middle East, North Africa, South Asia, East Asia, Australia, US Southwest)
- See risk map + 12-hour forecast per city

## How it Works
- Fetches **Open-Meteo Air Quality** (PM10, Dust) and **Forecast** (Wind, RH) per city
- Computes composite `risk score = f(pm10, dust, wind, dryness)` (normalized & weighted)
- Applies **rank-based tiers per region** → High / Medium / Low
- Displays alerts for High-risk cities; forecast tab shows a 12-hour risk series

### Why Rank-Based?
- On mild days absolute values may all be low; ranking surfaces the relatively highest risk so stakeholders still get signal.

## Tech Stack
- React + Vite + React-Leaflet + Recharts
- Data: Open-Meteo APIs (real-time)
- Ready to integrate: NASA **MERRA-2** aerosols, **SMAP** soil moisture, **Sentinel-5P** AOD/trace gases

## Roadmap
- Ingest MERRA-2 (DU*, AOD), SMAP soil moisture, and Sentinel-5P
- Wind-driven **plume advection** visualization (24–72 h)
- SMS/Push alerts (Twilio/Firebase), hospital exposure overlays, solar impact modeling

## Attributions
- Map © OpenStreetMap contributors; tiles © CARTO
- Data © Open-Meteo (Air-Quality & Forecast APIs)
- NASA datasets listed below for integration

## License
MIT © Core Four
>>>>>>> 398a94c (Initial commit - DustCast Core Four Hackathon MVP)
