"""Shared district reference data. Baseline labels are not current warnings."""
import json
from pathlib import Path
REGISTRY_PATH = Path(__file__).resolve().parents[3] / "shared" / "districts.json"
SRI_LANKA_DISTRICTS = [
    {**d, "elevation_m": d["elevation"], "river_basin": d["riverBasin"]}
    for d in json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
]
