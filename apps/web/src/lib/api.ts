const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// ── Types mirrored from the API ───────────────────────────────────────────

export interface DocumentMeta {
  document_id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  uploaded_at: string;
  status: "indexed" | "processing" | "failed";
}

export interface UploadResponse {
  document_id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  status: string;
}

export interface Citation {
  index: number;
  document_id: string;
  filename: string;
  page: number;
  excerpt: string;
  relevance_score: number;
}

export interface AgentTraceStep {
  name: "PLAN" | "RETRIEVE" | "REASON" | "TOOL" | "VERIFY";
  status: "complete" | "active" | "pending" | "error";
  description: string;
  duration_ms: number | null;
  payload?: object;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  confidence: number;
  hallucination_risk: "low" | "medium" | "high";
  trace: AgentTraceStep[];
  conversation_id: string;
}

// ── API functions ─────────────────────────────────────────────────────────

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  return request<UploadResponse>("/documents/upload", {
    method: "POST",
    body: form,
  });
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  return request<DocumentMeta[]>("/documents");
}

export async function getDocument(docId: string): Promise<DocumentMeta> {
  return request<DocumentMeta>(`/documents/${docId}`);
}

export async function deleteDocument(docId: string): Promise<void> {
  await request(`/documents/${docId}`, { method: "DELETE" });
}

export async function sendChat(
  query: string,
  documentIds: string[],
  conversationId?: string
): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      document_ids: documentIds,
      conversation_id: conversationId ?? null,
    }),
  });
}
