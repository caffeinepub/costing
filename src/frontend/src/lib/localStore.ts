// Local storage persistence for costing records and production entries
// This ensures data survives backend redeploys

const COSTING_RECORDS_KEY = "costing_app_records_v1";
const PRODUCTION_ENTRIES_KEY = "costing_app_production_v1";

// Serialize bigint to/from JSON
function serialize(obj: unknown): string {
  return JSON.stringify(obj, (_key, val) =>
    typeof val === "bigint" ? { __bigint: val.toString() } : val,
  );
}

function deserialize<T>(str: string): T {
  return JSON.parse(str, (_key, val) => {
    if (val && typeof val === "object" && "__bigint" in val) {
      return BigInt(val.__bigint as string);
    }
    return val;
  }) as T;
}

export type LocalCostingRecord = {
  id: bigint;
  name: string;
  gradeId: bigint;
  layerId: bigint;
  gsmRangeId: bigint;
  width: number;
  length: number;
  quantity: bigint;
  items: Array<{ rmId: bigint; quantity: number }>;
  totalCost: number;
  createdAt: bigint;
};

export type LocalProductionEntry = {
  id: bigint;
  costingRecordId: bigint;
  productionQtyMT: number;
  calculatedItems: Array<{
    rmId: bigint;
    baseQty: number;
    calculatedQty: number;
  }>;
  createdAt: bigint;
  // entryDate stored as YYYY-MM-DD string for reliable display/editing
  entryDate?: string;
};

const toBigInt = (v: unknown): bigint =>
  typeof v === "bigint" ? v : BigInt(String(v));
function getLocalId(): bigint {
  const key = "costing_app_local_id";
  const cur = BigInt(localStorage.getItem(key) ?? "1000000");
  const next = cur + 1n;
  localStorage.setItem(key, next.toString());
  return cur;
}

// Costing Records
export function loadCostingRecords(): LocalCostingRecord[] {
  try {
    const raw = localStorage.getItem(COSTING_RECORDS_KEY);
    if (!raw) return [];
    const records = deserialize<LocalCostingRecord[]>(raw);
    return records.map((r) => ({
      ...r,
      id: toBigInt(r.id),
      gradeId: toBigInt(r.gradeId),
      layerId: toBigInt(r.layerId),
      gsmRangeId: toBigInt(r.gsmRangeId),
      quantity: toBigInt(r.quantity),
      createdAt: toBigInt(r.createdAt),
      items: r.items.map((item) => ({ ...item, rmId: toBigInt(item.rmId) })),
    }));
  } catch {
    return [];
  }
}

export function saveCostingRecord(
  record: Omit<LocalCostingRecord, "id" | "createdAt"> & { totalCost: number },
): LocalCostingRecord {
  const records = loadCostingRecords();
  const newRecord: LocalCostingRecord = {
    ...record,
    id: getLocalId(),
    createdAt: BigInt(Date.now()) * 1_000_000n,
  };
  records.push(newRecord);
  localStorage.setItem(COSTING_RECORDS_KEY, serialize(records));
  return newRecord;
}

export function deleteCostingRecord(id: bigint): void {
  const records = loadCostingRecords().filter((r) => r.id !== id);
  localStorage.setItem(COSTING_RECORDS_KEY, serialize(records));
}

// Production Entries
export function loadProductionEntries(): LocalProductionEntry[] {
  try {
    const raw = localStorage.getItem(PRODUCTION_ENTRIES_KEY);
    if (!raw) return [];
    const entries = deserialize<LocalProductionEntry[]>(raw);
    return entries.map((e) => ({
      ...e,
      id: toBigInt(e.id),
      costingRecordId: toBigInt(e.costingRecordId),
      createdAt: toBigInt(e.createdAt),
      calculatedItems: e.calculatedItems.map((ci) => ({
        ...ci,
        rmId: toBigInt(ci.rmId),
      })),
    }));
  } catch {
    return [];
  }
}

