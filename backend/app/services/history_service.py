"""Bounded, persistent district assessment history. No invented past observations."""
import hashlib
import json
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock


class HistoryService:
    def __init__(self, path=None, limit=288):
        self.path = Path(path or os.getenv('HISTORY_DB_PATH', str(
            Path(__file__).resolve().parents[3] / 'runtime' / 'assessments.sqlite3')))
        self.limit = limit
        self._lock = Lock()

    def _connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=10)
        connection.execute('''CREATE TABLE IF NOT EXISTS assessments (
            district TEXT NOT NULL, identity TEXT NOT NULL, observed_at TEXT NOT NULL,
            payload TEXT NOT NULL, PRIMARY KEY (district, identity))''')
        connection.execute('CREATE INDEX IF NOT EXISTS district_time ON assessments(district, observed_at)')
        return connection

    def record(self, telemetry):
        if not telemetry.prediction or not telemetry.observed_at:
            return
        entry = {
            'observed_at': telemetry.observed_at,
            'recorded_at': datetime.now(timezone.utc).isoformat(),
            'prediction': telemetry.prediction.model_dump(),
            'inputs': telemetry.assessment_inputs,
            'input_sources': telemetry.input_sources,
            'rain_7d_mm': telemetry.rain_7d_mm,
            'soil_saturation_pct': telemetry.soil_saturation_pct,
        }
        identity = hashlib.sha256(json.dumps(
            {k: v for k, v in entry.items() if k != 'recorded_at'},
            sort_keys=True, allow_nan=False).encode()).hexdigest()
        with self._lock, closing(self._connect()) as db, db:
            db.execute('INSERT OR IGNORE INTO assessments VALUES (?, ?, ?, ?)',
                       (telemetry.id, identity, telemetry.observed_at, json.dumps(entry, allow_nan=False)))
            db.execute('''DELETE FROM assessments WHERE district = ? AND identity NOT IN (
                SELECT identity FROM assessments WHERE district = ?
                ORDER BY observed_at DESC, rowid DESC LIMIT ?)''',
                       (telemetry.id, telemetry.id, self.limit))

    def read(self, district, limit=48):
        with self._lock, closing(self._connect()) as db:
            rows = db.execute('''SELECT payload FROM assessments WHERE district = ?
                ORDER BY observed_at DESC, rowid DESC LIMIT ?''', (district, limit)).fetchall()
        return [json.loads(row[0]) for row in reversed(rows)]


history_service = HistoryService()
