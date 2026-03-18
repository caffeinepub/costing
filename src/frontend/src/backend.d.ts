import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Grade {
    id: bigint;
    name: string;
    description: string;
}
export interface ProductionEntry {
    id: bigint;
    costingRecordId: bigint;
    productionQtyMT: number;
    createdAt: bigint;
    calculatedItems: Array<CalculatedItem>;
}
export interface CalculatedItem {
    baseQty: number;
    rmId: bigint;
    calculatedQty: number;
}
export interface GsmRange {
    id: bigint;
    name: string;
    minGsm: number;
    maxGsm: number;
}
export interface RM {
    id: bigint;
    name: string;
    unit: string;
    unitCost: number;
}
export interface CostingRecord {
    id: bigint;
    gsmRangeId: bigint;
    layerId: bigint;
    name: string;
    createdAt: bigint;
    totalCost: number;
    gradeId: bigint;
    length: number;
    quantity: bigint;
    items: Array<CostingItem>;
    width: number;
}
export interface CostingItem {
    rmId: bigint;
    quantity: number;
}
export interface Layer {
    id: bigint;
    name: string;
    description: string;
}
export interface backendInterface {
    createCostingRecord(name: string, gradeId: bigint, layerId: bigint, gsmRangeId: bigint, width: number, length: number, quantity: bigint, items: Array<CostingItem>): Promise<bigint>;
    createGrade(name: string, description: string): Promise<bigint>;
    createGsmRange(name: string, minGsm: number, maxGsm: number): Promise<bigint>;
    createLayer(name: string, description: string): Promise<bigint>;
    createProductionEntry(costingRecordId: bigint, productionQtyMT: number): Promise<bigint>;
    createRM(name: string, unitCost: number, unit: string): Promise<bigint>;
    deleteCostingRecord(id: bigint): Promise<boolean>;
    deleteGrade(id: bigint): Promise<boolean>;
    deleteGsmRange(id: bigint): Promise<boolean>;
    deleteLayer(id: bigint): Promise<boolean>;
    deleteProductionEntry(id: bigint): Promise<boolean>;
    deleteRM(id: bigint): Promise<boolean>;
    getCostingRecord(id: bigint): Promise<CostingRecord | null>;
    getGrade(id: bigint): Promise<Grade | null>;
    getGsmRange(id: bigint): Promise<GsmRange | null>;
    getLayer(id: bigint): Promise<Layer | null>;
    getRM(id: bigint): Promise<RM | null>;
    listCostingRecords(): Promise<Array<CostingRecord>>;
    listGrades(): Promise<Array<Grade>>;
    listGsmRanges(): Promise<Array<GsmRange>>;
    listLayers(): Promise<Array<Layer>>;
    listProductionEntries(): Promise<Array<ProductionEntry>>;
    listRMs(): Promise<Array<RM>>;
    updateGrade(id: bigint, name: string, description: string): Promise<boolean>;
    updateGsmRange(id: bigint, name: string, minGsm: number, maxGsm: number): Promise<boolean>;
    updateLayer(id: bigint, name: string, description: string): Promise<boolean>;
    updateRM(id: bigint, name: string, unitCost: number, unit: string): Promise<boolean>;
}