export function saveProductionEntry(
  costingRecordId: bigint,
  productionQtyMT: number,
  items: Array<{ rmId: bigint; quantity: number }>,
  customDate?: Date,
): LocalProductionEntry {
  const entries = loadProductionEntries();
  const calculatedItems = items.map((item) => ({
    rmId: item.rmId,
    baseQty: item.quantity,
    calculatedQty: item.quantity * productionQtyMT,
  }));
  const ts = customDate ? customDate.getTime() : Date.now();
  // Store entryDate as YYYY-MM-DD string for reliable display/editing
  const entryDateStr = customDate
    ? customDate.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const newEntry: LocalProductionEntry = {
    id: getLocalId(),
    costingRecordId,
    productionQtyMT,
    calculatedItems,
    createdAt: BigInt(ts) * 1_000_000n,
    entryDate: entryDateStr,
  };
  entries.push(newEntry);
  localStorage.setItem(PRODUCTION_ENTRIES_KEY, serialize(entries));
  return newEntry;
}

export function updateProductionEntryDate(
  id: bigint,
  newDate: string,
): boolean {
  const entries = loadProductionEntries();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  // Parse the YYYY-MM-DD date and update both entryDate and createdAt
  const d = new Date(`${newDate}T00:00:00`);
  entries[idx] = {
    ...entries[idx],
    entryDate: newDate,
    createdAt: BigInt(d.getTime()) * 1_000_000n,
  };
  localStorage.setItem(PRODUCTION_ENTRIES_KEY, serialize(entries));
  return true;
}

export function deleteProductionEntry(id: bigint): void {
  const entries = loadProductionEntries().filter((e) => e.id !== id);
  localStorage.setItem(PRODUCTION_ENTRIES_KEY, serialize(entries));
}

// ── Master Data ────────────────────────────────────────────────────────────

export type LocalGrade = { id: bigint; name: string; description: string };
export type LocalGsmRange = {
  id: bigint;
  name: string;
  minGsm: number;
  maxGsm: number;
};
export type LocalLayer = { id: bigint; name: string; description: string };
export type LocalRM = {
  id: bigint;
  name: string;
  unitCost: number;
  unit: string;
};
export type LocalUnit = { id: bigint; name: string; description: string };

const GRADES_KEY = "costing_app_grades_v1";
const GSM_RANGES_KEY = "costing_app_gsm_ranges_v1";
const LAYERS_KEY = "costing_app_layers_v1";
const RMS_KEY = "costing_app_rms_v1";
const UNITS_KEY = "costing_app_units_v1";
const MASTER_SEEDED_KEY = "costing_app_master_seeded_v2";

// Seed data
const DEFAULT_GRADES: Omit<LocalGrade, "id">[] = [
  { name: "Deluxe", description: "" },
  { name: "Super", description: "" },
  { name: "Gloss", description: "" },
  { name: "Regular", description: "" },
  { name: "Regular Exp", description: "" },
  { name: "Nano Lite", description: "" },
  { name: "FBB", description: "" },
  { name: "Gloss UNC", description: "" },
  { name: "Deluxe Stock Lot", description: "" },
  { name: "Super Stock Lot", description: "" },
  { name: "Gloss Stock Lot", description: "" },
  { name: "Regular Stock Lot", description: "" },
  { name: "Max Plus Stock Lot", description: "" },
  { name: "FBB Stock Lot", description: "" },
  { name: "Gloss UNC Stock Lot", description: "" },
  { name: "Mixed GSM", description: "" },
];

const DEFAULT_GSM_RANGES: Omit<LocalGsmRange, "id">[] = [
  { name: "200-229", minGsm: 200, maxGsm: 229 },
  { name: "230-249", minGsm: 230, maxGsm: 249 },
  { name: "230-259", minGsm: 230, maxGsm: 259 },
  { name: "250-279", minGsm: 250, maxGsm: 279 },
  { name: "260-319", minGsm: 260, maxGsm: 319 },
  { name: "280-319", minGsm: 280, maxGsm: 319 },
  { name: "320-400", minGsm: 320, maxGsm: 400 },
];

const DEFAULT_LAYERS: Omit<LocalLayer, "id">[] = [
  { name: "TL", description: "Top Layer" },
  { name: "PL", description: "Print Layer" },
  { name: "FL", description: "Flute Layer" },
  { name: "BL", description: "Back Layer" },
];

