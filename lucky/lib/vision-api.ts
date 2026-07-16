const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.cloverky.cloud";

export async function uploadVisionImage(file: File): Promise<unknown> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/vision/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

export interface Detection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export async function detectFace(file: File): Promise<Detection[]> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/vision/detect`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}
