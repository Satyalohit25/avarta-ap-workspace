import { useEffect, useState, FormEvent, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  FileCheck2,
  Sparkles,
  Search,
  X,
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { SkeletonRows } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { Sheet } from "../../components/ui/Sheet";
import { Button } from "../../components/ui/Button";
import { Tabs } from "../../components/ui/Tabs";
import { Alert } from "../../components/ui/Alert";
import { Input } from "../../components/ui/Input";
import { Pagination } from "../../components/ui/Pagination";
import { useToast } from "../../components/ui/ToastContext";
import { PageHeader } from "../../components/layout/PageHeader";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../../components/ui/table";
import { Card } from "../../components/ui/Card";

interface ExceptionRow {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  vendor: string;
  type: string;
  title: string;
  severity: string;
  status: string;
  owner: string | null;
  createdAt: string;
}

const RESOLUTION_PRESETS = [
  "Vendor confirmed updated PO pricing via email.",
  "PO quantity variance authorized by procurement.",
  "Discretionary manager tolerance applied per AP policy.",
  "Duplicate check verified: distinct billing period and services.",
];

export default function ExceptionsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedException, setSelectedException] = useState<ExceptionRow | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolutionBanner, setResolutionBanner] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  function load() {
    setLoading(true);
    apiRequest<{ data: ExceptionRow[] }>("/exceptions")
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (severityFilter === "HIGH") {
      list = list.filter((r) => r.severity === "HIGH" || r.severity === "CRITICAL");
    } else if (severityFilter === "MEDIUM") {
      list = list.filter((r) => r.severity === "MEDIUM" || r.severity === "LOW");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.invoiceNumber.toLowerCase().includes(q) ||
          r.vendor.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          (r.title && r.title.toLowerCase().includes(q))
      );
    }

    return list;
  }, [rows, severityFilter, searchQuery]);

  // Pagination
  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  function handleTabChange(tabId: string) {
    setSeverityFilter(tabId);
    setCurrentPage(1);
  }

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    setCurrentPage(1);
  }

  async function handleResolve(e: FormEvent) {
    e.preventDefault();
    if (!selectedException || !resolutionNote.trim()) return;
    const invNumber = selectedException.invoiceNumber;
    const vendor = selectedException.vendor;
    setSubmitting(true);
    try {
      await apiRequest(`/exceptions/${selectedException.id}/resolve`, {
        method: "POST",
        body: { resolution: resolutionNote.trim() },
      });
      toast.success(
        "Exception Resolved",
        `Exception for Invoice ${invNumber} (${vendor}) resolved. Invoice rejoined workflow for approval.`
      );
      setResolutionBanner({
        type: "success",
        title: "Exception Resolved",
        message: `Exception for Invoice ${invNumber} (${vendor}) resolved. Invoice rejoined workflow for approval.`,
      });
      setSelectedException(null);
      setResolutionNote("");
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record resolution.";
      toast.error("Resolution Failed", msg);
      setResolutionBanner({
        type: "error",
        title: "Resolution Failed",
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function renderSeverityBadge(severity: string) {
    switch (severity) {
      case "HIGH":
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-semibold bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300">
            <AlertOctagon size={12} />
            <span>HIGH</span>
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
            <AlertTriangle size={12} />
            <span>MEDIUM</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-semibold bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300">
            <AlertCircle size={12} />
            <span>LOW</span>
          </span>
        );
    }
  }

  return (
    <div className="space-y-5 pb-16">
      <PageHeader
        title="Exceptions"
        subtitle="Invoices flagged by validation or matching rules requiring human resolution."
      />

      {resolutionBanner && (
        <Alert
          type={resolutionBanner.type}
          title={resolutionBanner.title}
          action={
            <button
              type="button"
              onClick={() => setResolutionBanner(null)}
              className="text-micro font-mono hover:underline px-2 py-0.5"
            >
              Dismiss
            </button>
          }
        >
          {resolutionBanner.message}
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: "ALL", label: `All Exceptions (${rows.length})`, content: null },
            {
              id: "HIGH",
              label: `High Severity (${rows.filter((r) => r.severity === "HIGH" || r.severity === "CRITICAL").length})`,
              content: null,
            },
            {
              id: "MEDIUM",
              label: `Medium / Low (${rows.filter((r) => r.severity === "MEDIUM" || r.severity === "LOW").length})`,
              content: null,
            },
          ]}
          defaultTabId={severityFilter}
          variant="pill"
          onChange={handleTabChange}
        />

        <div className="relative w-full sm:w-72">
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Filter exceptions by # or vendor..."
            leftIcon={<Search size={14} className="text-neutral-400" />}
            rightIcon={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
              ) : undefined
            }
          />
        </div>
      </div>

      <Card level="surface" className="overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonRows />
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="No open exceptions match your criteria."
            description={
              searchQuery
                ? `No exceptions matching "${searchQuery}".`
                : "All flagged discrepancies in this category have been resolved."
            }
            action={
              searchQuery
                ? {
                    label: "Clear Search",
                    onClick: () => handleSearchChange(""),
                  }
                : undefined
            }
          />
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Exception Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((ex) => (
                  <TableRow key={ex.id}>
                    <TableCell className="font-mono font-medium">
                      <Link
                        to={`/invoices/${ex.invoiceId}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {ex.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-neutral-800 dark:text-zinc-200 font-medium">
                      {ex.vendor}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-micro bg-neutral-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-neutral-800 dark:text-zinc-200">
                        {ex.type}
                      </span>
                    </TableCell>
                    <TableCell>{renderSeverityBadge(ex.severity)}</TableCell>
                    <TableCell>
                      <StatusBadge status={ex.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedException(ex);
                          setResolutionNote("");
                        }}
                        className="h-7 text-caption"
                      >
                        Resolve Exception
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              pageSizeOptions={[10, 25, 50]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </Card>

      {/* Exception Resolution Slide-Out Sheet */}
      <Sheet
        isOpen={Boolean(selectedException)}
        onClose={() => {
          if (!submitting) setSelectedException(null);
        }}
        title={`Resolve Exception: ${selectedException?.type || ""}`}
        subtitle={`Invoice ${selectedException?.invoiceNumber} • ${selectedException?.vendor}`}
      >
        {selectedException && (
          <form onSubmit={handleResolve} className="space-y-5 pt-2">
            <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-zinc-800/80 border border-neutral-200 dark:border-zinc-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-caption font-semibold text-neutral-700 dark:text-zinc-300">
                  Exception Description
                </span>
                {renderSeverityBadge(selectedException.severity)}
              </div>
              <p className="text-body-sm font-medium text-neutral-900 dark:text-zinc-100">
                {selectedException.title || `Validation failure on rule ${selectedException.type}`}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Link
                  to={`/invoices/${selectedException.invoiceId}`}
                  target="_blank"
                  className="text-micro text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Open Full Invoice Workspace</span>
                  <span>↗</span>
                </Link>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="resolutionNote"
                  className="text-body-sm font-medium text-neutral-800 dark:text-zinc-200"
                >
                  Resolution Justification (Audit Required)
                </label>
                <span className="text-micro text-neutral-500 dark:text-zinc-400">
                  Minimum 10 characters
                </span>
              </div>

              {/* Resolution Presets */}
              <div className="space-y-1">
                <span className="text-micro text-neutral-500 dark:text-zinc-400 flex items-center gap-1">
                  <Sparkles size={11} className="text-indigo-500" />
                  <span>Standard AP Policy Presets:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {RESOLUTION_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setResolutionNote(preset)}
                      className="text-micro px-2 py-1 rounded bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-neutral-700 dark:text-zinc-300 transition-colors text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                id="resolutionNote"
                rows={4}
                required
                minLength={10}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Enter specific audit trail justification for overriding or clearing this discrepancy..."
                className="w-full px-3 py-2 text-body-sm rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 text-micro text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                Resolving will re-evaluate invoice validation and rejoin the main linear workflow
                for authorized approval release.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedException(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || resolutionNote.trim().length < 10}
                isLoading={submitting}
                className="gap-1.5"
              >
                <FileCheck2 size={15} />
                <span>Confirm Resolution</span>
              </Button>
            </div>
          </form>
        )}
      </Sheet>
    </div>
  );
}
