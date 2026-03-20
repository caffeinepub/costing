import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CostingItem, CostingRecord } from "../backend.d";
import {
  useCreateCostingRecord,
  useDeleteCostingRecord,
  useGetCostingRecord,
  useListCostingRecords,
  useListGrades,
  useListGsmRanges,
  useListLayers,
  useListRMs,
} from "../hooks/useQueries";

function RecordDetailDialog({
  record,
  open,
  onClose,
}: { record: CostingRecord | null; open: boolean; onClose: () => void }) {
  const { data: detail } = useGetCostingRecord(record?.id ?? null);
  const { data: grades = [] } = useListGrades();
  const { data: layers = [] } = useListLayers();
  const { data: gsmRanges = [] } = useListGsmRanges();
  const { data: rms = [] } = useListRMs();

  const r = detail ?? record;
  if (!r) return null;

  const grade = grades.find((g) => g.id === r.gradeId);
  const layer = layers.find((l) => l.id === r.layerId);
  const gsm = gsmRanges.find((g) => g.id === r.gsmRangeId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-ocid="record.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">{r.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                Grade
              </p>
              <p className="font-medium">{grade?.name ?? "—"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                Layer
              </p>
              <p className="font-medium">{layer?.name ?? "—"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                GSM Range
              </p>
              <p className="font-medium">
                {gsm ? `${gsm.name} (${gsm.minGsm}–${gsm.maxGsm})` : "—"}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                Quantity
              </p>
              <p className="font-medium">{String(r.quantity)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                Dimensions
              </p>
              <p className="font-medium">
                {r.width} × {r.length} mm
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                Total Cost
              </p>
              <p className="font-bold text-accent text-base">
                ₹{r.totalCost.toFixed(2)}
              </p>
            </div>
          </div>

          {r.items && r.items.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-2">
                Raw Materials
              </p>
              <div className="border rounded overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">Material</TableHead>
                      <TableHead className="text-xs">Qty</TableHead>
                      <TableHead className="text-xs">Unit Cost</TableHead>
                      <TableHead className="text-xs">Line Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.items.map((item) => {
                      const rm = rms.find((x) => x.id === item.rmId);
                      const lineCost = rm ? rm.unitCost * item.quantity : 0;
                      return (
                        <TableRow key={String(item.rmId)}>
                          <TableCell className="text-xs font-medium">
                            {rm?.name ?? String(item.rmId)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.quantity} {rm?.unit}
                          </TableCell>
                          <TableCell className="text-xs">
                            ₹{rm?.unitCost.toFixed(2) ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            ₹{lineCost.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type EditRow = { uid: number; rmId: string; quantity: string };

let uidCounter = 0;
const nextUid = () => ++uidCounter;

function EditRecordDialog({
  record,
  open,
  onClose,
}: { record: CostingRecord | null; open: boolean; onClose: () => void }) {
  const { data: grades = [] } = useListGrades();
  const { data: layers = [] } = useListLayers();
  const { data: gsmRanges = [] } = useListGsmRanges();
  const { data: rms = [] } = useListRMs();
  const del = useDeleteCostingRecord();
  const create = useCreateCostingRecord();
  const prevRecordId = useRef<bigint | null>(null);

  const [name, setName] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [layerId, setLayerId] = useState("");
  const [gsmRangeId, setGsmRangeId] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rows, setRows] = useState<EditRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record && open && prevRecordId.current !== record.id) {
      prevRecordId.current = record.id;
      setName(record.name);
      setGradeId(String(record.gradeId));
      setLayerId(String(record.layerId));
      setGsmRangeId(String(record.gsmRangeId));
      setWidth(String(record.width));
      setLength(String(record.length));
      setQuantity(String(record.quantity));
      setRows(
        record.items.map((item) => ({
          uid: nextUid(),
          rmId: String(item.rmId),
          quantity: String(item.quantity),
        })),
      );
    }
    if (!open) {
      prevRecordId.current = null;
    }
  }, [record, open]);

  if (!record) return null;

  const addRow = () =>
    setRows((prev) => [...prev, { uid: nextUid(), rmId: "", quantity: "" }]);

  const removeRow = (uid: number) =>
    setRows((prev) => prev.filter((r) => r.uid !== uid));

  const updateRow = (uid: number, field: "rmId" | "quantity", value: string) =>
    setRows((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, [field]: value } : r)),
    );

  const handleSave = async () => {
    if (!name.trim() || !gradeId || !layerId || !gsmRangeId) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const items: CostingItem[] = rows
        .filter((r) => r.rmId && r.quantity)
        .map((r) => ({ rmId: BigInt(r.rmId), quantity: Number(r.quantity) }));

      await del.mutateAsync(record.id);
      await create.mutateAsync({
        name: name.trim(),
        gradeId: BigInt(gradeId),
        layerId: BigInt(layerId),
        gsmRangeId: BigInt(gsmRangeId),
        width: Number(width) || 0,
        length: Number(length) || 0,
        quantity: BigInt(quantity) || BigInt(0),
        items,
      });
      toast.success("Record updated successfully");
      onClose();
    } catch {
      toast.error("Failed to update record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-ocid="edit_record.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display">Edit Cost Record</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Estimate Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 Deluxe Run"
              data-ocid="edit_record.input"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Grade</Label>
              <Select value={gradeId} onValueChange={setGradeId}>
                <SelectTrigger data-ocid="edit_record.grade.select">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={String(g.id)} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>GSM Range</Label>
              <Select value={gsmRangeId} onValueChange={setGsmRangeId}>
                <SelectTrigger data-ocid="edit_record.gsm.select">
                  <SelectValue placeholder="Select GSM" />
                </SelectTrigger>
                <SelectContent>
                  {gsmRanges.map((g) => (
                    <SelectItem key={String(g.id)} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Layer</Label>
              <Select value={layerId} onValueChange={setLayerId}>
                <SelectTrigger data-ocid="edit_record.layer.select">
                  <SelectValue placeholder="Select layer" />
                </SelectTrigger>
                <SelectContent>
                  {layers.map((l) => (
                    <SelectItem key={String(l.id)} value={String(l.id)}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-width">Width (mm)</Label>
              <Input
                id="edit-width"
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                data-ocid="edit_record.width.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-length">Length (mm)</Label>
              <Input
                id="edit-length"
                type="number"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                data-ocid="edit_record.length.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-qty">Quantity (MT)</Label>
              <Input
                id="edit-qty"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                data-ocid="edit_record.quantity.input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Raw Materials</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addRow}
                data-ocid="edit_record.add_rm.button"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Row
              </Button>
            </div>
            {rows.length === 0 ? (
              <p className="text-muted-foreground text-xs py-2">
                No raw material rows. Click "Add Row" to add one.
              </p>
            ) : (
              <div className="border rounded overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">RM</TableHead>
                      <TableHead className="text-xs w-32">Qty</TableHead>
                      <TableHead className="text-xs w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow
                        key={row.uid}
                        data-ocid={`edit_record.rm.item.${idx + 1}`}
                      >
                        <TableCell className="py-1.5">
                          <Select
                            value={row.rmId}
                            onValueChange={(v) => updateRow(row.uid, "rmId", v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select RM" />
                            </SelectTrigger>
                            <SelectContent>
                              {rms.map((rm) => (
                                <SelectItem
                                  key={String(rm.id)}
                                  value={String(rm.id)}
                                >
                                  {rm.name} ({rm.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={row.quantity}
                            onChange={(e) =>
                              updateRow(row.uid, "quantity", e.target.value)
                            }
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeRow(row.uid)}
                            data-ocid={`edit_record.rm.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="edit_record.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            data-ocid="edit_record.save_button"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CostRecordsPage() {
  const { data: records = [], isLoading } = useListCostingRecords();
  const { data: grades = [] } = useListGrades();
  const { data: layers = [] } = useListLayers();
  const { data: gsmRanges = [] } = useListGsmRanges();
  const { data: rms = [] } = useListRMs();
  const del = useDeleteCostingRecord();

  const [viewRecord, setViewRecord] = useState<CostingRecord | null>(null);
  const [editRecord, setEditRecord] = useState<CostingRecord | null>(null);
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  const handleDelete = async (id: bigint, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await del.mutateAsync(id);
      toast.success("Record deleted");
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const getGradeName = (id: bigint) =>
    grades.find((g) => g.id === id)?.name ?? "—";
  const getLayerName = (id: bigint) =>
    layers.find((l) => l.id === id)?.name ?? "—";
  const getGsmName = (id: bigint) =>
    gsmRanges.find((g) => g.id === id)?.name ?? "—";
  const getRmNames = (items: CostingItem[]) =>
    items
      .map(
        (item) =>
          rms.find((r) => r.id === item.rmId)?.name ?? String(item.rmId),
      )
      .join(", ");

  const formatDate = (ns: bigint | number) => {
    const ms =
      typeof ns === "bigint"
        ? Number(ns / 1_000_000n)
        : Math.round(ns / 1_000_000);
    return new Date(ms).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Cost Records</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {records.length > 0
            ? `${records.length} estimate${records.length !== 1 ? "s" : ""} on record`
            : "All saved cost estimates"}
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card shadow-card">
        <Table data-ocid="records.table">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Layer</TableHead>
              <TableHead>GSM Range</TableHead>
              <TableHead>RM</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              ["r1", "r2", "r3", "r4", "r5"].map((_sk) => (
                <TableRow key={_sk}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow data-ocid="records.empty_state">
                <TableCell
                  colSpan={9}
                  className="text-center py-16 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm">No cost estimates yet.</p>
                    <p className="text-xs">
                      Use the Costing Calculator to create your first estimate.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              records.map((r, i) => (
                <TableRow
                  key={String(r.id)}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setViewRecord(r)}
                  data-ocid={`records.item.${i + 1}`}
                >
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal">
                      {getGradeName(r.gradeId)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getLayerName(r.layerId)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getGsmName(r.gsmRangeId)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                    {getRmNames(r.items)}
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {String(r.quantity)}
                  </TableCell>
                  <TableCell className="font-semibold text-accent">
                    ₹{r.totalCost.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewRecord(r);
                        }}
                        data-ocid={`records.view_button.${i + 1}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditRecord(r);
                        }}
                        data-ocid={`records.edit_button.${i + 1}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(r.id, e)}
                        disabled={deletingId === r.id}
                        data-ocid={`records.delete_button.${i + 1}`}
                      >
                        {deletingId === r.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RecordDetailDialog
        record={viewRecord}
        open={viewRecord != null}
        onClose={() => setViewRecord(null)}
      />

      <EditRecordDialog
        record={editRecord}
        open={editRecord != null}
        onClose={() => setEditRecord(null)}
      />
    </div>
  );
}
