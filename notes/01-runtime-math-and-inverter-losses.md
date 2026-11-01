# Technical Note 01: Runtime Math and Inverter Losses

- **Reference model:** [`tools/runtime.mjs`](../tools/runtime.mjs)
- **Status:** reference implementation of the documented core; estimates, not measurements
- **Scope:** public data notes for legacy models

---

## 1. Why `Watt-Hours ÷ Watts` Overstates Runtime

The common shortcut is:

```text
runtime = nominal capacity / appliance power
```

That ignores conversion losses and standby draw. For a 1,000 Wh station and a 100 W AC load, the naive result is 10 hours. A more realistic estimate is lower because the inverter is not 100% efficient and draws a small baseline while the AC output is enabled.

## 2. Reference Model

The reference model uses one equation:

```text
runtime = capacity × efficiency / (load + standby)
```

| Parameter | Value | Scope |
|---|---|---|
| AC efficiency | `0.85` | AC loads, and loads without a confirmed port type |
| DC/USB efficiency | `0.92` | 12 V DC and USB outputs |
| AC standby | `10 W` | Applied only when the load is AC |
| DC/USB standby | `0 W` | The inverter can be off |

For a 1,000 Wh station with a 100 W AC load:

```text
1,000 Wh × 0.85 / (100 W + 10 W) = 850 / 110 ≈ 7.73 hours
```

For the same station with a 100 W DC load:

```text
1,000 Wh × 0.92 / 100 W = 9.2 hours
```

These are example numbers, not a claim about any specific product.

## 3. Scope and Limitations

- Per-model depth of discharge (DoD) and manufacturer-specific self-consumption are maintained separately in the production engine.
- Battery age, cycle degradation, and temperature derating are not modelled.
- Load-dependent inverter efficiency curves are not modelled.
- Device duty cycles, surge/startup currents, and expansion compatibility are not part of the core model.
- The production Power Finder applies additional model-specific assumptions that are not published in this repository.

## 4. Safety

- Results are estimates with visible assumptions, not guarantees.
- Do not use this model for medical or life-support equipment.
- Do not use it to design backfeeding or household transfer-switch wiring.
- Verify specifications with the manufacturer and follow local electrical codes.

## 5. Reproduce the Example

```bash
node --test tools/runtime.test.mjs
```

```js
import { estimateRuntimeHours } from './tools/runtime.mjs';

estimateRuntimeHours({ capacityWh: 1000, loadWatts: 100, portType: 'ac' }); // ≈ 7.73
estimateRuntimeHours({ capacityWh: 1000, loadWatts: 100, portType: 'dc' }); // 9.2
```

## Sources

The dataset's `data/sources.json` lists the manufacturer documents used for the published specifications. This note describes the reference model and does not quote or reproduce those documents.
