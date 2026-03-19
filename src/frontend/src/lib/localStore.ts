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
};

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
    return deserialize<LocalCostingRecord[]>(raw);
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
    return deserialize<LocalProductionEntry[]>(raw);
  } catch {
    return [];
  }
}

export function saveProductionEntry(
  costingRecordId: bigint,
  productionQtyMT: number,
  items: Array<{ rmId: bigint; quantity: number }>,
): LocalProductionEntry {
  const entries = loadProductionEntries();
  const calculatedItems = items.map((item) => ({
    rmId: item.rmId,
    baseQty: item.quantity,
    calculatedQty: item.quantity * productionQtyMT,
  }));
  const newEntry: LocalProductionEntry = {
    id: getLocalId(),
    costingRecordId,
    productionQtyMT,
    calculatedItems,
    createdAt: BigInt(Date.now()) * 1_000_000n,
  };
  entries.push(newEntry);
  localStorage.setItem(PRODUCTION_ENTRIES_KEY, serialize(entries));
  return newEntry;
}

export function deleteProductionEntry(id: bigint): void {
  const entries = loadProductionEntries().filter((e) => e.id !== id);
  localStorage.setItem(PRODUCTION_ENTRIES_KEY, serialize(entries));
}
