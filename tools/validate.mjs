#!/usr/bin/env node
/**
 * Zero-dependency validator for the public dataset.
 *
 * Checks structure, types, cross-references, schema consistency, CSV parity,
 * coverage notes, and the redaction boundary (no prices, affiliate data,
 * internal identifiers, non-English content, or tracking parameters).
 *
 * Usage: node tools/validate.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

const INT_FIELDS = new Set([
  'capacity', 'power', 'peak_power', 'cycles', 'solar_input', 'ac_outlets', 'usb_a_ports',
  'usb_c_ports', 'dc_ports', 'max_expansion', 'usbc_max_power',
  'mppt_controllers_count', 'ac_charging_power_eu', 'ac_charging_power_us',
  'wireless_charging', 'charge_temp_min', 'charge_temp_max', 'discharge_temp_min',
  'discharge_temp_max', 'storage_temp_min', 'storage_temp_max', 'cycle_life_soh',
  'car_outlets', 'dc5521_ports', 'ac_voltage_eu', 'ac_voltage_us',
  'ac_power_eu', 'ac_power_us', 'ac_peak_power_eu', 'ac_peak_power_us', 'ac_outlets_eu',
  'ac_outlets_us',
]);

const NUMBER_FIELDS = new Set([
  'weight', 'dim_length_mm', 'dim_width_mm', 'dim_height_mm',
  'solar_voltage_min', 'solar_voltage_max', 'solar_current_max',
]);

const STRING_FIELDS = new Set([
  'dimensions', 'battery_type', 'solar_voltage', 'solar_current',
  'inverter_wave', 'charge_temp', 'discharge_temp', 'app_connectivity',
  'ac_frequency_eu', 'ac_frequency_us', 'ac_outlet_type_eu', 'ac_outlet_type_us',
]);

const BOOLEAN_FIELDS = new Set(['has_ups', 'has_app', 'expandable', 'pass_through']);

const SPEC_FIELDS = new Set([
  ...INT_FIELDS,
  ...NUMBER_FIELDS,
  ...STRING_FIELDS,
  ...BOOLEAN_FIELDS,
]);

const FORBIDDEN_KEYS = new Set([
  'msrp', 'price', 'warranty', 'affiliate_links', 'affiliate', 'offer_id', 'offerid', 'sku', 'subid',
  'sub_id', 'tracking_url', 'image', 'gallery', 'description', 'tagline', 'pros', 'cons',
  'features', 'best_for', 'meta_title', 'meta_description', 'og_image', 'canonical_url',
  'translations', 'directus_id', 'internal_id', 'staging_path',
]);

const FORBIDDEN_PATTERNS = [
  [/utm_/i, 'tracking parameter'],
  [/[?&](aff|affiliate|ref|tag|clickid|gclid|subid|sub_id|offer_id)=/i, 'affiliate/tracking parameter'],
  [/\bamazon\./i, 'marketplace tracking reference'],
  [/\bsubid\b/i, 'internal subid'],
  [/affiliate/i, 'affiliate reference'],
  [/\bmsrp\b/i, 'price reference'],
  [/local:\/\//i, 'local source path'],
  [/staging\//i, 'staging path'],
  [/localhost|127\.0\.0\.1/i, 'local endpoint'],
  [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, 'UUID'],
  [/http:\/\//i, 'non-TLS URL'],
];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function readJson(relative) {
  const absolute = path.join(ROOT, relative);
  check(fs.existsSync(absolute), `missing file: ${relative}`);
  if (!fs.existsSync(absolute)) return null;
  try {
    return JSON.parse(fs.readFileSync(absolute, 'utf8'));
  } catch (error) {
    errors.push(`${relative}: invalid JSON (${error.message})`);
    return null;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function scanStrings(value, trail) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanStrings(item, `${trail}[${index}]`));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
        errors.push(`${trail}.${key}: forbidden key`);
      }
      scanStrings(child, `${trail}.${key}`);
    }
    return;
  }
  if (typeof value !== 'string') return;
  const isPublicUrl = /^https:\/\//i.test(value);
  for (const [pattern, reason] of FORBIDDEN_PATTERNS) {
    if (reason === 'UUID' && isPublicUrl) continue;
    if (pattern.test(value)) errors.push(`${trail}: ${reason}`);
  }
}

const dataset = readJson('data/stations.json');
const sourcesPayload = readJson('data/sources.json');
const schema = readJson('schema/station.schema.json');

if (dataset) {
  check(isPlainObject(dataset), 'stations.json: root must be an object');
  check(dataset.schema_version === '1.0.0', 'stations.json: schema_version must be 1.0.0');
  check(/^[0-9]{4}\.[0-9]{2}(?:\.[0-9]+)?$/.test(String(dataset.dataset_version)), 'stations.json: dataset_version must be YYYY.MM or YYYY.MM.N');
  check(dataset.locale === 'en', 'stations.json: locale must be en');
  check(dataset.license === 'CC-BY-4.0', 'stations.json: license must be CC-BY-4.0');
  check(typeof dataset.catalog === 'string' && /^https:\/\//.test(dataset.catalog), 'stations.json: catalog must be an https URL');
  check(!Number.isNaN(Date.parse(dataset.generated_at)), 'stations.json: generated_at must be a date-time');
  check(Array.isArray(dataset.stations) && dataset.stations.length > 0, 'stations.json: stations must be a non-empty array');
  check(isPlainObject(dataset.provenance_levels), 'stations.json: provenance_levels must be an object');
}

if (schema) {
  const schemaFields = schema?.$defs?.station?.properties?.specs?.required;
  check(Array.isArray(schemaFields), 'schema: specs.required must be an array');
  if (Array.isArray(schemaFields)) {
    check(schemaFields.length === SPEC_FIELDS.size, `schema: expected ${SPEC_FIELDS.size} spec fields, found ${schemaFields.length}`);
    for (const field of SPEC_FIELDS) {
      check(schemaFields.includes(field), `schema: missing spec field ${field}`);
    }
    for (const field of schemaFields) {
      check(SPEC_FIELDS.has(field), `schema: unexpected spec field ${field}`);
    }
  }
  check(schema?.$defs?.station?.additionalProperties === false, 'schema: station must set additionalProperties: false');
  check(schema?.$defs?.station?.properties?.specs?.additionalProperties === false, 'schema: specs must set additionalProperties: false');
}

const stations = Array.isArray(dataset?.stations) ? dataset.stations : [];
const sources = Array.isArray(sourcesPayload?.sources) ? sourcesPayload.sources : [];
const sourceIds = new Set();
const stationSlugs = new Set();

for (const source of sources) {
  check(typeof source.id === 'string' && source.id.length > 0, 'sources: source id is required');
  check(!sourceIds.has(source.id), `sources: duplicate id ${source.id}`);
  sourceIds.add(source.id);
  check(['manufacturer_manual', 'manufacturer_document'].includes(source.type), `sources: invalid type for ${source.id}`);
  check(typeof source.publisher === 'string' && source.publisher.length > 0, `sources: publisher missing for ${source.id}`);
  check(typeof source.title === 'string' && source.title.length > 0, `sources: title missing for ${source.id}`);
  check(typeof source.url === 'string' && /^https:\/\//.test(source.url), `sources: url must be https for ${source.id}`);
  check(typeof source.content_hash === 'string' && source.content_hash.length > 0, `sources: content_hash missing for ${source.id}`);
  check(['sha256', 'source-provided'].includes(source.hash_algorithm), `sources: invalid hash_algorithm for ${source.id}`);
  check(source.accessed_at === null || /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(source.accessed_at)), `sources: invalid accessed_at for ${source.id}`);
  check(source.variant === null || typeof source.variant === 'string', `sources: invalid variant for ${source.id}`);
  check(Array.isArray(source.models) && source.models.length > 0, `sources: models missing for ${source.id}`);
}

for (const station of stations) {
  const label = `station ${station?.slug ?? '<unknown>'}`;
  check(typeof station.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(station.slug), `${label}: invalid slug`);
  check(!stationSlugs.has(station.slug), `${label}: duplicate slug`);
  stationSlugs.add(station.slug);
  check(typeof station.brand === 'string' && station.brand.length > 0, `${label}: brand missing`);
  check(typeof station.name === 'string' && station.name.length > 0, `${label}: name missing`);
  check(station.series === null || typeof station.series === 'string', `${label}: invalid series`);
  check(['field_citation', 'manual_extract'].includes(station.provenance_level), `${label}: invalid provenance_level`);
  check(station.verified_at === null || /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(station.verified_at)), `${label}: invalid verified_at`);
  check(isPlainObject(station.specs), `${label}: specs must be an object`);
  check(station.lifecycle_status === 'discontinued', `${label}: lifecycle_status must be discontinued`);

  if (isPlainObject(station.specs)) {
    const keys = Object.keys(station.specs);
    check(keys.length === SPEC_FIELDS.size, `${label}: expected ${SPEC_FIELDS.size} spec keys, found ${keys.length}`);
    for (const field of keys) {
      check(SPEC_FIELDS.has(field), `${label}: unexpected spec field ${field}`);
      const value = station.specs[field];
      if (value === null) continue;
      if (INT_FIELDS.has(field)) check(Number.isInteger(value), `${label}.${field}: expected integer or null`);
      else if (NUMBER_FIELDS.has(field)) check(typeof value === 'number' && Number.isFinite(value), `${label}.${field}: expected number or null`);
      else if (BOOLEAN_FIELDS.has(field)) check(typeof value === 'boolean', `${label}.${field}: expected boolean or null`);
      else if (STRING_FIELDS.has(field)) check(typeof value === 'string' && value.length > 0, `${label}.${field}: expected non-empty string or null`);
    }
    if (station.specs.battery_type !== null) {
      check(
        ['LiFePO4', 'Li-ion', 'NMC', 'Sodium-ion'].includes(station.specs.battery_type),
        `${label}.battery_type: unexpected value`
      );
    }
  }

  check(Array.isArray(station.sources) && station.sources.length > 0, `${label}: sources must be a non-empty array`);
  check(new Set(station.sources).size === station.sources.length, `${label}: duplicate source reference`);
  for (const sourceId of station.sources) {
    check(sourceIds.has(sourceId), `${label}: unknown source ${sourceId}`);
  }

  check(isPlainObject(station.provenance), `${label}: provenance must be an object`);
  const provenanceKeys = Object.keys(station.provenance ?? {});
  if (station.provenance_level === 'field_citation') {
    check(provenanceKeys.length > 0, `${label}: field_citation requires at least one provenance entry`);
  } else {
    check(provenanceKeys.length === 0, `${label}: manual_extract must not claim field-level provenance`);
  }
  for (const field of provenanceKeys) {
    check(SPEC_FIELDS.has(field), `${label}: provenance for unknown field ${field}`);
    const entry = station.provenance[field];
    check(isPlainObject(entry), `${label}.${field}: provenance entry must be an object`);
    check(typeof entry.source === 'string' && entry.source.length > 0, `${label}.${field}: provenance source missing`);
    check(typeof entry.locator === 'string' && entry.locator.length > 0, `${label}.${field}: provenance locator missing`);
    check(station.sources.includes(entry.source), `${label}.${field}: provenance source must be listed in station.sources`);
  }
}

for (const source of sources) {
  for (const model of source.models ?? []) {
    check(stationSlugs.has(model), `source ${source.id}: unknown model ${model}`);
  }
}

if (sourcesPayload && dataset) {
  check(sourcesPayload.dataset_version === dataset.dataset_version, 'sources.json: dataset_version mismatch');
  check(sourcesPayload.license === dataset.license, 'sources.json: license mismatch');
}

// CSV parity: one row per station, same slugs, same header order.
const csvPath = path.join(ROOT, 'data/stations.csv');
check(fs.existsSync(csvPath), 'missing file: data/stations.csv');
if (fs.existsSync(csvPath)) {
  const csv = fs.readFileSync(csvPath, 'utf8').trimEnd().split('\n');
  const header = csv[0]?.split(',') ?? [];
  check(header[0] === 'slug', 'stations.csv: header must start with slug');
  check(header.length === 7 + SPEC_FIELDS.size, `stations.csv: expected ${7 + SPEC_FIELDS.size} columns, found ${header.length}`);
  check(csv.length - 1 === stations.length, `stations.csv: expected ${stations.length} rows, found ${csv.length - 1}`);
  const csvSlugs = csv.slice(1).map((line) => line.split(',')[0]).sort();
  const jsonSlugs = stations.map((station) => station.slug).sort();
  check(JSON.stringify(csvSlugs) === JSON.stringify(jsonSlugs), 'stations.csv: slugs do not match stations.json');
}

// Coverage notes must reflect the dataset count.
const coveragePath = path.join(ROOT, 'data/COVERAGE.md');
check(fs.existsSync(coveragePath), 'missing file: data/COVERAGE.md');
if (fs.existsSync(coveragePath)) {
  const coverage = fs.readFileSync(coveragePath, 'utf8');
  check(coverage.includes(`Included in the dataset: ${stations.length}`), 'COVERAGE.md: included count does not match dataset');
}

const readmePath = path.join(ROOT, 'README.md');
if (fs.existsSync(readmePath)) {
  const readme = fs.readFileSync(readmePath, 'utf8');
  check(readme.includes(`${stations.length} legacy models`), 'README.md: legacy model count does not match dataset');
}

scanStrings(dataset, 'stations.json');
scanStrings(sourcesPayload, 'sources.json');

if (errors.length > 0) {
  console.error(`❌ Validation failed with ${errors.length} issue(s):`);
  for (const error of errors.slice(0, 50)) console.error(`  - ${error}`);
  if (errors.length > 50) console.error(`  ... and ${errors.length - 50} more`);
  process.exitCode = 1;
} else {
  const fieldCitation = stations.filter((station) => station.provenance_level === 'field_citation').length;
  const manualExtract = stations.filter((station) => station.provenance_level === 'manual_extract').length;
  console.log(`✅ Validation passed: ${stations.length} stations, ${sources.length} sources, ${fieldCitation} field_citation, ${manualExtract} manual_extract.`);
}
