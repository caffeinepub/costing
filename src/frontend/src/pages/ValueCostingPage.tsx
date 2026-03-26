import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useListCostingRecords,
  useListGrades,
  useListGsmRanges,
  useListLayers,
  useListRMs,
  useListUnits,
} from "../hooks/useQueries";

const SKELETON_ROWS = ["s1", "s2", "s3", "s4", "s5", "s6"];
const SKELETON_CELLS = [
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
  "c8",
  "c9",
  "c10",
];
const LS_KEY = "valueCostingRateOverrides";
const LS_RECORD_UNIT_KEY = "valueCostingRecordUnitOverrides";

type FlatRow = {
  recordId: bigint;
  recordName: string;
  grade: string;
  gsmRange: string;
  layer: string;
  rmName: string;
  rmId: string;
  baseQty: number;
  defaultRate: number;
  createdAt: bigint;
};

function loadOverrides(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadRecordUnitOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_RECORD_UNIT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function ValueCostingPage() {
  const { data: records, isLoading: loadingRecords } = useListCostingRecords();
  const { data: grades, isLoading: loadingGrades } = useListGrades();
  const { data: gsmRanges, isLoading: loadingGsm } = useListGsmRanges();
  const { data: layers, isLoading: loadingLayers } = useListLayers();
  const { data: rms, isLoading: loadingRMs } = useListRMs();
  const { data: units = [] } = useListUnits();

  const [rateOverrides, setRateOverrides] =
    useState<Record<string, number>>(loadOverrides);
  const [recordUnitOverrides, setRecordUnitOverrides] = useState<
    Record<string, string>
  >(loadRecordUnitOverrides);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(rateOverrides));
  }, [rateOverrides]);

  useEffect(() => {
    localStorage.setItem(
      LS_RECORD_UNIT_KEY,
      JSON.stringify(recordUnitOverrides),
    );
  }, [recordUnitOverrides]);

  const isLoading =
    loadingRecords ||
    loadingGrades ||
    loadingGsm ||
    loadingLayers ||
    loadingRMs;

  const gradeMap = new Map((grades ?? []).map((g) => [g.id, g.name]));
  const gsmMap = new Map((gsmRanges ?? []).map((g) => [g.id, g.name]));
  const layerMap = new Map((layers ?? []).map((l) => [l.id, l.name]));
  const rmMap = new Map((rms ?? []).map((r) => [r.id, r]));

  const rows: FlatRow[] = [];
  for (const rec of records ?? []) {
    for (const item of rec.items) {
      const rm = rmMap.get(item.rmId);
      rows.push({
        recordId: rec.id,
        recordName: rec.name,
        grade: gradeMap.get(rec.gradeId) ?? "-",
        gsmRange: gsmMap.get(rec.gsmRangeId) ?? "-",
        layer: layerMap.get(rec.layerId) ?? "-",
        rmName: rm?.name ?? "-",
        rmId: item.rmId.toString(),
        baseQty: item.quantity,
        defaultRate: rm?.unitCost ?? 0,
        createdAt: rec.createdAt,
      });
    }
  }

  function getOverrideKey(row: FlatRow) {
    return `${row.recordId}-${row.rmId}`;
  }

  function getRate(row: FlatRow): number {
    const key = getOverrideKey(row);
    return key in rateOverrides ? rateOverrides[key] : row.defaultRate;
  }

  function getValue(row: FlatRow): number {
    return row.baseQty * getRate(row);
  }

  function handleRateChange(row: FlatRow, value: string) {
    const key = getOverrideKey(row);
    const parsed = Number.parseFloat(value);
    setRateOverrides((prev) => ({
      ...prev,
      [key]: Number.isNaN(parsed) ? 0 : parsed,
    }));
  }

  function getRecordUnit(recordId: bigint): string {
    return recordUnitOverrides[recordId.toString()] ?? "";
  }

  function handleRecordUnitChange(recordId: bigint, value: string) {
    setRecordUnitOverrides((prev) => ({
      ...prev,
      [recordId.toString()]: value,
    }));
  }

  // Group by recordId for subtotals
  const recordGroups: Map<string, FlatRow[]> = new Map();
  for (const row of rows) {
    const key = row.recordId.toString();
    if (!recordGroups.has(key)) recordGroups.set(key, []);
    recordGroups.get(key)!.push(row);
  }

  const grandTotal = rows.reduce((sum, r) => sum + getValue(r), 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const fmtDate = (ts: bigint | number): string =>
    (typeof ts === "bigint"
      ? new Date(Number(ts / 1_000_000n))
      : new Date(Math.round(Number(ts) / 1_000_000))
    ).toLocaleDateString("en-IN");

  function handleDownload() {
    const header = [
      "Record Name",
      "Grade",
      "GSM Range",
      "Layer",
      "Unit",
      "RM Material",
      "Base Qty (kg)",
      "Rate (₹/kg)",
      "Value (₹)",
      "Created",
    ].join(",");
    const csvRows = rows.map((r) =>
      [
        `"${r.recordName}"`,
        `"${r.grade}"`,
        `"${r.gsmRange}"`,
        `"${r.layer}"`,
        `"${getRecordUnit(r.recordId)}"`,
        `"${r.rmName}"`,
        r.baseQty.toFixed(2),
        getRate(r).toFixed(2),
        getValue(r).toFixed(2),
        fmtDate(r.createdAt),
      ].join(","),
    );
    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "value-costing-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const TABLE_HEADERS = [
    "Record Name",
    "Grade",
    "GSM Range",
    "Layer",
    "Unit",
    "RM Material",
    "Base Qty (kg)",
    "Rate (₹/kg)",
    "Value (₹)",
    "Created",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="px-8 py-5 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold text-foreground">
                Value Costing
              </h1>
              <p className="text-sm text-muted-foreground">
                Costing Record History Report — Rate &amp; Value Analysis
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isLoading || rows.length === 0}
            data-ocid="value_costing.download_button"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Excel
          </Button>
        </div>
      </header>

      {/* Table */}
      <main className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div
            className="rounded-lg border border-border overflow-hidden"
            data-ocid="value_costing.loading_state"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {TABLE_HEADERS.map((h) => (
                    <TableHead key={h} className="text-xs font-semibold">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {SKELETON_ROWS.map((rowKey) => (
                  <TableRow key={rowKey}>
                    {SKELETON_CELLS.map((cellKey) => (
                      <TableCell key={cellKey}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : rows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-64 text-center"
            data-ocid="value_costing.empty_state"
          >
            <TrendingUp className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">
              No costing records found
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Add records in the Costing Calculator to see them here.
            </p>
          </div>
        ) : (
          <div
            className="rounded-lg border border-border overflow-hidden"
            data-ocid="value_costing.table"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">
                    Record Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Grade</TableHead>
                  <TableHead className="text-xs font-semibold">
                    GSM Range
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Layer</TableHead>
                  <TableHead className="text-xs font-semibold">Unit</TableHead>
                  <TableHead className="text-xs font-semibold">
                    RM Material
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Base Qty (kg)
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Rate (₹/kg)
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Value (₹)
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Created
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(recordGroups.entries()).map(
                  ([key, groupRows], groupIdx) => {
                    const subtotal = groupRows.reduce(
                      (s, r) => s + getValue(r),
                      0,
                    );
                    const isEven = groupIdx % 2 === 0;
                    const recordId = groupRows[0].recordId;
                    return (
                      <>
                        {groupRows.map((row, rowIdx) => (
                          <TableRow
                            key={`${key}-${row.rmId}`}
                            data-ocid={`value_costing.item.${groupIdx + 1}`}
                            className={isEven ? "bg-background" : "bg-muted/20"}
                          >
                            <TableCell className="font-medium text-sm">
                              {rowIdx === 0 ? row.recordName : ""}
                            </TableCell>
                            <TableCell className="text-sm">
                              {rowIdx === 0 ? row.grade : ""}
                            </TableCell>
                            <TableCell className="text-sm">
                              {rowIdx === 0 ? row.gsmRange : ""}
                            </TableCell>
                            <TableCell className="text-sm">
                              {rowIdx === 0 ? row.layer : ""}
                            </TableCell>
                            <TableCell className="py-1">
                              {rowIdx === 0 ? (
                                <select
                                  value={getRecordUnit(recordId)}
                                  onChange={(e) =>
                                    handleRecordUnitChange(
                                      recordId,
                                      e.target.value,
                                    )
                                  }
                                  className="h-7 text-sm border border-input rounded px-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-20"
                                  data-ocid={`value_costing.unit.${groupIdx + 1}`}
                                >
                                  <option value="">— Select —</option>
                                  {units.map((u) => (
                                    <option key={String(u.id)} value={u.name}>
                                      {u.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                ""
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.rmName}
                            </TableCell>
                            <TableCell className="text-sm text-right tabular-nums">
                              {fmt(row.baseQty)}
                            </TableCell>
                            <TableCell className="text-right py-1">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={getRate(row)}
                                onChange={(e) =>
                                  handleRateChange(row, e.target.value)
                                }
                                className="w-24 h-7 text-right text-sm tabular-nums ml-auto px-2"
                                data-ocid={`value_costing.input.${groupIdx + 1}`}
                              />
                            </TableCell>
                            <TableCell className="text-sm text-right tabular-nums font-medium">
                              ₹{fmt(getValue(row))}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {rowIdx === 0 ? fmtDate(row.createdAt) : ""}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Subtotal row */}
                        <TableRow
                          key={`${key}-subtotal`}
                          className="bg-primary/5 border-t border-primary/10"
                          data-ocid={`value_costing.row.${groupIdx + 1}`}
                        >
                          <TableCell
                            colSpan={8}
                            className="text-xs font-semibold text-primary/80 py-2 text-right"
                          >
                            Subtotal — {groupRows[0].recordName}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-bold text-sm text-primary">
                            ₹{fmt(subtotal)}
                          </TableCell>
                          <TableCell colSpan={1} />
                        </TableRow>
                      </>
                    );
                  },
                )}
                {/* Grand total */}
                <TableRow className="bg-primary/10 border-t-2 border-primary/20">
                  <TableCell
                    colSpan={8}
                    className="font-bold text-sm text-right py-3"
                  >
                    Grand Total
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-base text-primary">
                    ₹{fmt(grandTotal)}
                  </TableCell>
                  <TableCell colSpan={1} />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
