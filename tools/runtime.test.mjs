import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_EFFICIENCY_AC,
  DEFAULT_EFFICIENCY_DC,
  ENGINE_KIND,
  STANDBY_DRAIN_WATTS,
  energyWh,
  estimateRuntimeHours,
  resolveEfficiency,
} from './runtime.mjs';

test('reference model is clearly labelled', () => {
  assert.equal(ENGINE_KIND, 'reference-model');
});

test('AC and DC efficiencies are distinct', () => {
  assert.equal(resolveEfficiency('ac'), DEFAULT_EFFICIENCY_AC);
  assert.equal(resolveEfficiency(undefined), DEFAULT_EFFICIENCY_AC);
  assert.equal(resolveEfficiency('dc'), DEFAULT_EFFICIENCY_DC);
  assert.equal(resolveEfficiency('usb'), DEFAULT_EFFICIENCY_DC);
});

test('AC runtime includes standby', () => {
  const hours = estimateRuntimeHours({ capacityWh: 1000, loadWatts: 100, portType: 'ac' });
  assert.ok(Math.abs(hours - 850 / (100 + STANDBY_DRAIN_WATTS)) < 1e-9);
});

test('DC runtime does not include AC standby', () => {
  const hours = estimateRuntimeHours({ capacityWh: 1000, loadWatts: 100, portType: 'dc' });
  assert.equal(hours, 9.2);
});

test('energy uses duty cycle', () => {
  assert.equal(energyWh({ watts: 100, hours: 8, dutyCycle: 0.5 }), 400);
});

test('invalid inputs return null', () => {
  assert.equal(estimateRuntimeHours({ capacityWh: 0, loadWatts: 100 }), null);
  assert.equal(estimateRuntimeHours({ capacityWh: 1000, loadWatts: -1 }), null);
  assert.equal(estimateRuntimeHours({ capacityWh: 1000, loadWatts: 0, portType: 'dc' }), null);
});
