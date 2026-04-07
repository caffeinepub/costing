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
  Check,
  ClipboardList,
  Download,
  Loader2,
  Pencil,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCreateProductionEntry,
  useListCostingRecords,
  useListGrades,
  useListGsmRanges,
  useListProductionEntries,
  useListRMs,
  useUpdateProductionEntryDate,
} from "../hooks/useQueries";

const VC_LS_KEY = "valueCostingRateOverrides";
const VC_UNIT_LS_KEY = "valueCostingRecordUnitOverrides";

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
    const raw = localStorage.getItem(VC_UNIT_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getVCUnit(costingRecordId: bigint): string {
  const overrides = loadVCRecordUnitOverrides();
  return overrides[costingRecordId.toString()] ?? "";
}

// Get the display date from entry: prefer entryDate string, fallback to createdAt
function getEntryDateStr(entry: {
  createdAt: bigint;
  entryDate?: string;
}): string {
  if (entry.entryDate) return entry.entryDate;
  // fallback: derive from createdAt (nanoseconds -> ms)
  const ms = Number(entry.createdAt) / 1_000_000;
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(isoDate: string): string {
  const [yyyy, mm, dd] = isoDate.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

export default function ProductionRecordsPage() {
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const [productionQty, setProductionQty] = useState<string>("");
  const [entryDate, setEntryDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );

  // Inline date editing state: entryId -> editing date string
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState<string>("");

  const { data: records = [] } = useListCostingRecords();
  const { data: grades = [] } = useListGrades();
  const { data: gsmRanges = [] } = useListGsmRanges();
  const { data: rms = [] } = useListRMs();
  const { data: productionEntries = [] } = useListProductionEntries();
  const createEntry = useCreateProductionEntry();
  const updateDateMutation = useUpdateProductionEntryDate();

  const rmMap = new Map(rms.map((r) => [r.id.toString(), r]));

  const getGradeName = (id: bigint) =>
    grades.find((g) => g.id === id)?.name ?? "";
  const getGsmRangeName = (id: bigint) =>
    gsmRanges.find((g) => g.id === id)?.name ?? "";
  const getRMName = (id: bigint) => rmMap.get(id.toString())?.name ?? "?";
  const getRMUnit = (id: bigint) => rmMap.get(id.toString())?.unit ?? "kg";
  const getRMDefaultRate = (id: bigint) =>
    rmMap.get(id.toString())?.unitCost ?? 0;

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
        date: entryDate ? new Date(`${entryDate}T00:00:00`) : undefined,
      });
      toast.success("Production entry saved successfully");
      setSelectedRecordId("");
      setProductionQty("");
      setEntryDate(new Date().toISOString().slice(0, 10));
    } catch {
      toast.error("Failed to save production entry");
    }
  };

  const handleStartEditDate = (entryId: bigint, currentDate: string) => {
    setEditingDateId(entryId.toString());
    setEditingDateValue(currentDate);
  };

  const handleSaveDate = async (entryId: bigint) => {
    if (!editingDateValue) return;
    try {
      await updateDateMutation.mutateAsync({
        id: entryId,
        date: editingDateValue,
      });
      toast.success("Date updated");
    } catch {
      toast.error("Failed to update date");
    }
    setEditingDateId(null);
    setEditingDateValue("");
  };

  const handleCancelEditDate = () => {
    setEditingDateId(null);
    setEditingDateValue("");
  };

  const handleDownloadExcel = () => {
    if (productionEntries.length === 0) {
      toast.error("No production records to export");
      return;
    }

    const headers = [
      "Date",
      "Costing Record",
      "RM Name",
      "Production QTY (MT)",
      "Site/Unit",
      "Base Qty (kg)",
      "Calculated Consumption (kg)",
      "Rate (₹/kg)",
      "Value (₹)",
      "Per Ton (₹/MT)",
    ];

    const rows: string[][] = [];
    for (const entry of productionEntries) {
      const rec = records.find((r) => r.id === entry.costingRecordId);
      const gradeName = rec ? getGradeName(rec.gradeId) : "";
      const gsmName = rec ? getGsmRangeName(rec.gsmRangeId) : "";
      const recordLabel = rec
        ? `${gradeName} ${gsmName}${rec.name ? ` - ${rec.name}` : ""}`
        : `Record #${entry.costingRecordId}`;
      const dateStr = formatDisplayDate(getEntryDateStr(entry));
      const vcUnit = getVCUnit(entry.costingRecordId);

      for (const item of entry.calculatedItems) {
        const rate = getRate(entry.costingRecordId, item.rmId);
        const value = item.calculatedQty * rate;
        const perTon =
          entry.productionQtyMT > 0 ? value / entry.productionQtyMT : 0;
        rows.push([
          dateStr,
          recordLabel,
          getRMName(item.rmId),
          entry.productionQtyMT.toFixed(3),
          vcUnit,
          item.baseQty.toFixed(2),
          item.calculatedQty.toFixed(2),
          rate.toFixed(2),
          value.toFixed(2),
          perTon.toFixed(2),
        ]);
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
          disabled={productionEntries.length === 0}
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
              <Label htmlFor="entry-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="entry-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                data-ocid="production.date_input"
              />
            </div>

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

      {/* Production Entry History */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          Production Entry History
        </h2>
        {productionEntries.length === 0 ? (
          <div
            className="rounded-lg border border-dashed p-10 text-center"
            data-ocid="production_records.empty_state"
          >
            <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No production entries yet. Save your first entry above.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table data-ocid="production_records.table">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Costing Record</TableHead>
                  <TableHead>RM Name</TableHead>
                  <TableHead className="text-right">
                    Production QTY (MT)
                  </TableHead>
                  <TableHead>Site/Unit</TableHead>
                  <TableHead className="text-right">Base Qty (kg)</TableHead>
                  <TableHead className="text-right">
                    Calc. Consumption (kg)
                  </TableHead>
                  <TableHead className="text-right">Rate (₹/kg)</TableHead>
                  <TableHead className="text-right">Value (₹)</TableHead>
                  <TableHead className="text-right">Per Ton (₹/MT)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionEntries.map((entry, entryIdx) => {
                  const rec = records.find(
                    (r) => r.id === entry.costingRecordId,
                  );
                  const gradeName = rec ? getGradeName(rec.gradeId) : "";
                  const gsmName = rec ? getGsmRangeName(rec.gsmRangeId) : "";
                  const recordLabel = rec
                    ? `${gradeName} ${gsmName}${rec.name ? ` - ${rec.name}` : ""}`
                    : `Record #${entry.costingRecordId}`;
                  const isoDate = getEntryDateStr(entry);
                  const displayDate = formatDisplayDate(isoDate);
                  const vcUnit = getVCUnit(entry.costingRecordId);
                  const isEditingDate = editingDateId === entry.id.toString();

                  return entry.calculatedItems.map((item, itemIdx) => {
                    const rate = getRate(entry.costingRecordId, item.rmId);
                    const value = item.calculatedQty * rate;
                    const perTon =
                      entry.productionQtyMT > 0
                        ? value / entry.productionQtyMT
                        : 0;
                    const isFirst = itemIdx === 0;

                    return (
                      <TableRow
                        key={`${entry.id}-${item.rmId}`}
                        data-ocid={`production_records.item.${entryIdx + 1}`}
                        className={
                          entryIdx % 2 === 0 ? "bg-background" : "bg-muted/20"
                        }
                      >
                        <TableCell className="text-sm text-muted-foreground min-w-[140px]">
                          {isFirst ? (
                            isEditingDate ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="date"
                                  value={editingDateValue}
                                  onChange={(e) =>
                                    setEditingDateValue(e.target.value)
                                  }
                                  className="h-7 text-xs w-36 px-1"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveDate(entry.id)}
                                  className="text-green-600 hover:text-green-700"
                                  title="Save date"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditDate}
                                  className="text-destructive hover:text-destructive/80"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 group">
                                <span>{displayDate}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStartEditDate(entry.id, isoDate)
                                  }
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                                  title="Edit date"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            )
                          ) : (
                            ""
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {isFirst ? recordLabel : ""}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getRMName(item.rmId)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-primary">
                          {isFirst ? entry.productionQtyMT.toFixed(3) : ""}
                        </TableCell>
                        <TableCell className="text-sm">
                          {isFirst ? (
                            vcUnit ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {vcUnit}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )
                          ) : (
                            ""
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {item.baseQty.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-primary">
                          {item.calculatedQty.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          ₹{fmt(rate)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          ₹{fmt(value)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          ₹{fmt(perTon)}
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
    </div>
  );
}
