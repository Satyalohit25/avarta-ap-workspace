import { API_URL, getAccessToken } from "./client";

export type ExportDataset = "invoices" | "suppliers" | "payments";

export interface ExportDownload {
  filename: string;
  rowCount: number;
  truncated: boolean;
}

/**
 * Downloads a tenant-scoped CSV export through the API so the server can
 * enforce role checks, tenant isolation, and write an audit event. The
 * invoice/supplier/payment registers never leave the browser as raw JSON.
 */
export async function downloadDataExport(dataset: ExportDataset): Promise<ExportDownload> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/data-export/${dataset}`, {
    method: "GET",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? "The export could not be generated.");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filenameMatch = /filename="([^"]+)"/.exec(disposition);
  const filename = filenameMatch?.[1] ?? `avarta-${dataset}.csv`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);

  return {
    filename,
    rowCount: Number(res.headers.get("X-Export-Row-Count") ?? 0),
    truncated: res.headers.get("X-Export-Truncated") === "true",
  };
}
