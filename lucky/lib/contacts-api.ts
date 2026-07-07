const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type UploadContactsResult = {
  saved: number;
  skipped: number;
};

export async function uploadContactsCsv(
  file: File,
): Promise<UploadContactsResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/messenger/juso/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(detail);
  }

  return (await res.json()) as UploadContactsResult;
}
