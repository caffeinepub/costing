import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CostingItem } from "../backend.d";
import {
  loadCostingRecords,
  loadGrades,
  loadGsmRanges,
  loadLayers,
  loadProductionEntries,
  loadRMs,
  loadUnits,
  createGrade as localCreateGrade,
  createGsmRange as localCreateGsmRange,
  createLayer as localCreateLayer,
  createRM as localCreateRM,
  createUnit as localCreateUnit,
  deleteCostingRecord as localDeleteCostingRecord,
  deleteGrade as localDeleteGrade,
  deleteGsmRange as localDeleteGsmRange,
  deleteLayer as localDeleteLayer,
  deleteProductionEntry as localDeleteProductionEntry,
  deleteRM as localDeleteRM,
  deleteUnit as localDeleteUnit,
  updateGrade as localUpdateGrade,
  updateGsmRange as localUpdateGsmRange,
  updateLayer as localUpdateLayer,
  updateRM as localUpdateRM,
  updateUnit as localUpdateUnit,
  saveCostingRecord,
  saveProductionEntry,
  seedMasterDataIfNeeded,
} from "../lib/localStore";

export function useListGsmRanges() {
  seedMasterDataIfNeeded();
  return useQuery({
    queryKey: ["gsmRanges"],
    queryFn: () => loadGsmRanges(),
    staleTime: 0,
  });
}

export function useListGrades() {
  seedMasterDataIfNeeded();
  return useQuery({
    queryKey: ["grades"],
    queryFn: () => loadGrades(),
    staleTime: 0,
  });
}

export function useListLayers() {
  seedMasterDataIfNeeded();
  return useQuery({
    queryKey: ["layers"],
    queryFn: () => loadLayers(),
    staleTime: 0,
  });
}

export function useListRMs() {
  seedMasterDataIfNeeded();
  return useQuery({
    queryKey: ["rms"],
    queryFn: () => loadRMs(),
    staleTime: 0,
  });
}

export function useListUnits() {
  seedMasterDataIfNeeded();
  return useQuery({
    queryKey: ["units"],
    queryFn: () => loadUnits(),
    staleTime: 0,
  });
}

// Costing Records — use localStorage as primary store
export function useListCostingRecords() {
  return useQuery({
    queryKey: ["costingRecords"],
    queryFn: () => loadCostingRecords(),
    staleTime: 0,
  });
}

export function useGetCostingRecord(id: bigint | null) {
  return useQuery({
    queryKey: ["costingRecord", id?.toString()],
    queryFn: () => {
      if (id == null) return null;
      return loadCostingRecords().find((r) => r.id === id) ?? null;
    },
    enabled: id != null,
    staleTime: 0,
  });
}

// Production Entries — use localStorage as primary store
export function useListProductionEntries() {
  return useQuery({
    queryKey: ["productionEntries"],
    queryFn: () => loadProductionEntries(),
    staleTime: 0,
  });
}

// Master Data Mutations — local storage
export function useCreateGsmRange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { name: string; minGsm: number; maxGsm: number }) => {
      const item = localCreateGsmRange(d.name, d.minGsm, d.maxGsm);
      return Promise.resolve(item.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gsmRanges"] }),
  });
}

export function useUpdateGsmRange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: {
      id: bigint;
      name: string;
      minGsm: number;
      maxGsm: number;
    }) => {
      return Promise.resolve(
        localUpdateGsmRange(d.id, d.name, d.minGsm, d.maxGsm),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gsmRanges"] }),
  });
}

export function useDeleteGsmRange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => Promise.resolve(localDeleteGsmRange(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gsmRanges"] }),
  });
}

export function useCreateGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { name: string; description: string }) => {
      const item = localCreateGrade(d.name, d.description);
      return Promise.resolve(item.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grades"] }),
  });
}

export function useUpdateGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { id: bigint; name: string; description: string }) => {
      return Promise.resolve(localUpdateGrade(d.id, d.name, d.description));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grades"] }),
  });
}

export function useDeleteGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => Promise.resolve(localDeleteGrade(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grades"] }),
  });
}

export function useCreateLayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { name: string; description: string }) => {
      const item = localCreateLayer(d.name, d.description);
      return Promise.resolve(item.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["layers"] }),
  });
}

export function useUpdateLayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { id: bigint; name: string; description: string }) => {
      return Promise.resolve(localUpdateLayer(d.id, d.name, d.description));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["layers"] }),
  });
}

export function useDeleteLayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => Promise.resolve(localDeleteLayer(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["layers"] }),
  });
}

export function useCreateRM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { name: string; unitCost: number; unit: string }) => {
      const item = localCreateRM(d.name, d.unitCost, d.unit);
      return Promise.resolve(item.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rms"] }),
  });
}

export function useUpdateRM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: {
      id: bigint;
      name: string;
      unitCost: number;
      unit: string;
    }) => {
      return Promise.resolve(localUpdateRM(d.id, d.name, d.unitCost, d.unit));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rms"] }),
  });
}

export function useDeleteRM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => Promise.resolve(localDeleteRM(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rms"] }),
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { name: string; description: string }) => {
      const item = localCreateUnit(d.name, d.description);
      return Promise.resolve(item.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["units"] }),
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { id: bigint; name: string; description: string }) => {
      return Promise.resolve(localUpdateUnit(d.id, d.name, d.description));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["units"] }),
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => Promise.resolve(localDeleteUnit(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["units"] }),
  });
}

// Costing Record mutations — save to localStorage
export function useCreateCostingRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: {
      name: string;
      gradeId: bigint;
      layerId: bigint;
      gsmRangeId: bigint;
      width: number;
      length: number;
      quantity: bigint;
      items: CostingItem[];
    }) => {
      const record = saveCostingRecord({
        name: d.name,
        gradeId: d.gradeId,
        layerId: d.layerId,
        gsmRangeId: d.gsmRangeId,
        width: d.width,
        length: d.length,
        quantity: d.quantity,
        items: d.items.map((item) => ({
          rmId: item.rmId,
          quantity: item.quantity,
        })),
        totalCost: 0,
      });
      return record.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["costingRecords"] }),
  });
}

export function useDeleteCostingRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      localDeleteCostingRecord(id);
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["costingRecords"] }),
  });
}

// Production Entry mutations — save to localStorage
export function useCreateProductionEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: {
      costingRecordId: bigint;
      productionQtyMT: number;
    }) => {
      const record = loadCostingRecords().find(
        (r) => r.id === d.costingRecordId,
      );
      if (!record) throw new Error("Costing record not found");
      const entry = saveProductionEntry(
        d.costingRecordId,
        d.productionQtyMT,
        record.items,
      );
      return entry.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["productionEntries"] }),
  });
}

export function useDeleteProductionEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      localDeleteProductionEntry(id);
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["productionEntries"] }),
  });
}
