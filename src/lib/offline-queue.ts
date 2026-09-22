const KEY = "vaxaqua:queue:v2";
const LEGACY = "vaxaqua:queue:v1";

export type QueuedRequest = {
  id: string;
  method: string;
  url: string;
  body?: unknown;
  at: number;
};

export type FlushResult = {
  flushed: number;
  remain: number;
  dropped: number;
  unauthorized: boolean;
};

type Envelope = { v: 2; iv: string; ct: string };

let cryptoKey: CryptoKey | null = null;
let cached: QueuedRequest[] | null = null;

function b64ToBytes(value: string) {
  const bin = atob(value);
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}

function bytesToB64(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  view.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

export async function setQueueKey(raw: string) {
  if (typeof window === "undefined" || !raw) return;
  const bytes = b64ToBytes(raw).subarray(0, 32);
  cryptoKey = await crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
  const current = await read();
  cached = current;
  await write(current);
}

export function clearQueueKey() {
  cryptoKey = null;
  cached = null;
}

async function decryptEnvelope(raw: string): Promise<QueuedRequest[]> {
  if (!cryptoKey) return [];
  const env = JSON.parse(raw) as Envelope;
  if (env.v !== 2 || !env.iv || !env.ct) return [];
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(env.iv) },
    cryptoKey,
    b64ToBytes(env.ct),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as QueuedRequest[];
}

async function read(): Promise<QueuedRequest[]> {
  if (typeof window === "undefined") return [];
  if (cached) return cached;
  try {
    const legacy = localStorage.getItem(LEGACY);
    if (legacy) {
      const items = JSON.parse(legacy) as QueuedRequest[];
      localStorage.removeItem(LEGACY);
      cached = items;
      return items;
    }
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    if (!cryptoKey) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as QueuedRequest[];
      return [];
    }
    cached = await decryptEnvelope(raw);
    return cached;
  } catch {
    return [];
  }
}

async function write(items: QueuedRequest[]) {
  const clipped = items.slice(-200);
  cached = clipped;
  if (typeof window === "undefined") return;
  if (!cryptoKey) {
    localStorage.setItem(KEY, JSON.stringify(clipped));
    return;
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    new TextEncoder().encode(JSON.stringify(clipped)),
  );
  localStorage.setItem(KEY, JSON.stringify({ v: 2, iv: bytesToB64(iv), ct: bytesToB64(ct) }));
}

export async function enqueue(req: Omit<QueuedRequest, "id" | "at">) {
  const items = await read();
  items.push({ ...req, id: crypto.randomUUID(), at: Date.now() });
  await write(items);
}

export function queuedCount() {
  return cached?.length ?? 0;
}

export async function flushQueue(): Promise<FlushResult> {
  const items = await read();
  const remain: QueuedRequest[] = [];
  let flushed = 0;
  let dropped = 0;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.body ? { "Content-Type": "application/json" } : undefined,
        body: item.body ? JSON.stringify(item.body) : undefined,
      });
      if (res.status === 401 || res.status === 403) {
        remain.push(...items.slice(i));
        await write(remain);
        return { flushed, remain: remain.length, dropped, unauthorized: true };
      }
      if (!res.ok && (res.status >= 500 || res.status === 429 || res.status === 409)) {
        remain.push(item);
      } else if (!res.ok) {
        dropped += 1;
      } else {
        flushed += 1;
      }
    } catch {
      remain.push(item);
    }
  }
  await write(remain);
  return { flushed, remain: remain.length, dropped, unauthorized: false };
}

export class OfflineQueuedError extends Error {
  constructor() {
    super("offline_queued");
    this.name = "OfflineQueuedError";
  }
}
