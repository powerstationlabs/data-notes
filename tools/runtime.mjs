/**
 * Reference implementation of the core PowerStationLabs runtime model.
 *
 * Scope: documented core — capacity, port efficiency, standby draw, and duty
 * cycle. The production Power Finder applies additional model-specific
 * assumptions maintained separately. Results are estimates, not measurements.
 *
 * Runtime = capacity × efficiency / (load + standby)
 */

export const ENGINE_KIND = 'reference-model';
export const DEFAULT_EFFICIENCY_AC = 0.85;
export const DEFAULT_EFFICIENCY_DC = 0.92;
export const STANDBY_DRAIN_WATTS = 10;

export function resolveEfficiency(portType) {
  return portType === 'dc' || portType === 'usb'
    ? DEFAULT_EFFICIENCY_DC
    : DEFAULT_EFFICIENCY_AC;
}

export function energyWh({ watts, hours = 1, dutyCycle = 1 }) {
  if (!Number.isFinite(watts) || watts < 0) return null;
  if (!Number.isFinite(hours) || hours < 0) return null;
  if (!Number.isFinite(dutyCycle) || dutyCycle < 0 || dutyCycle > 1) return null;
  return watts * hours * dutyCycle;
}

export function estimateRuntimeHours({ capacityWh, loadWatts, portType = 'ac' }) {
  if (!Number.isFinite(capacityWh) || capacityWh <= 0) return null;
  if (!Number.isFinite(loadWatts) || loadWatts < 0) return null;

  const efficiency = resolveEfficiency(portType);
  const standby = portType === 'ac' ? STANDBY_DRAIN_WATTS : 0;
  const denominator = loadWatts + standby;
  if (denominator <= 0) return null;

  return (capacityWh * efficiency) / denominator;
}
