import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CostingItem } from "../backend.d";
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

export function useListCostingRecords() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["costingRecords"],
    queryFn: async () => (actor ? actor.listCostingRecords() : []),
    enabled: !!actor && !isFetching,
  });
}

export function useGetCostingRecord(id: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["costingRecord", id?.toString()],
    queryFn: async () =>
      actor && id != null ? actor.getCostingRecord(id) : null,
    enabled: !!actor && !isFetching && id != null,
  });
}

export function useListProductionEntries() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["productionEntries"],
    queryFn: async () => (actor ? actor.listProductionEntries() : []),
    enabled: !!actor && !isFetching,
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

export function useCreateCostingRecord() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: {
      name: string;
      gradeId: bigint;
      layerId: bigint;
      gsmRangeId: bigint;
      width: number;
      length: number;
      quantity: bigint;
      items: CostingItem[];
    }) =>
      actor!.createCostingRecord(
        d.name,
        d.gradeId,
        d.layerId,
        d.gsmRangeId,
        d.width,
        d.length,
        d.quantity,
        d.items,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["costingRecords"] }),
  });
}

export function useDeleteCostingRecord() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => actor!.deleteCostingRecord(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["costingRecords"] }),
  });
}

export function useCreateProductionEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { costingRecordId: bigint; productionQtyMT: number }) =>
      actor!.createProductionEntry(d.costingRecordId, d.productionQtyMT),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["productionEntries"] }),
  });
}

export function useDeleteProductionEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => actor!.deleteProductionEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["productionEntries"] }),
  });
}
