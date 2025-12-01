import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generic utilities and React hooks used across the app.
 * Keep this file dependency-free for easy reuse.
 */

/* ============================
    Configuration
    ============================ */

export const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "";

export const cn = (...parts: Array<string | false | null | undefined>) =>
    parts.filter(Boolean).join(" ");

/* ============================
    Types
    ============================ */

export type RequestOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: any;
  params?: Record<string, string | number | boolean>;
  skipAuth?: boolean;
  timeout?: number; // ms
  signal?: AbortSignal;
};

export type ApiError = {
  status: number;
  message: string;
  body?: any;
};

/* ============================
    Small helpers
    ============================ */

export const isEmpty = (v: any) =>
  v === null ||
  v === undefined ||
  (typeof v === "string" && v.trim() === "") ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);

export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export const capitalize = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export const slugify = (s: string) =>
  s
     .toLowerCase()
     .trim()
     .replace(/[^a-z0-9]+/g, "-")
     .replace(/(^-|-$)+/g, "");

export const classNames = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export const uid = () =>
  typeof crypto !== "undefined" && (crypto as any).randomUUID
     ? (crypto as any).randomUUID()
     : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const deepClone = <T,>(v: T): T =>
  typeof structuredClone !== "undefined" ? structuredClone(v) : JSON.parse(JSON.stringify(v));

/* ============================
    Date / time helpers
    ============================ */

export const formatDate = (d?: Date | string | number, locale = undefined) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleDateString(locale);
};

export const formatDateTime = (d?: Date | string | number, locale = undefined) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleString(locale);
};

export const timeAgo = (d: Date | string | number) => {
  const now = Date.now();
  const t = d instanceof Date ? d.getTime() : +new Date(d);
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const days = Math.floor(hr / 24);
  return `${days}d`;
};

/* ============================
    Timing utilities
    ============================ */

export const debounce = <F extends (...args: any[]) => any>(fn: F, wait = 200) => {
  let t: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<F>) => {
     if (t) clearTimeout(t);
     t = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => {
     if (t) clearTimeout(t);
     t = null;
  };
  return debounced as F & { cancel: () => void };
};

export const throttle = <F extends (...args: any[]) => any>(fn: F, limit = 200) => {
  let inThrottle = false;
  return (...args: Parameters<F>) => {
     if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
     }
  };
};

/* ============================
    Local storage hook
    ============================ */

export function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
     try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : initial;
     } catch {
        return initial;
     }
  });

  useEffect(() => {
     try {
        localStorage.setItem(key, JSON.stringify(state));
     } catch {
        // ignore
     }
  }, [key, state]);

  const remove = useCallback(() => {
     localStorage.removeItem(key);
     setState(initial);
  }, [key, initial]);

  return [state, setState, remove] as const;
}

/* ============================
    Simple hooks
    ============================ */

export function useDebounce<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
     const id = setTimeout(() => setV(value), delay);
     return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export function usePrevious<T>(value: T) {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
     ref.current = value;
  }, [value]);
  return ref.current;
}

export function useInterval(cb: () => void, ms: number | null) {
  const saved = useRef(cb);
  useEffect(() => {
     saved.current = cb;
  }, [cb]);

  useEffect(() => {
     if (ms === null) return;
     const id = setInterval(() => saved.current(), ms);
     return () => clearInterval(id);
  }, [ms]);
}

/* ============================
    Async runner hook
    ============================ */

