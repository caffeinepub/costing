import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart2,
  ClipboardList,
  Download,
  Loader2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCreateProductionEntry,
  useDeleteProductionEntry,
  useListCostingRecords,
  useListGrades,
  useListGsmRanges,
  useListProductionEntries,
  useListRMs,
} from "../hooks/useQueries";

const VC_LS_KEY = "valueCostingRateOverrides";
const VC_RECORD_UNIT_KEY = "valueCostingRecordUnitOverrides";

function loadVCRateOverrides(): Record<string, number> {
  try {
    const raw = localStorage.getItem(VC_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadVCRecordUnitOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(VC_RECORD_UNIT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

interface ActualProductionItem {
  rmId: string;
  rmName: string;
  unit: string;
  actualConsumption: number;
}

interface ActualProductionEntry {
  id: string;
  costingRecordId: string;
  productionQtyMT: number;
  date: string;
  items: ActualProductionItem[];
}

function loadActualEntries(): ActualProductionEntry[] {
  try {
    const raw = localStorage.getItem("actualProductionEntries");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function ProductionRecordsPage() {
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const [productionQty, setProductionQty] = useState<string>("");

  const { data: entries = [], isLoading } = useListProductionEntries();
  const { data: records = [] } = useListCostingRecords();
  const { data: grades = [] } = useListGrades();
  const { data: gsmRanges = [] } = useListGsmRanges();
  const { data: rms = [] } = useListRMs();
  const deleteEntry = useDeleteProductionEntry();
  const createEntry = useCreateProductionEntry();
  const [actualEntries] = useState<ActualProductionEntry[]>(loadActualEntries);

  const rmMap = new Map(rms.map((r) => [r.id.toString(), r]));
  const vcRecordUnits = loadVCRecordUnitOverrides();

  const getGradeName = (id: bigint) =>
    grades.find((g) => g.id === id)?.name ?? "";
  const getGsmRangeName = (id: bigint) =>
    gsmRanges.find((g) => g.id === id)?.name ?? "";
  const getRMName = (id: bigint) => rmMap.get(id.toString())?.name ?? "?";
  const getRMUnit = (id: bigint) => rmMap.get(id.toString())?.unit ?? "kg";
  const getRMDefaultRate = (id: bigint) =>
    rmMap.get(id.toString())?.unitCost ?? 0;

  const getVCRecordUnit = (costingRecordId: bigint | string): string =>
    vcRecordUnits[costingRecordId.toString()] ?? "";

  const getRate = (costingRecordId: bigint, rmId: bigint): number => {
    const overrides = loadVCRateOverrides();
    const key = `${costingRecordId}-${rmId}`;
    return key in overrides ? overrides[key] : getRMDefaultRate(rmId);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const getRecordLabel = (costingRecordId: bigint) => {
    const rec = records.find((r) => r.id === costingRecordId);
    if (!rec) return `Record #${costingRecordId}`;
    return `${getGradeName(rec.gradeId)} ${getGsmRangeName(rec.gsmRangeId)}${
      rec.name ? ` - ${rec.name}` : ""
    }`;
  };

  const handleDelete = async (id: bigint) => {
    try {
      await deleteEntry.mutateAsync(id);
      toast.success("Production entry deleted");
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  const formatDate = (ts: bigint | number) => {
    const ms =
      typeof ts === "bigint"
        ? Number(ts / 1_000_000n)
        : Math.round(ts / 1_000_000);
    return new Date(ms).toLocaleDateString();
  };

  const selectedRecord = records.find(
    (r) => r.id.toString() === selectedRecordId,
  );
  const productionQtyNum = Number.parseFloat(productionQty);
  const isValidQty =
    !Number.isNaN(productionQtyNum) && productionQtyNum >= 0.001;

  const calculatedRows =
    selectedRecord && isValidQty
      ? selectedRecord.items.map((item) => {
          const calcQty = item.quantity * productionQtyNum;
          const rate = getRate(selectedRecord.id, item.rmId);
          const value = calcQty * rate;
          return {
            rmId: item.rmId,
            rmName: getRMName(item.rmId),
            rmUnit: getRMUnit(item.rmId),
            baseQty: item.quantity,
            calculatedQty: calcQty,
            rate,
            value,
          };
        })
      : [];

  const handleSave = async () => {
    if (!selectedRecord || !isValidQty) return;
    try {
      await createEntry.mutateAsync({
        costingRecordId: selectedRecord.id,
        productionQtyMT: productionQtyNum,
      });
      toast.success("Production entry saved successfully");
      setSelectedRecordId("");
      setProductionQty("");
    } catch {
      toast.error("Failed to save production entry");
    }
  };

  const handleDownloadExcel = () => {
    if (entries.length === 0) {
      toast.error("No production records to export");
      return;
    }

    const headers = [
      "Date",
      "Costing Record",
      "Unit",
      "Production Qty (MT)",
      "RM Name",
      "Calculated Consumption (kg)",
      "Rate (₹/kg)",
      "Value (₹)",
      "Per Ton (₹/MT)",
    ];

    const rows: string[][] = [];
    for (const entry of entries) {
      const recordLabel = getRecordLabel(entry.costingRecordId);
      const vcUnit = getVCRecordUnit(entry.costingRecordId);
      const date = formatDate(entry.createdAt);
      const qty = entry.productionQtyMT.toFixed(3);

      if (entry.calculatedItems.length === 0) {
        rows.push([date, recordLabel, vcUnit, qty, "", "", "", "", ""]);
      } else {
        for (const ci of entry.calculatedItems) {
          const rate = getRate(entry.costingRecordId, ci.rmId);
          const value = ci.calculatedQty * rate;
          const perTon =
            entry.productionQtyMT > 0 ? value / entry.productionQtyMT : 0;
          rows.push([
            date,
            recordLabel,
            vcUnit,
            qty,
            getRMName(ci.rmId),
            ci.calculatedQty.toFixed(2),
            rate.toFixed(2),
            value.toFixed(2),
            perTon.toFixed(2),
          ]);
        }
      }
    }

    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map((r) => r.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `production-records-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Excel file downloaded");
  };

  // Build date-wise aggregated summary from actualEntries
  const buildActualSummary = () => {
    // Group entries by date
    const dateGroups: Record<string, ActualProductionEntry[]> = {};
    for (const entry of actualEntries) {
      const dateKey = new Date(entry.date).toLocaleDateString();
      if (!dateGroups[dateKey]) dateGroups[dateKey] = [];
      dateGroups[dateKey].push(entry);
    }

    // Sort dates descending
    const sortedDates = Object.keys(dateGroups).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );

    return sortedDates.map((dateKey) => {
      const entriesForDate = dateGroups[dateKey];

      // Aggregate by RM name within this date
      const rmAgg: Record<
        string,
        {
          rmName: string;
          unit: string;
          totalPlanned: number;
          totalActual: number;
        }
      > = {};

      let totalProductionQtyMT = 0;

      for (const entry of entriesForDate) {
        totalProductionQtyMT += entry.productionQtyMT;
        const rec = records.find(
          (r) => r.id.toString() === entry.costingRecordId,
        );

        for (const item of entry.items) {
          if (!rmAgg[item.rmName]) {
            rmAgg[item.rmName] = {
              rmName: item.rmName,
              unit: item.unit,
              totalPlanned: 0,
              totalActual: 0,
            };
          }

          // Calculate planned from costing record
          let planned = 0;
          if (rec) {
            const rmItem = rec.items.find(
              (ri: any) => ri.rmId.toString() === item.rmId,
            );
            if (rmItem) {
              planned = rmItem.quantity * entry.productionQtyMT;
            }
          }

          rmAgg[item.rmName].totalPlanned += planned;
          rmAgg[item.rmName].totalActual += item.actualConsumption;
        }
      }

      const rmRows = Object.values(rmAgg);
      const grandTotalPlanned = rmRows.reduce((s, r) => s + r.totalPlanned, 0);
      const grandTotalActual = rmRows.reduce((s, r) => s + r.totalActual, 0);
      const grandVariance = grandTotalActual - grandTotalPlanned;

      return {
        dateKey,
        totalProductionQtyMT,
        rmRows,
        grandTotalPlanned,
        grandTotalActual,
        grandVariance,
      };
    });
  };

  const actualSummary = buildActualSummary();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold text-foreground">
              Production Records
            </h1>
            <p className="text-sm text-muted-foreground">
              Record production quantities and view RM consumption history
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleDownloadExcel}
          disabled={entries.length === 0}
          className="flex items-center gap-2"
          data-ocid="production_records.download_excel"
        >
          <Download className="w-4 h-4" />
          Download Excel
        </Button>
      </div>

      {/* Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Production Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="costing-record">
                Costing Record <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedRecordId}
                onValueChange={setSelectedRecordId}
              >
                <SelectTrigger
                  id="costing-record"
                  data-ocid="production.select"
                >
                  <SelectValue placeholder="Select a costing record..." />
                </SelectTrigger>
                <SelectContent>
                  {records.map((r) => (
                    <SelectItem key={r.id.toString()} value={r.id.toString()}>
                      {getGradeName(r.gradeId)} {getGsmRangeName(r.gsmRangeId)}
                      {r.name ? ` - ${r.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="production-qty">
                Actual Production Qty (MT){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="production-qty"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="e.g. 2"
                value={productionQty}
                onChange={(e) => setProductionQty(e.target.value)}
                data-ocid="production.input"
              />
              {productionQty && !isValidQty && (
                <p className="text-xs text-destructive">
                  Quantity must be at least 0.001 MT
                </p>
              )}
            </div>
          </div>

          {/* Calculated Consumption Table */}
          {selectedRecord && isValidQty && calculatedRows.length > 0 && (
            <div className="space-y-2">
              <Label>Calculated RM Consumption</Label>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>RM Name</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">
                        Base Qty (kg)
                      </TableHead>
                      <TableHead className="text-right">
                        Actual Production (MT)
                      </TableHead>
                      <TableHead className="text-right">
                        Calculated Consumption (kg)
                      </TableHead>
                      <TableHead className="text-right">Rate (₹/kg)</TableHead>
                      <TableHead className="text-right">Value (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculatedRows.map((row, i) => (
                      <TableRow
                        key={row.rmId.toString()}
                        data-ocid={`production.item.${i + 1}`}
                      >
                        <TableCell className="font-medium">
                          {row.rmName}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.rmUnit}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.baseQty.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {productionQtyNum.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {row.calculatedQty.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{fmt(row.rate)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          ₹{fmt(row.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={!selectedRecord || !isValidQty || createEntry.isPending}
            data-ocid="production.submit_button"
          >
            {createEntry.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Production Entry"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Records Table */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          History
        </h2>
        {isLoading ? (
          <div
            className="flex items-center justify-center py-10 text-muted-foreground"
            data-ocid="production_records.loading_state"
          >
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading production records...
          </div>
        ) : entries.length === 0 ? (
          <div
            className="rounded-lg border border-dashed p-10 text-center"
            data-ocid="production_records.empty_state"
          >
            <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No production entries yet
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table data-ocid="production_records.table">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Costing Record</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">
                    Production Qty (MT)
                  </TableHead>
                  <TableHead>RM Name</TableHead>
                  <TableHead className="text-right">
                    Calculated Consumption (kg)
                  </TableHead>
                  <TableHead className="text-right">Rate (₹/kg)</TableHead>
                  <TableHead className="text-right">Value (₹)</TableHead>
                  <TableHead className="text-right">Per Ton (₹/MT)</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, i) => {
                  const items = entry.calculatedItems;
                  const vcUnit = getVCRecordUnit(entry.costingRecordId);
                  if (items.length === 0) {
                    return (
                      <TableRow
                        key={entry.id.toString()}
                        data-ocid={`production_records.item.${i + 1}`}
                      >
                        <TableCell className="font-medium">
                          {getRecordLabel(BigInt(entry.costingRecordId))}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {vcUnit}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {entry.productionQtyMT.toFixed(3)}
                        </TableCell>
                        <TableCell
                          colSpan={5}
                          className="text-xs text-muted-foreground"
                        >
                          —
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(entry.createdAt)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  }
                  return items.map((ci, j) => {
                    const rate = getRate(entry.costingRecordId, ci.rmId);
                    const value = ci.calculatedQty * rate;
                    const perTon =
                      entry.productionQtyMT > 0
                        ? value / entry.productionQtyMT
                        : 0;
                    const isFirst = j === 0;
                    const isLast = j === items.length - 1;
                    return (
                      <TableRow
                        key={`${entry.id}-${ci.rmId}`}
                        data-ocid={`production_records.item.${i + 1}`}
                        className={
                          i % 2 === 0 ? "bg-background" : "bg-muted/20"
                        }
                      >
                        <TableCell className="font-medium">
                          {isFirst ? getRecordLabel(entry.costingRecordId) : ""}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {isFirst ? vcUnit : ""}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {isFirst ? entry.productionQtyMT.toFixed(3) : ""}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getRMName(ci.rmId)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {ci.calculatedQty.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          ₹{fmt(rate)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-primary">
                          ₹{fmt(value)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-amber-600">
                          ₹{fmt(perTon)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {isFirst ? formatDate(entry.createdAt) : ""}
                        </TableCell>
                        <TableCell>
                          {isLast && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(entry.id)}
                              disabled={deleteEntry.isPending}
                              data-ocid={`production_records.delete_button.${i + 1}`}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Actual Production Summary (Date-wise aggregated) */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <BarChart2 className="w-4 h-4" />
          Actual Production Summary (Date-wise)
        </h2>
        {actualEntries.length === 0 ? (
          <div
            className="rounded-lg border border-dashed p-10 text-center"
            data-ocid="actual_production_summary.empty_state"
          >
            <BarChart2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No actual production data yet. Add entries in the Actual
              Production module.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {actualSummary.map((group) => (
              <div
                key={group.dateKey}
                className="rounded-lg border overflow-hidden"
              >
                {/* Date header */}
                <div className="bg-muted/70 px-4 py-2 flex items-center justify-between border-b">
                  <span className="text-sm font-semibold">{group.dateKey}</span>
                  <span className="text-xs text-muted-foreground">
                    Total Production:{" "}
                    <span className="font-semibold text-foreground">
                      {group.totalProductionQtyMT.toFixed(3)} MT
                    </span>
                  </span>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>RM Name</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">
                        Total Planned Qty (kg)
                      </TableHead>
                      <TableHead className="text-right">
                        Total Actual Qty (kg)
                      </TableHead>
                      <TableHead className="text-right">
                        Variance (kg)
                      </TableHead>
                      <TableHead className="text-right">Variance (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.rmRows.map((row, ri) => {
                      const variance = row.totalActual - row.totalPlanned;
                      const variancePct =
                        row.totalPlanned > 0
                          ? (variance / row.totalPlanned) * 100
                          : 0;
                      const overPlan = variance > 0;
                      return (
                        <TableRow
                          key={row.rmName}
                          data-ocid={`actual_production_summary.item.${ri + 1}`}
                        >
                          <TableCell className="font-medium">
                            {row.rmName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.totalPlanned.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.totalActual.toFixed(2)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              overPlan ? "text-destructive" : "text-green-600"
                            }`}
                          >
                            {variance > 0 ? "+" : ""}
                            {variance.toFixed(2)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              overPlan ? "text-destructive" : "text-green-600"
                            }`}
                          >
                            {variance > 0 ? "+" : ""}
                            {variancePct.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Date group footer totals */}
                    <TableRow className="bg-muted/50 font-semibold border-t-2">
                      <TableCell colSpan={2} className="text-sm">
                        Grand Total
                      </TableCell>
                      <TableCell className="text-right">
                        {group.grandTotalPlanned.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {group.grandTotalActual.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          group.grandVariance > 0
                            ? "text-destructive"
                            : "text-green-600"
                        }`}
                      >
                        {group.grandVariance > 0 ? "+" : ""}
                        {group.grandVariance.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          group.grandVariance > 0
                            ? "text-destructive"
                            : "text-green-600"
                        }`}
                      >
                        {group.grandTotalPlanned > 0
                          ? `${
                              group.grandVariance > 0 ? "+" : ""
                            }${((group.grandVariance / group.grandTotalPlanned) * 100).toFixed(1)}%`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
