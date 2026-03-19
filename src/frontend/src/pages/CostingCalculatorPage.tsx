import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useNavigate } from "@tanstack/react-router";
import { Loader2, PackagePlus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCreateCostingRecord,
  useListGrades,
  useListGsmRanges,
  useListLayers,
  useListRMs,
} from "../hooks/useQueries";

interface CostingRow {
  uid: string;
  gradeId: string;
  gsmRangeId: string;
  layerId: string;
  rmId: string;
  quantity: string;
}

let rowCounter = 0;
const newRow = (): CostingRow => ({
  uid: `row-${++rowCounter}`,
  gradeId: "",
  gsmRangeId: "",
  layerId: "",
  rmId: "",
  quantity: "",
});

export default function CostingCalculatorPage() {
  const navigate = useNavigate();
  const { data: grades = [] } = useListGrades();
  const { data: layers = [] } = useListLayers();
  const { data: gsmRanges = [] } = useListGsmRanges();
  const { data: rms = [] } = useListRMs();
  const createRecord = useCreateCostingRecord();

  const [rows, setRows] = useState<CostingRow[]>([newRow()]);

  const getRmById = (id: string) => rms.find((r) => String(r.id) === id);

  const totalCost = rows.reduce((sum, row) => {
    const rm = getRmById(row.rmId);
    const qty = Number.parseFloat(row.quantity);
    if (rm && !Number.isNaN(qty)) return sum + rm.unitCost * qty;
    return sum;
  }, 0);

  const totalQty = rows.reduce((sum, row) => {
    const qty = Number.parseFloat(row.quantity);
    return sum + (Number.isNaN(qty) ? 0 : qty);
  }, 0);

  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (uid: string) =>
    setRows((prev) => prev.filter((r) => r.uid !== uid));
  const updateRow = (
    uid: string,
    field: keyof Omit<CostingRow, "uid">,
    value: string,
  ) =>
    setRows((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, [field]: value } : r)),
    );

  const handleSubmit = async () => {
    const validRows = rows.filter(
      (r) =>
        r.rmId && r.quantity && !Number.isNaN(Number.parseFloat(r.quantity)),
    );
    if (validRows.length === 0) {
      toast.error("Please add at least one valid row with RM and QTY");
      return;
    }

    const firstValid = validRows[0];
    const gradeId = firstValid.gradeId || "0";
    const gsmRangeId = firstValid.gsmRangeId || "0";
    const layerId = firstValid.layerId || "0";
    const autoName = `Estimate ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;

    try {
      await createRecord.mutateAsync({
        name: autoName,
        gradeId: BigInt(gradeId),
        layerId: BigInt(layerId),
        gsmRangeId: BigInt(gsmRangeId),
        width: 0,
        length: 0,
        quantity: BigInt(Math.round(totalQty)),
        items: validRows.map((r) => ({
          rmId: BigInt(r.rmId),
          quantity: Number.parseFloat(r.quantity),
        })),
      });
      toast.success("Cost estimate saved successfully");
      navigate({ to: "/records" });
    } catch {
      toast.error("Failed to save cost estimate");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Costing Calculator</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create a new paper &amp; board cost estimate
        </p>
      </div>

      <div className="space-y-5">
        {/* Table Form */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Costing Details
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={addRow}
                data-ocid="calculator.add_row.button"
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-8 text-center font-semibold">
                      #
                    </TableHead>
                    <TableHead className="font-semibold">Grade</TableHead>
                    <TableHead className="font-semibold">GSM Range</TableHead>
                    <TableHead className="font-semibold">Layer</TableHead>
                    <TableHead className="font-semibold">RM</TableHead>
                    <TableHead className="font-semibold w-32">
                      QTY (MT)
                    </TableHead>
                    <TableHead className="font-semibold w-36 text-right">
                      Line Cost
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-10 text-muted-foreground text-sm"
                        data-ocid="calculator.rows.empty_state"
                      >
                        No rows added. Click "Add Row" to begin.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, i) => {
                      const rm = getRmById(row.rmId);
                      const qty = Number.parseFloat(row.quantity);
                      const lineCost =
                        rm && !Number.isNaN(qty) ? rm.unitCost * qty : null;
                      return (
                        <TableRow
                          key={row.uid}
                          className="hover:bg-muted/30"
                          data-ocid={`calculator.row.item.${i + 1}`}
                        >
                          <TableCell className="text-center text-muted-foreground text-xs font-mono">
                            {i + 1}
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Select
                              value={row.gradeId}
                              onValueChange={(v) =>
                                updateRow(row.uid, "gradeId", v)
                              }
                            >
                              <SelectTrigger
                                className="h-8 text-sm"
                                data-ocid={`calculator.grade.select.${i + 1}`}
                              >
                                <SelectValue placeholder="Grade" />
                              </SelectTrigger>
                              <SelectContent>
                                {grades.map((g) => (
                                  <SelectItem
                                    key={String(g.id)}
                                    value={String(g.id)}
                                  >
                                    {g.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="min-w-[150px]">
                            <Select
                              value={row.gsmRangeId}
                              onValueChange={(v) =>
                                updateRow(row.uid, "gsmRangeId", v)
                              }
                            >
                              <SelectTrigger
                                className="h-8 text-sm"
                                data-ocid={`calculator.gsm_range.select.${i + 1}`}
                              >
                                <SelectValue placeholder="GSM Range" />
                              </SelectTrigger>
                              <SelectContent>
                                {gsmRanges.map((g) => (
                                  <SelectItem
                                    key={String(g.id)}
                                    value={String(g.id)}
                                  >
                                    {g.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="min-w-[130px]">
                            <Select
                              value={row.layerId}
                              onValueChange={(v) =>
                                updateRow(row.uid, "layerId", v)
                              }
                            >
                              <SelectTrigger
                                className="h-8 text-sm"
                                data-ocid={`calculator.layer.select.${i + 1}`}
                              >
                                <SelectValue placeholder="Layer" />
                              </SelectTrigger>
                              <SelectContent>
                                {layers.map((l) => (
                                  <SelectItem
                                    key={String(l.id)}
                                    value={String(l.id)}
                                  >
                                    {l.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="min-w-[160px]">
                            <Select
                              value={row.rmId}
                              onValueChange={(v) =>
                                updateRow(row.uid, "rmId", v)
                              }
                            >
                              <SelectTrigger
                                className="h-8 text-sm"
                                data-ocid={`calculator.rm.select.${i + 1}`}
                              >
                                <SelectValue placeholder="Select RM" />
                              </SelectTrigger>
                              <SelectContent>
                                {rms.map((r) => (
                                  <SelectItem
                                    key={String(r.id)}
                                    value={String(r.id)}
                                  >
                                    {r.name} — ₹{r.unitCost}/{r.unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              className="h-8 text-sm w-28"
                              value={row.quantity}
                              onChange={(e) =>
                                updateRow(row.uid, "quantity", e.target.value)
                              }
                              placeholder="0.000"
                              data-ocid={`calculator.qty.input.${i + 1}`}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {lineCost != null ? (
                              <span className="text-foreground font-semibold">
                                ₹{lineCost.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => removeRow(row.uid)}
                              data-ocid={`calculator.row.delete_button.${i + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Totals Footer */}
            {rows.length > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/30">
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-muted-foreground">
                    Rows: <strong>{rows.length}</strong>
                  </span>
                  <span className="text-muted-foreground">
                    Total QTY:{" "}
                    <strong className="font-mono">
                      {totalQty.toFixed(3)} MT
                    </strong>
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                    Total Estimated Cost
                  </p>
                  <p className="text-2xl font-display font-bold text-accent">
                    ₹{totalCost.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/records" })}
            data-ocid="calculator.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createRecord.isPending}
            data-ocid="calculator.submit_button"
            className="gap-2"
          >
            {createRecord.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PackagePlus className="w-4 h-4" />
            )}
            {createRecord.isPending ? "Saving..." : "Save Estimate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