const DEFAULT_RMS: Omit<LocalRM, "id">[] = [
  { name: "Cup Stock", unitCost: 0, unit: "kg" },
  { name: "Note Book", unitCost: 0, unit: "kg" },
  { name: "No.1 Cutting", unitCost: 0, unit: "kg" },
  { name: "White Reco", unitCost: 0, unit: "kg" },
  { name: "Scan Board", unitCost: 0, unit: "kg" },
  { name: "BBC", unitCost: 0, unit: "kg" },
  { name: "ONP (6)", unitCost: 0, unit: "kg" },
  { name: "Broke", unitCost: 0, unit: "kg" },
  { name: "ONP Local", unitCost: 0, unit: "kg" },
];

const DEFAULT_UNITS: Omit<LocalUnit, "id">[] = [
  { name: "PM-1", description: "Paper Machine 1" },
  { name: "PM-2", description: "Paper Machine 2" },
  { name: "PM-3", description: "Paper Machine 3" },
  { name: "PM-4", description: "Paper Machine 4" },
];

function getMasterLocalId(): bigint {
  const key = "costing_app_master_id";
  const cur = BigInt(localStorage.getItem(key) ?? "1");
  const next = cur + 1n;
  localStorage.setItem(key, next.toString());
  return cur;
}

function loadMasterList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return deserialize<T[]>(raw);
  } catch {
    return [];
  }
}

function saveMasterList<T>(key: string, items: T[]): void {
  localStorage.setItem(key, serialize(items));
}

export function seedMasterDataIfNeeded(): void {
  if (localStorage.getItem(MASTER_SEEDED_KEY)) return;
  const gradesList = loadMasterList<LocalGrade>(GRADES_KEY);
  if (gradesList.length === 0) {
    for (const g of DEFAULT_GRADES) {
      gradesList.push({ ...g, id: getMasterLocalId() });
    }
    saveMasterList(GRADES_KEY, gradesList);
  }
  const gsmList = loadMasterList<LocalGsmRange>(GSM_RANGES_KEY);
  if (gsmList.length === 0) {
    for (const g of DEFAULT_GSM_RANGES) {
      gsmList.push({ ...g, id: getMasterLocalId() });
    }
    saveMasterList(GSM_RANGES_KEY, gsmList);
  }
  const layersList = loadMasterList<LocalLayer>(LAYERS_KEY);
  if (layersList.length === 0) {
    for (const l of DEFAULT_LAYERS) {
      layersList.push({ ...l, id: getMasterLocalId() });
    }
    saveMasterList(LAYERS_KEY, layersList);
  }
  const rmsList = loadMasterList<LocalRM>(RMS_KEY);
  if (rmsList.length === 0) {
    for (const r of DEFAULT_RMS) {
      rmsList.push({ ...r, id: getMasterLocalId() });
    }
    saveMasterList(RMS_KEY, rmsList);
  }
  // Always seed units if not present
  const unitsList = loadMasterList<LocalUnit>(UNITS_KEY);
  if (unitsList.length === 0) {
    for (const u of DEFAULT_UNITS) {
      unitsList.push({ ...u, id: getMasterLocalId() });
    }
    saveMasterList(UNITS_KEY, unitsList);
  }
  localStorage.setItem(MASTER_SEEDED_KEY, "true");
}

// Grade CRUD
export function loadGrades(): LocalGrade[] {
  return loadMasterList<LocalGrade>(GRADES_KEY).map((r) => ({
    ...r,
    id: BigInt(String(r.id)),
  }));
}
export function createGrade(name: string, description: string): LocalGrade {
  const list = loadGrades();
  const item = { id: getMasterLocalId(), name, description };
  list.push(item);
  saveMasterList(GRADES_KEY, list);
  return item;
}
export function updateGrade(
  id: bigint,
  name: string,
  description: string,
): boolean {
  const list = loadGrades();
  const idx = list.findIndex((g) => g.id === id);
  if (idx === -1) return false;
  list[idx] = { id, name, description };
  saveMasterList(GRADES_KEY, list);
  return true;
}
export function deleteGrade(id: bigint): boolean {
  const list = loadGrades().filter((g) => g.id !== id);
  saveMasterList(GRADES_KEY, list);
  return true;
}

