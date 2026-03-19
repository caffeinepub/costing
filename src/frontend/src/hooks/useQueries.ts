import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CostingItem } from "../backend.d";
import {
  loadCostingRecords,
  loadProductionEntries,
  deleteCostingRecord as localDeleteCostingRecord,
  deleteProductionEntry as localDeleteProductionEntry,
  saveCostingRecord,
  saveProductionEntry,
} from "../lib/localStore";
import { useActor } from "./useActor";

export function useListGsmRanges() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["gsmRanges"],
    queryFn: async () => (actor ? actor.listGsmRanges() : []),
    enabled: !!actor && !isFetching,
  });
}

export function useListGrades() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["grades"],
    queryFn: async () => (actor ? actor.listGrades() : []),
    enabled: !!actor && !isFetching,
  });
}

export function useListLayers() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["layers"],
    queryFn: async () => (actor ? actor.listLayers() : []),
    enabled: !!actor && !isFetching,
  });
}

export function useListRMs() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["rms"],
    queryFn: async () => (actor ? actor.listRMs() : []),
    enabled: !!actor && !isFetching,
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

// Mutations
export function useCreateGsmRange() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { name: string; minGsm: number; maxGsm: number }) =>
      actor!.createGsmRange(d.name, d.minGsm, d.maxGsm),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gsmRanges"] }),
  });
}

export function useUpdateGsmRange() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: {
      id: bigint;
      name: string;
      minGsm: number;
      maxGsm: number;
    }) => actor!.updateGsmRange(d.id, d.name, d.minGsm, d.maxGsm),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gsmRanges"] }),
  });
}

export function useDeleteGsmRange() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => actor!.deleteGsmRange(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gsmRanges"] }),
  });
}

export function useCreateGrade() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { name: string; description: string }) =>
      actor!.createGrade(d.name, d.description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grades"] }),
  });
}

export function useUpdateGrade() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { id: bigint; name: string; description: string }) =>
      actor!.updateGrade(d.id, d.name, d.description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grades"] }),
  });
}

export function useDeleteGrade() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => actor!.deleteGrade(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grades"] }),
  });
}

export function useCreateLayer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { name: string; description: string }) =>
      actor!.createLayer(d.name, d.description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["layers"] }),
  });
}

export function useUpdateLayer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { id: bigint; name: string; description: string }) =>
      actor!.updateLayer(d.id, d.name, d.description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["layers"] }),
  });
}

export function useDeleteLayer() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => actor!.deleteLayer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["layers"] }),
  });
}

export function useCreateRM() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { name: string; unitCost: number; unit: string }) =>
      actor!.createRM(d.name, d.unitCost, d.unit),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rms"] }),
  });
}

export function useUpdateRM() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: {
      id: bigint;
      name: string;
      unitCost: number;
      unit: string;
    }) => actor!.updateRM(d.id, d.name, d.unitCost, d.unit),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rms"] }),
  });
}

export function useDeleteRM() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => actor!.deleteRM(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rms"] }),
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
