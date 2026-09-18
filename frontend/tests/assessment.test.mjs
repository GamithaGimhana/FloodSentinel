import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarioFromDistrict, probabilityChange, changedInputs, riskLabel } from '../src/services/assessment.ts';

test('scenario uses selected district weather and terrain without rounding', () => {
  const district = { id: 'kalutara', elevation: 12 };
  const reading = { rain_7d_mm: 321.7, soil_saturation_pct: 83.6, assessment_inputs: { elevation_m: 18, distance_to_river_m: 450 } };
  assert.deepEqual(scenarioFromDistrict(district, reading), {
    district: 'kalutara', rainfall_7d_mm: 321.7, rainfall_24h_mm: 321.7 / 7, rainfall_30d_mm: 321.7, height_above_nearest_drainage_m: 5, drainage_index: .5, soil_saturation_pct: 83.6, elevation_m: 18, distance_to_river_m: 450,
  });
});

test('zero rainfall and soil values are preserved; unavailable data uses explicit baseline', () => {
  const district = { id: 'kandy', elevation: 500 };
  assert.equal(scenarioFromDistrict(district, { rain_7d_mm: 0, soil_saturation_pct: 0 }).rainfall_7d_mm, 0);
  assert.equal(scenarioFromDistrict(district).district, 'kandy');
  assert.equal(scenarioFromDistrict(district).elevation_m, 500);
});

test('comparison uses probability points and refuses model/threshold changes', () => {
  const before = { model_version: '1', threshold_used: .2258, flood_probability: .23 };
  assert.ok(Math.abs(probabilityChange({ ...before, flood_probability: .31 }, before) - 8) < 1e-10);
  assert.equal(probabilityChange({ ...before, model_version: '2' }, before), null);
  assert.equal(probabilityChange({ ...before, threshold_used: .5 }, before), null);
});

test('input changes are exact and low score labels do not claim safety', () => {
  assert.deepEqual(changedInputs({ rain: 0, district: 'Kandy' }, { rain: 15, district: 'Kandy' }), [{ key: 'rain', before: 15, after: 0 }]);
  assert.equal(riskLabel('SAFE'), 'Lower experimental risk');
  assert.equal(riskLabel(null), 'Unavailable');
});
