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
import { useNavigate } from "@tanstack/react-router";
import { Factory, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCreateProductionEntry,
  useListCostingRecords,
  useListGrades,
  useListGsmRanges,
  useListRMs,
} from "../hooks/useQueries";

export default function ProductionEntryPage() {
  const navigate = useNavigate();
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const [productionQty, setProductionQty] = useState<string>("");

  const { data: records = [] } = useListCostingRecords();
  const { data: grades = [] } = useListGrades();
  const { data: gsmRanges = [] } = useListGsmRanges();
  const { data: rms = [] } = useListRMs();
  const createEntry = useCreateProductionEntry();

  const selectedRecord = records.find(
    (r) => r.id.toString() === selectedRecordId,
  );

  const getGradeName = (id: bigint) =>
    grades.find((g) => g.id === id)?.name ?? "";
  const getGsmRangeName = (id: bigint) =>
    gsmRanges.find((g) => g.id === id)?.name ?? "";
  const getRMName = (id: bigint) => rms.find((r) => r.id === id)?.name ?? "?";

  const productionQtyNum = Number.parseFloat(productionQty);
  const isValidQty =
    !Number.isNaN(productionQtyNum) && productionQtyNum >= 0.001;

  const calculatedRows =
    selectedRecord && isValidQty
      ? selectedRecord.items.map((item) => {
          const baseQtyMT = Number(selectedRecord.quantity) || 1;
          const calcQty = (item.quantity / baseQtyMT) * productionQtyNum;
          return {
            rmId: item.rmId,
            rmName: getRMName(item.rmId),
            baseQty: item.quantity,
            calculatedQty: calcQty,
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
      navigate({ to: "/production-records" });
    } catch {
      toast.error("Failed to save production entry");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Factory className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-display font-semibold text-foreground">
            Production Entry
          </h1>
          <p className="text-sm text-muted-foreground">
            Record actual production quantity and auto-calculate RM consumption
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Production Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Costing Record */}
          <div className="space-y-1.5">
            <Label htmlFor="costing-record">
              Costing Record <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedRecordId}
              onValueChange={setSelectedRecordId}
            >
              <SelectTrigger id="costing-record" data-ocid="production.select">
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

          {/* Production Qty */}
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
              <p
                className="text-xs text-destructive"
                data-ocid="production.error_state"
              >
                Quantity must be at least 0.001 MT
              </p>
            )}
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
                      <TableHead className="text-right">
                        Base Qty (kg)
                      </TableHead>
                      <TableHead className="text-right">
                        Actual Production (MT)
                      </TableHead>
                      <TableHead className="text-right">
                        Calculated Consumption (kg)
                      </TableHead>
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
                        <TableCell className="text-right">
                          {row.baseQty.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {productionQtyNum.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {row.calculatedQty.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {selectedRecord && isValidQty && calculatedRows.length === 0 && (
            <div
              className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground"
              data-ocid="production.empty_state"
            >
              No RM items found in the selected costing record.
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={!selectedRecord || !isValidQty || createEntry.isPending}
            data-ocid="production.submit_button"
            className="w-full"
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
    </div>
  );
}