// GSM Range CRUD
export function loadGsmRanges(): LocalGsmRange[] {
  return loadMasterList<LocalGsmRange>(GSM_RANGES_KEY).map((r) => ({
    ...r,
    id: BigInt(String(r.id)),
  }));
}
export function createGsmRange(
  name: string,
  minGsm: number,
  maxGsm: number,
): LocalGsmRange {
  const list = loadGsmRanges();
  const item = { id: getMasterLocalId(), name, minGsm, maxGsm };
  list.push(item);
  saveMasterList(GSM_RANGES_KEY, list);
  return item;
}
export function updateGsmRange(
  id: bigint,
  name: string,
  minGsm: number,
  maxGsm: number,
): boolean {
  const list = loadGsmRanges();
  const idx = list.findIndex((g) => g.id === id);
  if (idx === -1) return false;
  list[idx] = { id, name, minGsm, maxGsm };
  saveMasterList(GSM_RANGES_KEY, list);
  return true;
}
export function deleteGsmRange(id: bigint): boolean {
  const list = loadGsmRanges().filter((g) => g.id !== id);
  saveMasterList(GSM_RANGES_KEY, list);
  return true;
}

// Layer CRUD
export function loadLayers(): LocalLayer[] {
  return loadMasterList<LocalLayer>(LAYERS_KEY).map((r) => ({
    ...r,
    id: BigInt(String(r.id)),
  }));
}
export function createLayer(name: string, description: string): LocalLayer {
  const list = loadLayers();
  const item = { id: getMasterLocalId(), name, description };
  list.push(item);
  saveMasterList(LAYERS_KEY, list);
  return item;
}
export function updateLayer(
  id: bigint,
  name: string,
  description: string,
): boolean {
  const list = loadLayers();
  const idx = list.findIndex((l) => l.id === id);
  if (idx === -1) return false;
  list[idx] = { id, name, description };
  saveMasterList(LAYERS_KEY, list);
  return true;
}
export function deleteLayer(id: bigint): boolean {
  const list = loadLayers().filter((l) => l.id !== id);
  saveMasterList(LAYERS_KEY, list);
  return true;
}

// RM CRUD
export function loadRMs(): LocalRM[] {
  return loadMasterList<LocalRM>(RMS_KEY).map((r) => ({
    ...r,
    id: BigInt(String(r.id)),
  }));
}
export function createRM(
  name: string,
  unitCost: number,
  unit: string,
): LocalRM {
  const list = loadRMs();
  const item = { id: getMasterLocalId(), name, unitCost, unit };
  list.push(item);
  saveMasterList(RMS_KEY, list);
  return item;
}
export function updateRM(
  id: bigint,
  name: string,
  unitCost: number,
  unit: string,
): boolean {
  const list = loadRMs();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  list[idx] = { id, name, unitCost, unit };
  saveMasterList(RMS_KEY, list);
  return true;
}
export function deleteRM(id: bigint): boolean {
  const list = loadRMs().filter((r) => r.id !== id);
  saveMasterList(RMS_KEY, list);
  return true;
}

// Unit CRUD (site/location classification: PM-1, PM-2, etc.)
export function loadUnits(): LocalUnit[] {
  return loadMasterList<LocalUnit>(UNITS_KEY).map((r) => ({
    ...r,
    id: BigInt(String(r.id)),
  }));
}
export function createUnit(name: string, description: string): LocalUnit {
  const list = loadUnits();
  const item = { id: getMasterLocalId(), name, description };
  list.push(item);
  saveMasterList(UNITS_KEY, list);
  return item;
}
export function updateUnit(
  id: bigint,
  name: string,
  description: string,
): boolean {
  const list = loadUnits();
  const idx = list.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  list[idx] = { id, name, description };
  saveMasterList(UNITS_KEY, list);
  return true;
}
export function deleteUnit(id: bigint): boolean {
  const list = loadUnits().filter((u) => u.id !== id);
  saveMasterList(UNITS_KEY, list);
  return true;
}
