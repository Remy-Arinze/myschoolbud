/**
 * Client-side helpers for Lois (AI chat) errors: SSE payloads, HTTP failures, and RTK errors.
 */

export type AiChatErrorCode =
  | 'LOIS_UNAVAILABLE'
  | 'LOIS_RATE_LIMIT'
  | 'LOIS_CONTEXT_LENGTH'
  | 'LOIS_PROVIDER'
  | 'LOIS_CREDITS'
  | 'LOIS_PERMISSION'
  | 'LOIS_VALIDATION'
  | 'LOIS_UNKNOWN'
  | 'LOIS_HTTP'
  | 'LOIS_NETWORK'
  | string;

export interface AiChatStreamErrorPayload {
  code?: AiChatErrorCode;
  message: string;
  title?: string;
}

const DEFAULT_MESSAGE = 'Something went wrong with Lois. Please try again.';

/** Normalize backend SSE `error` events (supports legacy `{ message }` only). */
export function normalizeSseErrorData(parsed: unknown): AiChatStreamErrorPayload {
  if (parsed && typeof parsed === 'object' && parsed !== null) {
    const p = parsed as Record<string, unknown>;
    const rawMsg = p.message;
    const message =
      typeof rawMsg === 'string'
        ? rawMsg
        : Array.isArray(rawMsg)
          ? rawMsg.map(String).join(' ')
          : DEFAULT_MESSAGE;
    return {
      code: typeof p.code === 'string' ? (p.code as AiChatErrorCode) : undefined,
      title: typeof p.title === 'string' ? p.title : undefined,
      message: message.trim() || DEFAULT_MESSAGE,
    };
  }
  if (typeof parsed === 'string' && parsed.trim()) {
    return { message: parsed.trim() };
  }
  return { code: 'LOIS_UNKNOWN', message: DEFAULT_MESSAGE };
}

/** Map failed fetch (before SSE) to a friendly payload. */
export function streamErrorPayloadFromHttp(status: number, bodyText: string): AiChatStreamErrorPayload {
  let message = 'Could not start a reply from Lois. Please try again.';
  let title: string | undefined;
  let code: AiChatErrorCode = 'LOIS_HTTP';

  try {
    const j = JSON.parse(bodyText) as { message?: string | string[] };
    if (j?.message != null) {
      message = Array.isArray(j.message) ? j.message.join(' ') : String(j.message);
    }
  } catch {
    if (bodyText?.trim()) {
      message = bodyText.trim().slice(0, 280);
    }
  }

  const lower = message.toLowerCase();

  if (status === 401) {
    title = 'Session expired';
    message = 'Please sign in again to continue chatting.';
  } else if (status === 403) {
    title = 'Access denied';
    code = 'LOIS_PERMISSION';
    if (!message || message.length < 3) {
      message = 'You do not have permission to use Lois for this school.';
    }
  } else if (status === 404) {
    title = 'Not found';
    message = 'The chat service was not found. Try refreshing the page.';
  } else if (status === 429) {
    title = 'Too many requests';
    code = 'LOIS_RATE_LIMIT';
    message = 'You are sending messages too quickly. Wait a moment and try again.';
  } else if (status >= 500) {
    title = 'Server issue';
    code = 'LOIS_PROVIDER';
    message = 'Lois is having a temporary problem. Please try again shortly.';
  } else if (status === 400) {
    title = 'Request issue';
    code = 'LOIS_VALIDATION';
    if (lower.includes('credit') || lower.includes('subscription') || lower.includes('upgrade')) {
      code = 'LOIS_CREDITS';
      title = 'Credits or plan';
    }
  }

  return { code, message, title };
}

/** Single string for react-hot-toast (title + body when both are useful). */
export function toastTextFromStreamError(p: AiChatStreamErrorPayload): string {
  if (p.title && p.message && p.title !== p.message) {
    return `${p.title}: ${p.message}`;
  }
  return p.message;
}

/** Inline assistant text when the stream fails (readable in the thread). */
export function inlineAssistantErrorNote(p: AiChatStreamErrorPayload): string {
  const line = p.title ? `${p.title} — ${p.message}` : p.message;
  return `Sorry — ${line}`;
}

/** Normalize RTK Query / unwrap() errors from non-stream AI endpoints. */
export function streamErrorFromRtk(error: unknown): AiChatStreamErrorPayload {
  const e = error as {
    status?: number | string;
    data?: { message?: string | string[]; error?: string };
    message?: string;
  };

  const raw =
    e?.data?.message != null
      ? Array.isArray(e.data.message)
        ? e.data.message.join(' ')
        : String(e.data.message)
      : e?.message || 'Failed to get AI response';

  if (e?.status === 'FETCH_ERROR' || e?.status === 'PARSING_ERROR') {
    return {
      code: 'LOIS_NETWORK',
      title: 'Connection',
      message: "We could not reach Myschoolbud. Check your connection and try again.",
    };
  }

  const status = typeof e?.status === 'number' ? e.status : undefined;
  if (status != null) {
    return streamErrorPayloadFromHttp(status, JSON.stringify({ message: raw }));
  }

  const lower = raw.toLowerCase();
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('failed to fetch')) {
    return {
      code: 'LOIS_NETWORK',
      title: 'Connection',
      message: "We could not reach Myschoolbud. Check your connection and try again.",
    };
  }

  return { code: 'LOIS_UNKNOWN', message: raw };
}
