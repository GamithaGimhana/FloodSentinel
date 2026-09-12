# 🚨 Evacuation Router, Emergency Alerts & DevOps Branch (`feature/alert-evac-devops`)

This branch contains the emergency response features, evacuation routing engine, containerization, and deployment setup for **FloodSentinel**.

---

## 🎯 Branch Purpose
Primary Owner: **Member 4** (Backend Architect, Evacuation & DevOps Lead)

Responsible for calculating nearest safe zones and hospitals, rendering circular risk gauges, managing Docker Compose orchestration, and coordinating testing and final academic reporting.

---

## 🚑 Evacuation & Emergency Service
- **Distance Calculation**: Haversine geospatial proximity search matching user coordinates to pre-indexed Sri Lankan emergency shelters, hospitals, and high-ground safe zones.
- **Emergency Hotlines**:
  - Disaster Management Centre (DMC): `117`
  - National Emergency Operations: `011 213 6136`
  - Ambulance Service: `1990`
- **Evacuation Instructions**: Dynamic safety checklists (e.g., power disconnection, document preservation, safe travel routes) tailored to the predicted alert tier.

---

## 🐳 DevOps & Deployment
- `Dockerfile.backend` - Multi-stage Python 3.10 production container.
- `Dockerfile.frontend` - Optimized Nginx-served static React bundle.
- `docker-compose.yml` - Single-command orchestration linking frontend and backend on `localhost`.
- `.github/workflows/ci.yml` - Automated linting and test pipeline.
