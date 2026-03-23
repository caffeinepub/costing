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
import { BarChart2, Download, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useListCostingRecords,
  useListGrades,
  useListGsmRanges,
  useListRMs,
} from "../hooks/useQueries";

const AP_LS_KEY = "actualProductionEntries";

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
    const raw = localStorage.getItem(AP_LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveActualEntries(entries: ActualProductionEntry[]) {
  localStorage.setItem(AP_LS_KEY, JSON.stringify(entries));
}

type EditableItem = {
  rmId: string;
  rmName: string;
  unit: string;
  plannedConsumption: number;
  actualConsumption: string;
};

export default function ActualProductionPage() {
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const [productionQty, setProductionQty] = useState<string>("");
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [entries, setEntries] =
    useState<ActualProductionEntry[]>(loadActualEntries);

  const { data: records = [], isLoading: loadingRecords } =
    useListCostingRecords();
  const { data: grades = [] } = useListGrades();
  const { data: gsmRanges = [] } = useListGsmRanges();
  const { data: rms = [] } = useListRMs();

  const rmMap = new Map(rms.map((r) => [r.id.toString(), r]));

  const getGradeName = (id: bigint) =>
    grades.find((g) => g.id === id)?.name ?? "";
  const getGsmRangeName = (id: bigint) =>
    gsmRanges.find((g) => g.id === id)?.name ?? "";

  const getRecordLabel = (costingRecordId: string) => {
    const rec = records.find((r) => r.id.toString() === costingRecordId);
    if (!rec) return `Record #${costingRecordId}`;
    return `${getGradeName(rec.gradeId)} ${getGsmRangeName(rec.gsmRangeId)}${
      rec.name ? ` - ${rec.name}` : ""
    }`;
  };

  const productionQtyNum = Number.parseFloat(productionQty);
  const isValidQty =
    !Number.isNaN(productionQtyNum) && productionQtyNum >= 0.001;

  const selectedRecord = records.find(
    (r) => r.id.toString() === selectedRecordId,
  );

  const handleRecordChange = (recordId: string) => {
    setSelectedRecordId(recordId);
    const rec = records.find((r) => r.id.toString() === recordId);
    if (!rec) {
      setEditableItems([]);
      return;
    }
    const qty = Number.parseFloat(productionQty);
    const validQty = !Number.isNaN(qty) && qty >= 0.001 ? qty : 0;
    const items: EditableItem[] = rec.items.map((item) => {
      const rm = rmMap.get(item.rmId.toString());
      const planned = item.quantity * validQty;
      return {
        rmId: item.rmId.toString(),
        rmName: rm?.name ?? "?",
        unit: rm?.unit ?? "kg",
        plannedConsumption: planned,
        actualConsumption: planned.toFixed(2),
      };
    });
    setEditableItems(items);
  };

  const handleQtyChange = (val: string) => {
    setProductionQty(val);
    const qty = Number.parseFloat(val);
    const validQty = !Number.isNaN(qty) && qty >= 0.001 ? qty : 0;
    if (selectedRecord) {
      setEditableItems((prev) =>
        prev.map((item) => {
          const recItem = selectedRecord.items.find(
            (ri) => ri.rmId.toString() === item.rmId,
          );
          const planned = recItem ? recItem.quantity * validQty : 0;
          return {
            ...item,
            plannedConsumption: planned,
            actualConsumption: planned.toFixed(2),
          };
        }),
      );
    }
  };

  const handleActualChange = (rmId: string, val: string) => {
    setEditableItems((prev) =>
      prev.map((item) =>
        item.rmId === rmId ? { ...item, actualConsumption: val } : item,
      ),
    );
  };

  const handleSave = () => {
    if (!selectedRecord || !isValidQty) return;
    const entry: ActualProductionEntry = {
      id: Date.now().toString(),
      costingRecordId: selectedRecordId,
      productionQtyMT: productionQtyNum,
      date: new Date().toISOString(),
      items: editableItems.map((item) => ({
        rmId: item.rmId,
        rmName: item.rmName,
        unit: item.unit,
        actualConsumption: Number.parseFloat(item.actualConsumption) || 0,
      })),
    };
    const updated = [...entries, entry];
    saveActualEntries(updated);
    setEntries(updated);
    setSelectedRecordId("");
    setProductionQty("");
    setEditableItems([]);
    toast.success("Actual production entry saved");
  };

  const handleDelete = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    saveActualEntries(updated);
    setEntries(updated);
    toast.success("Entry deleted");
  };

  const fmt2 = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  const handleDownloadExcel = () => {
    if (entries.length === 0) {
      toast.error("No entries to export");
      return;
    }
    const headers = [
      "Date",
      "Costing Record",
      "RM Name",
      "Unit",
      "Planned Consumption (kg)",
      "Actual Consumption (kg)",
      "Variance (kg)",
      "Variance (%)",
    ];
    const rows: string[][] = [];
    for (const entry of entries) {
      const recordLabel = getRecordLabel(entry.costingRecordId);
      const date = new Date(entry.date).toLocaleDateString();
      const rec = records.find(
        (r) => r.id.toString() === entry.costingRecordId,
      );
      for (const item of entry.items) {
        const recItem = rec?.items.find(
          (ri) => ri.rmId.toString() === item.rmId,
        );
        const planned = recItem ? recItem.quantity * entry.productionQtyMT : 0;
        const variance = item.actualConsumption - planned;
        const variancePct = planned > 0 ? (variance / planned) * 100 : 0;
        rows.push([
          date,
          recordLabel,
          item.rmName,
          item.unit,
          planned.toFixed(2),
          item.actualConsumption.toFixed(2),
          variance.toFixed(2),
          variancePct.toFixed(1),
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
    link.download = `actual-production-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Excel file downloaded");
  };

  const canSave =
    !!selectedRecord &&
    isValidQty &&
    editableItems.length > 0 &&
    editableItems.every((item) => item.actualConsumption !== "");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold text-foreground">
              Actual Production
            </h1>
            <p className="text-sm text-muted-foreground">
              Record actual production data and compare with planned production
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleDownloadExcel}
          disabled={entries.length === 0}
          className="flex items-center gap-2"
          data-ocid="actual_production.download_excel"
        >
          <Download className="w-4 h-4" />
          Download Excel
        </Button>
      </div>

      {/* Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            New Actual Production Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ap-costing-record">
                Costing Record <span className="text-destructive">*</span>
              </Label>
              {loadingRecords ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : (
                <Select
                  value={selectedRecordId}
                  onValueChange={handleRecordChange}
                >
                  <SelectTrigger
                    id="ap-costing-record"
                    data-ocid="actual_production.select"
                  >
                    <SelectValue placeholder="Select a costing record..." />
                  </SelectTrigger>
                  <SelectContent>
                    {records.map((r) => (
                      <SelectItem key={r.id.toString()} value={r.id.toString()}>
                        {getGradeName(r.gradeId)}{" "}
                        {getGsmRangeName(r.gsmRangeId)}
                        {r.name ? ` - ${r.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ap-production-qty">
                Actual Production Qty (MT){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ap-production-qty"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="e.g. 2"
                value={productionQty}
                onChange={(e) => handleQtyChange(e.target.value)}
                data-ocid="actual_production.input"
              />
              {productionQty && !isValidQty && (
                <p className="text-xs text-destructive">
                  Quantity must be at least 0.001 MT
                </p>
              )}
            </div>
          </div>

          {/* Items table */}
          {editableItems.length > 0 && isValidQty && (
            <div className="space-y-2">
              <Label>RM Consumption Details</Label>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>RM Name</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">
                        Planned Consumption (kg)
                      </TableHead>
                      <TableHead className="text-right">
                        Actual Consumption (kg)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editableItems.map((item, i) => (
                      <TableRow
                        key={item.rmId}
                        data-ocid={`actual_production.item.${i + 1}`}
                      >
                        <TableCell className="font-medium">
                          {item.rmName}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.unit}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {item.plannedConsumption.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right py-1">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.actualConsumption}
                            onChange={(e) =>
                              handleActualChange(item.rmId, e.target.value)
                            }
                            className="w-28 h-7 text-right text-sm ml-auto px-2"
                            data-ocid={`actual_production.input.${i + 1}`}
                          />
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
            disabled={!canSave}
            data-ocid="actual_production.submit_button"
          >
            Save Entry
          </Button>
        </CardContent>
      </Card>

      {/* Comparison Section */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Comparison: Production Records vs Actual Production
        </h2>
        {entries.length === 0 ? (
          <div
            className="rounded-lg border border-dashed p-10 text-center"
            data-ocid="actual_production.empty_state"
          >
            <BarChart2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No actual production entries yet
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table data-ocid="actual_production.table">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Costing Record</TableHead>
                  <TableHead>RM Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Planned (kg)</TableHead>
                  <TableHead className="text-right">Actual (kg)</TableHead>
                  <TableHead className="text-right">Variance (kg)</TableHead>
                  <TableHead className="text-right">Variance (%)</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, entryIdx) => {
                  const rec = records.find(
                    (r) => r.id.toString() === entry.costingRecordId,
                  );
                  return entry.items.map((item, itemIdx) => {
                    const recItem = rec?.items.find(
                      (ri) => ri.rmId.toString() === item.rmId,
                    );
                    const planned = recItem
                      ? recItem.quantity * entry.productionQtyMT
                      : 0;
                    const variance = item.actualConsumption - planned;
                    const variancePct =
                      planned > 0 ? (variance / planned) * 100 : 0;
                    const isFirst = itemIdx === 0;
                    const isLast = itemIdx === entry.items.length - 1;
                    const isOver = variance > 0;

                    return (
                      <TableRow
                        key={`${entry.id}-${item.rmId}`}
                        data-ocid={`actual_production.item.${entryIdx + 1}`}
                        className={
                          entryIdx % 2 === 0 ? "bg-background" : "bg-muted/20"
                        }
                      >
                        <TableCell className="text-sm text-muted-foreground">
                          {isFirst
                            ? new Date(entry.date).toLocaleDateString()
                            : ""}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {isFirst ? getRecordLabel(entry.costingRecordId) : ""}
                        </TableCell>
                        <TableCell className="text-sm">{item.rmName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.unit}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {fmt2(planned)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {fmt2(item.actualConsumption)}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm font-semibold ${
                            isOver ? "text-destructive" : "text-green-600"
                          }`}
                        >
                          {variance >= 0 ? "+" : ""}
                          {fmt2(variance)}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm ${
                            isOver ? "text-destructive" : "text-green-600"
                          }`}
                        >
                          {fmtPct(variancePct)}
                        </TableCell>
                        <TableCell>
                          {isLast && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(entry.id)}
                              data-ocid={`actual_production.delete_button.${entryIdx + 1}`}
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
    </div>
  );
}