export function useAsync<T = any>() {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(
     async (promiseFactory: (signal?: AbortSignal) => Promise<T>) => {
        if (controllerRef.current) {
          controllerRef.current.abort();
        }
        controllerRef.current = new AbortController();
        setLoading(true);
        setError(null);
        try {
          const result = await promiseFactory(controllerRef.current.signal);
          setValue(result);
          setLoading(false);
          return result;
        } catch (err) {
          if ((err as any)?.name === "AbortError") {
             // canceled
          } else {
             setError(err);
          }
          setLoading(false);
          throw err;
        }
     },
     []
  );

  const cancel = useCallback(() => {
     controllerRef.current?.abort();
     controllerRef.current = null;
     setLoading(false);
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return { loading, value, error, run, cancel };
}

/* ============================
    Lightweight fetch wrapper
    ============================ */

function buildUrl(path: string, params?: Record<string, string | number | boolean>) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  if (!params || Object.keys(params).length === 0) return url;
  const q = new URLSearchParams();
  for (const k of Object.keys(params)) {
     const v = params[k];
     if (v === undefined || v === null) continue;
     q.append(k, String(v));
  }
  return `${url}${url.includes("?") ? "&" : "?"}${q.toString()}`;
}

export async function apiFetch<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", timeout = 0, headers = {}, body, params, skipAuth, signal } = opts;

  const url = buildUrl(path, params);
  const controller = new AbortController();
  const mergedSignal = signal
     ? new AbortController() // wrap to combine signals
     : controller;

  // combine signals: if external provided, listen and abort our controller (simple approach)
  if (signal) {
     signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const token = !skipAuth ? localStorage.getItem("auth_token") : null;

  const finalHeaders: Record<string, string> = {
     Accept: "application/json",
     ...((headers as Record<string, string>) || {}),
  };

  let payload: BodyInit | undefined = undefined;
  if (body instanceof FormData) {
     payload = body;
     // let browser set content-type
  } else if (body !== undefined) {
     finalHeaders["Content-Type"] =
        finalHeaders["Content-Type"] ?? "application/json; charset=utf-8";
     payload = typeof body === "string" ? body : JSON.stringify(body);
  }

  if (token) {
     finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const fetchPromise = fetch(url, {
     method,
     headers: finalHeaders,
     body: payload,
     signal: controller.signal,
  }).then(async (res) => {
     const contentType = res.headers.get("content-type") || "";
     const isJson = contentType.includes("application/json");
     const text = await res.text();
     const parsed = isJson && text ? JSON.parse(text) : text;

     if (!res.ok) {
        const err: ApiError = {
          status: res.status,
          message:
             (parsed && (parsed.message || parsed.error || parsed.detail)) ||
             res.statusText ||
             "Request failed",
          body: parsed,
        };
        // if unauthorized, clear token and redirect to login
        if (res.status === 401) {
          try {
             localStorage.removeItem("auth_token");
             // best-effort redirect
             if (typeof window !== "undefined") {
                window.location.href = "/login";
             }
          } catch {}
        }
        throw err;
     }
     return parsed as T;
  });

  if (timeout > 0) {
     const timeoutPromise = new Promise<never>((_, rej) =>
        setTimeout(() => {
          controller.abort();
          rej({ name: "TimeoutError", message: "Request timed out" });
        }, timeout)
     );
     return Promise.race([fetchPromise, timeoutPromise]) as Promise<T>;
  }

  return fetchPromise;
}

/* ============================
    Minimal notification helper
    ============================ */

/**
 * showNotification is UI-agnostic. By default it falls back to window.alert.
 * You can override window.__APP_NOTIFY to a function (message, kind) to integrate with your toast system.
 */
export type NotifyKind = "info" | "success" | "warning" | "error";
export const showNotification = (message: string, kind: NotifyKind = "info") => {
  const custom = (window as any).__APP_NOTIFY;
  if (typeof custom === "function") {
     try {
        custom(message, kind);
        return;
     } catch {
        // fallthrough
     }
  }
  // default fallback
  try {
     // keep default short & non-blocking when possible
     if ("Notification" in window && (Notification as any).permission === "granted") {
        // don't await
        new (Notification as any)(capitalize(kind), { body: message });
     } else {
        // fallback simple
        // eslint-disable-next-line no-console
        console[kind === "error" ? "error" : "log"](`[${kind}] ${message}`);
     }
  } catch {
     alert(message);
  }
};

/* ============================
    Exports
    ============================ */

export default {
  API_BASE,
  isEmpty,
  clamp,
  capitalize,
  slugify,
  classNames,
  uid,
  deepClone,
  formatDate,
  formatDateTime,
  timeAgo,
  debounce,
  throttle,
  useLocalStorage,
  useDebounce,
  usePrevious,
  useInterval,
  useAsync,
  apiFetch,
  showNotification,
};