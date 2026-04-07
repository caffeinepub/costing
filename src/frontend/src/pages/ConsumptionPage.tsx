import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Layers } from "lucide-react";
import { toast } from "sonner";
import { useListProductionEntries } from "../hooks/useQueries";

const VC_UNIT_LS_KEY = "valueCostingRecordUnitOverrides";

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

function getEntryDateStr(entry: {
  createdAt: bigint;
  entryDate?: string;
}): string {
  if (entry.entryDate) return entry.entryDate;
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

interface SummaryRow {
  siteUnit: string;
  date: string;
  productionQtyMT: number;
  entryCount: number;
}

export default function ConsumptionPage() {
  const { data: productionEntries = [] } = useListProductionEntries();

  const summaryMap = new Map<string, SummaryRow>();

  for (const entry of productionEntries) {
    const siteUnit = getVCUnit(entry.costingRecordId) || "\u2014";
    const date = getEntryDateStr(entry);
    const key = `${siteUnit}||${date}`;

    if (summaryMap.has(key)) {
      const existing = summaryMap.get(key)!;
      existing.productionQtyMT += entry.productionQtyMT;
      existing.entryCount += 1;
    } else {
      summaryMap.set(key, {
        siteUnit,
        date,
        productionQtyMT: entry.productionQtyMT,
        entryCount: 1,
      });
    }
  }

  const summaryRows = Array.from(summaryMap.values()).sort((a, b) => {
    if (a.siteUnit < b.siteUnit) return -1;
    if (a.siteUnit > b.siteUnit) return 1;
    return b.date.localeCompare(a.date);
  });

  const groupedBySite = new Map<string, SummaryRow[]>();
  for (const row of summaryRows) {
    if (!groupedBySite.has(row.siteUnit)) groupedBySite.set(row.siteUnit, []);
    groupedBySite.get(row.siteUnit)!.push(row);
  }

  const totalQty = summaryRows.reduce((sum, r) => sum + r.productionQtyMT, 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(n);

  const handleDownloadExcel = () => {
    if (summaryRows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Site/Unit",
      "Date",
      "Production QTY (MT)",
      "No. of Entries",
    ];
    const rows = summaryRows.map((r) => [
      r.siteUnit,
      formatDisplayDate(r.date),
      r.productionQtyMT.toFixed(3),
      r.entryCount.toString(),
    ]);

    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map((r) => r.map(escapeCsv).join(",")),
      ["", "Grand Total", totalQty.toFixed(3), ""].map(escapeCsv).join(","),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `consumption-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Excel file downloaded");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold text-foreground">
              Consumption
            </h1>
            <p className="text-sm text-muted-foreground">
              Production QTY (MT) summarised by Site/Unit and Date
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleDownloadExcel}
          disabled={summaryRows.length === 0}
          className="flex items-center gap-2"
          data-ocid="consumption.download_excel"
        >
          <Download className="w-4 h-4" />
          Download Excel
        </Button>
      </div>

      {summaryRows.length === 0 ? (
        <div
          className="rounded-lg border border-dashed p-14 text-center"
          data-ocid="consumption.empty_state"
        >
          <Layers className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No production entries found. Add entries in Production Records
            first.
          </p>
        </div>
      ) : (
        <>
          {Array.from(groupedBySite.entries()).map(([siteUnit, rows]) => {
            const siteTotal = rows.reduce((s, r) => s + r.productionQtyMT, 0);
            return (
              <Card key={siteUnit} data-ocid={`consumption.site.${siteUnit}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {siteUnit}
                      </span>
                      <span className="text-muted-foreground font-normal text-sm">
                        {rows.length} date{rows.length !== 1 ? "s" : ""}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      Total: {fmt(siteTotal)} MT
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">
                            Production QTY (MT)
                          </TableHead>
                          <TableHead className="text-right">
                            No. of Entries
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow
                            key={row.date}
                            data-ocid={`consumption.row.${siteUnit}.${row.date}`}
                          >
                            <TableCell className="text-sm font-medium">
                              {formatDisplayDate(row.date)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-primary">
                              {fmt(row.productionQtyMT)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {row.entryCount}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/40 font-semibold">
                          <TableCell className="text-sm">Subtotal</TableCell>
                          <TableCell className="text-right text-sm text-primary">
                            {fmt(siteTotal)} MT
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {rows.reduce((s, r) => s + r.entryCount, 0)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Grand Total \u2014 All Sites
                </span>
                <span className="text-lg font-bold text-primary">
                  {fmt(totalQty)} MT
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
