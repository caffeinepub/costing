import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Grade, GsmRange, Layer, RM } from "../backend.d";
import {
  useCreateGrade,
  useCreateGsmRange,
  useCreateLayer,
  useCreateRM,
  useDeleteGrade,
  useDeleteGsmRange,
  useDeleteLayer,
  useDeleteRM,
  useListGrades,
  useListGsmRanges,
  useListLayers,
  useListRMs,
  useUpdateGrade,
  useUpdateGsmRange,
  useUpdateLayer,
  useUpdateRM,
} from "../hooks/useQueries";

// ─── Action Buttons ───────────────────────────────────────────────────────

function ActionButtons({
  ocidPrefix,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  isEditing,
  isSaving,
  isDeleting,
}: {
  ocidPrefix: string;
  onSave?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isEditing: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
}) {
  if (isEditing) {
    return (
      <div className="flex gap-1 justify-end">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-green-600 hover:text-green-700"
          onClick={onSave}
          disabled={isSaving}
          data-ocid={`${ocidPrefix}.save_button`}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onCancel}
          data-ocid={`${ocidPrefix}.cancel_button`}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }
  return (
    <div className="flex gap-1 justify-end">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={onEdit}
        data-ocid={`${ocidPrefix}.edit_button`}
      >
        <Pencil className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={onDelete}
        disabled={isDeleting}
        data-ocid={`${ocidPrefix}.delete_button`}
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}

// ─── Grade Section ─────────────────────────────────────────────────────────

function GradeSection() {
  const { data: grades = [], isLoading } = useListGrades();
  const create = useCreateGrade();
  const update = useUpdateGrade();
  const del = useDeleteGrade();

  const [editId, setEditId] = useState<bigint | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  const startEdit = (g: Grade) => {
    setEditId(g.id);
    setEditName(g.name);
    setEditDesc(g.description);
    setAdding(false);
  };

  const saveEdit = async () => {
    if (!editId) return;
    try {
      await update.mutateAsync({
        id: editId,
        name: editName,
        description: editDesc,
      });
      toast.success("Grade updated");
      setEditId(null);
    } catch {
      toast.error("Failed to update grade");
    }
  };

  const saveNew = async () => {
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await create.mutateAsync({
        name: newName.trim(),
        description: newDesc.trim(),
      });
      toast.success("Grade added");
      setAdding(false);
      setNewName("");
      setNewDesc("");
    } catch {
      toast.error("Failed to add grade");
    }
  };

  const handleDelete = async (id: bigint) => {
    setDeletingId(id);
    try {
      await del.mutateAsync(id);
      toast.success("Grade deleted");
    } catch {
      toast.error("Failed to delete grade");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card data-ocid="grade.card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Grade</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAdding(true);
              setEditId(null);
            }}
            data-ocid="grade.open_modal_button"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table data-ocid="grade.table">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow data-ocid="grade.loading_state">
                <TableCell
                  colSpan={3}
                  className="text-center py-6 text-muted-foreground"
                >
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && grades.length === 0 && !adding && (
              <TableRow data-ocid="grade.empty_state">
                <TableCell
                  colSpan={3}
                  className="text-center py-6 text-muted-foreground text-sm"
                >
                  No grades yet.
                </TableCell>
              </TableRow>
            )}
            {grades.map((g, i) => (
              <TableRow key={String(g.id)} data-ocid={`grade.item.${i + 1}`}>
                {editId === g.id ? (
                  <>
                    <TableCell className="py-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm"
                        data-ocid="grade.input"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.description}
                    </TableCell>
                  </>
                )}
                <TableCell>
                  <ActionButtons
                    ocidPrefix={`grade.row.${i + 1}`}
                    isEditing={editId === g.id}
                    isSaving={update.isPending}
                    isDeleting={deletingId === g.id}
                    onEdit={() => startEdit(g)}
                    onDelete={() => handleDelete(g.id)}
                    onSave={saveEdit}
                    onCancel={() => setEditId(null)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {adding && (
              <TableRow data-ocid="grade.new.row">
                <TableCell className="py-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name"
                    className="h-8 text-sm"
                    data-ocid="grade.new.input"
                  />
                </TableCell>
                <TableCell className="py-2">
                  <Input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Description"
                    className="h-8 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <ActionButtons
                    ocidPrefix="grade.new"
                    isEditing
                    isSaving={create.isPending}
                    onSave={saveNew}
                    onCancel={() => {
                      setAdding(false);
                      setNewName("");
                      setNewDesc("");
                    }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── GSM Range Section ─────────────────────────────────────────────────────

function GsmRangeSection() {
  const { data: gsmRanges = [], isLoading } = useListGsmRanges();
  const create = useCreateGsmRange();
  const update = useUpdateGsmRange();
  const del = useDeleteGsmRange();

  const [editId, setEditId] = useState<bigint | null>(null);
  const [editName, setEditName] = useState("");
  const [editMin, setEditMin] = useState("");
  const [editMax, setEditMax] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMin, setNewMin] = useState("");
  const [newMax, setNewMax] = useState("");
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  const startEdit = (g: GsmRange) => {
    setEditId(g.id);
    setEditName(g.name);
    setEditMin(String(g.minGsm));
    setEditMax(String(g.maxGsm));
    setAdding(false);
  };

  const saveEdit = async () => {
    if (!editId) return;
    try {
      await update.mutateAsync({
        id: editId,
        name: editName || `${editMin}-${editMax}`,
        minGsm: Number(editMin),
        maxGsm: Number(editMax),
      });
      toast.success("GSM Range updated");
      setEditId(null);
    } catch {
      toast.error("Failed to update GSM Range");
    }
  };

  const saveNew = async () => {
    if (!newName.trim() && !newMin && !newMax) {
      toast.error("Name or range values are required");
      return;
    }
    try {
      await create.mutateAsync({
        name: newName.trim() || `${newMin}-${newMax}`,
        minGsm: Number(newMin),
        maxGsm: Number(newMax),
      });
      toast.success("GSM Range added");
      setAdding(false);
      setNewName("");
      setNewMin("");
      setNewMax("");
    } catch {
      toast.error("Failed to add GSM Range");
    }
  };

  const handleDelete = async (id: bigint) => {
    setDeletingId(id);
    try {
      await del.mutateAsync(id);
      toast.success("GSM Range deleted");
    } catch {
      toast.error("Failed to delete GSM Range");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card data-ocid="gsm.card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">GSM Range</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAdding(true);
              setEditId(null);
            }}
            data-ocid="gsm.open_modal_button"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table data-ocid="gsm.table">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Name</TableHead>
              <TableHead>Min GSM</TableHead>
              <TableHead>Max GSM</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow data-ocid="gsm.loading_state">
                <TableCell
                  colSpan={4}
                  className="text-center py-6 text-muted-foreground"
                >
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && gsmRanges.length === 0 && !adding && (
              <TableRow data-ocid="gsm.empty_state">
                <TableCell
                  colSpan={4}
                  className="text-center py-6 text-muted-foreground text-sm"
                >
                  No GSM ranges yet.
                </TableCell>
              </TableRow>
            )}
            {gsmRanges.map((g, i) => (
              <TableRow key={String(g.id)} data-ocid={`gsm.item.${i + 1}`}>
                {editId === g.id ? (
                  <>
                    <TableCell className="py-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm"
                        data-ocid="gsm.input"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        value={editMin}
                        onChange={(e) => setEditMin(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        value={editMax}
                        onChange={(e) => setEditMax(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.minGsm}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.maxGsm}
                    </TableCell>
                  </>
                )}
                <TableCell>
                  <ActionButtons
                    ocidPrefix={`gsm.row.${i + 1}`}
                    isEditing={editId === g.id}
                    isSaving={update.isPending}
                    isDeleting={deletingId === g.id}
                    onEdit={() => startEdit(g)}
                    onDelete={() => handleDelete(g.id)}
                    onSave={saveEdit}
                    onCancel={() => setEditId(null)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {adding && (
              <TableRow data-ocid="gsm.new.row">
                <TableCell className="py-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. 230-249"
                    className="h-8 text-sm"
                    data-ocid="gsm.new.input"
                  />
                </TableCell>
                <TableCell className="py-2">
                  <Input
                    type="number"
                    value={newMin}
                    onChange={(e) => setNewMin(e.target.value)}
                    placeholder="230"
                    className="h-8 text-sm"
                  />
                </TableCell>
                <TableCell className="py-2">
                  <Input
                    type="number"
                    value={newMax}
                    onChange={(e) => setNewMax(e.target.value)}
                    placeholder="249"
                    className="h-8 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <ActionButtons
                    ocidPrefix="gsm.new"
                    isEditing
                    isSaving={create.isPending}
                    onSave={saveNew}
                    onCancel={() => {
                      setAdding(false);
                      setNewName("");
                      setNewMin("");
                      setNewMax("");
                    }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Layer Section ─────────────────────────────────────────────────────────

function LayerSection() {
  const { data: layers = [], isLoading } = useListLayers();
  const create = useCreateLayer();
  const update = useUpdateLayer();
  const del = useDeleteLayer();

  const [editId, setEditId] = useState<bigint | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  const startEdit = (l: Layer) => {
    setEditId(l.id);
    setEditName(l.name);
    setEditDesc(l.description);
    setAdding(false);
  };

  const saveEdit = async () => {
    if (!editId) return;
    try {
      await update.mutateAsync({
        id: editId,
        name: editName,
        description: editDesc,
      });
      toast.success("Layer updated");
      setEditId(null);
    } catch {
      toast.error("Failed to update layer");
    }
  };

  const saveNew = async () => {
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await create.mutateAsync({
        name: newName.trim(),
        description: newDesc.trim(),
      });
      toast.success("Layer added");
      setAdding(false);
      setNewName("");
      setNewDesc("");
    } catch {
      toast.error("Failed to add layer");
    }
  };

  const handleDelete = async (id: bigint) => {
    setDeletingId(id);
    try {
      await del.mutateAsync(id);
      toast.success("Layer deleted");
    } catch {
      toast.error("Failed to delete layer");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card data-ocid="layer.card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Layer</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAdding(true);
              setEditId(null);
            }}
            data-ocid="layer.open_modal_button"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table data-ocid="layer.table">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow data-ocid="layer.loading_state">
                <TableCell
                  colSpan={3}
                  className="text-center py-6 text-muted-foreground"
                >
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && layers.length === 0 && !adding && (
              <TableRow data-ocid="layer.empty_state">
                <TableCell
                  colSpan={3}
                  className="text-center py-6 text-muted-foreground text-sm"
                >
                  No layers yet.
                </TableCell>
              </TableRow>
            )}
            {layers.map((l, i) => (
              <TableRow key={String(l.id)} data-ocid={`layer.item.${i + 1}`}>
                {editId === l.id ? (
                  <>
                    <TableCell className="py-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm"
                        data-ocid="layer.input"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {l.description}
                    </TableCell>
                  </>
                )}
                <TableCell>
                  <ActionButtons
                    ocidPrefix={`layer.row.${i + 1}`}
                    isEditing={editId === l.id}
                    isSaving={update.isPending}
                    isDeleting={deletingId === l.id}
                    onEdit={() => startEdit(l)}
                    onDelete={() => handleDelete(l.id)}
                    onSave={saveEdit}
                    onCancel={() => setEditId(null)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {adding && (
              <TableRow data-ocid="layer.new.row">
                <TableCell className="py-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name"
                    className="h-8 text-sm"
                    data-ocid="layer.new.input"
                  />
                </TableCell>
                <TableCell className="py-2">
                  <Input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Description"
                    className="h-8 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <ActionButtons
                    ocidPrefix="layer.new"
                    isEditing
                    isSaving={create.isPending}
                    onSave={saveNew}
                    onCancel={() => {
                      setAdding(false);
                      setNewName("");
                      setNewDesc("");
                    }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── RM Section ───────────────────────────────────────────────────────────

function RMSection() {
  const { data: rms = [], isLoading } = useListRMs();
  const create = useCreateRM();
  const update = useUpdateRM();
  const del = useDeleteRM();

  const [editId, setEditId] = useState<bigint | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnitCost, setEditUnitCost] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnitCost, setNewUnitCost] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  const startEdit = (r: RM) => {
    setEditId(r.id);
    setEditName(r.name);
    setEditUnitCost(String(r.unitCost));
    setEditUnit(r.unit ?? "");
    setAdding(false);
  };

  const saveEdit = async () => {
    if (!editId) return;
    try {
      await update.mutateAsync({
        id: editId,
        name: editName,
        unitCost: Number(editUnitCost),
        unit: editUnit,
      });
      toast.success("RM updated");
      setEditId(null);
    } catch {
      toast.error("Failed to update RM");
    }
  };

  const saveNew = async () => {
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await create.mutateAsync({
        name: newName.trim(),
        unitCost: Number(newUnitCost),
        unit: newUnit.trim(),
      });
      toast.success("RM added");
      setAdding(false);
      setNewName("");
      setNewUnitCost("");
      setNewUnit("");
    } catch {
      toast.error("Failed to add RM");
    }
  };

  const handleDelete = async (id: bigint) => {
    setDeletingId(id);
    try {
      await del.mutateAsync(id);
      toast.success("RM deleted");
    } catch {
      toast.error("Failed to delete RM");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card data-ocid="rm.card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Raw Material (RM)
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAdding(true);
              setEditId(null);
            }}
            data-ocid="rm.open_modal_button"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table data-ocid="rm.table">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Name</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow data-ocid="rm.loading_state">
                <TableCell
                  colSpan={4}
                  className="text-center py-6 text-muted-foreground"
                >
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rms.length === 0 && !adding && (
              <TableRow data-ocid="rm.empty_state">
                <TableCell
                  colSpan={4}
                  className="text-center py-6 text-muted-foreground text-sm"
                >
                  No raw materials yet.
                </TableCell>
              </TableRow>
            )}
            {rms.map((r, i) => (
              <TableRow key={String(r.id)} data-ocid={`rm.item.${i + 1}`}>
                {editId === r.id ? (
                  <>
                    <TableCell className="py-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm"
                        data-ocid="rm.input"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        value={editUnitCost}
                        onChange={(e) => setEditUnitCost(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value)}
                        placeholder="e.g. kg"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.unitCost.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.unit}
                    </TableCell>
                  </>
                )}
                <TableCell>
                  <ActionButtons
                    ocidPrefix={`rm.row.${i + 1}`}
                    isEditing={editId === r.id}
                    isSaving={update.isPending}
                    isDeleting={deletingId === r.id}
                    onEdit={() => startEdit(r)}
                    onDelete={() => handleDelete(r.id)}
                    onSave={saveEdit}
                    onCancel={() => setEditId(null)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {adding && (
              <TableRow data-ocid="rm.new.row">
                <TableCell className="py-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name"
                    className="h-8 text-sm"
                    data-ocid="rm.new.input"
                  />
                </TableCell>
                <TableCell className="py-2">
                  <Input
                    type="number"
                    value={newUnitCost}
                    onChange={(e) => setNewUnitCost(e.target.value)}
                    placeholder="0"
                    className="h-8 text-sm"
                  />
                </TableCell>
                <TableCell className="py-2">
                  <Input
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="kg"
                    className="h-8 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <ActionButtons
                    ocidPrefix="rm.new"
                    isEditing
                    isSaving={create.isPending}
                    onSave={saveNew}
                    onCancel={() => {
                      setAdding(false);
                      setNewName("");
                      setNewUnitCost("");
                      setNewUnit("");
                    }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function MastersPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-display font-bold">Masters</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage Grade, GSM Range, Layer, and Raw Material master data.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <GradeSection />
        <GsmRangeSection />
        <LayerSection />
        <RMSection />
      </div>
    </div>
  );
}
