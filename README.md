# PowerStationLabs — Portable Power Data Notes

Source-backed specifications and a reference runtime model for portable power stations — including legacy models that manufacturers stop documenting.

PowerStationLabs is an independent data and runtime-estimation publisher. This repository is the public technical reference behind our catalog and Power Finder estimates. Active models are documented on [powerstationlabs.com](https://powerstationlabs.com); this repository focuses on legacy hardware.

## Why legacy models

Manufacturers retire manuals, replace SKUs, and change regional variants. Owners, repair shops, and researchers still need the original specifications. We keep a source-backed reference set and show the assumptions behind runtime estimates, so the data remains useful after the product page disappears.

## What's inside

- **6 legacy models** with at least one manufacturer source:
  `ac200l`, `ac200max`, `bluetti-ac2a`, `bluetti-pioneer-md-ac180t`, `eb3a`, `eb70`.
- The reference set is generated from the internal PowerStationLabs catalog and expands as more models reach end-of-life.
- Active models, current commercial offers, editorial content, translations, load profiles, and the full production engine are maintained on [powerstationlabs.com](https://powerstationlabs.com).

| Path | What it is |
|---|---|
| `data/stations.json` | Station specifications with source references and per-field provenance where available |
| `data/stations.csv` | The same rows in a flat format |
| `data/sources.json` | Source index: publisher, title, URL, SHA-256, access date, variant |
| `data/COVERAGE.md` | Included models and the current source status |
| `schema/station.schema.json` | JSON Schema for the dataset |
| `tools/validate.mjs` | Zero-dependency validator, including a redaction boundary check |
| `tools/runtime.mjs` | Reference implementation of the core runtime model |
| `tools/runtime.test.mjs` | Tests for the runtime model |
| `notes/01-runtime-math-and-inverter-losses.md` | Why `Wh ÷ W` overstates runtime, and how the model works |

Run the checks:

```bash
node tools/validate.mjs
node --test tools/runtime.test.mjs
```

## Runtime model

`tools/runtime.mjs` is the reference implementation of the documented core:

```text
runtime = capacity × efficiency / (load + standby)
```

It covers AC/DC port efficiency, inverter standby, and duty cycle. The production Power Finder applies additional model-specific assumptions maintained separately. Results are estimates, not measurements or guarantees.

## Provenance

Every row carries at least one manufacturer source. Two provenance levels are used:

| Level | Meaning |
|---|---|
| `field_citation` | At least one specification has a published field-level citation with a locator. |
| `manual_extract` | Values were checked against the listed manufacturer manual(s), identified by URL and SHA-256. No per-field locator is published for this model yet. |

`field_citation` means **at least one field** is cited, not that every field is. Missing values are `null`, not guessed.

Values are transcribed from manufacturer documents by PowerStationLabs. They are not independent laboratory measurements. Verify the current specification, regional variant, and warranty with the manufacturer before relying on a value.

## Related tools

- [Power Finder](https://powerstationlabs.com/finder) — size a station from a device list and see the assumptions.
- [Catalog](https://powerstationlabs.com/catalog) — active models and series.
- [Methodology](https://powerstationlabs.com/methodology) — calculation rules and limitations.
- [Affiliate disclosure](https://powerstationlabs.com/disclosure) — how commercial links work on the site.

## Licenses

- **Data and notes:** [CC BY 4.0](LICENSE-DATA). Attribution must include a visible link to <https://powerstationlabs.com> and the dataset version. See [ATTRIBUTION.md](ATTRIBUTION.md).
- **Code and schema:** [MIT](LICENSE). If you use the code in a commercial product, a link to <https://powerstationlabs.com> is appreciated but is not a condition of the MIT license. See [NOTICE](NOTICE).

Manufacturer documents, product names, and trademarks remain the property of their respective owners. The licenses above apply only to the original compilation, notes, and code in this repository. See [NOTICE](NOTICE).

## Disclaimers

- This repository is **not affiliated with, endorsed by, or an official partner of** any manufacturer unless a separate signed agreement says so.
- It is **not professional engineering advice**. Verify specifications with the manufacturer and follow local electrical codes. Installation of solar arrays, transfer switches, and household wiring should be performed by a qualified electrician.
- Do **not** use the runtime model for medical or life-support equipment, backfeeding, or any application where a power failure can cause injury or property damage.
- Runtime results are estimates. Battery age, temperature, load-dependent inverter efficiency, and device duty cycles are not modelled.

## Corrections

Open a **Specification correction** issue with the station slug, field, proposed value, source URL, and locator (page/section/table). We verify the source and update the dataset through the internal export pipeline.

## Contact

`info@powerstationlabs.com`
