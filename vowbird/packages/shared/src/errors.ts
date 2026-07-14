import type { ZodError } from "zod";

type ZodFlattened = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

const FIELD_LABELS: Record<string, string> = {
  inviteCode: "Invite code",
  reportedUserId: "User",
  blockedUserId: "User",
  password: "Password",
  email: "Email",
  username: "Username",
  title: "Title",
  reason: "Reason",
  details: "Details",
  body: "Message",
};

function friendlyFieldMessage(field: string, message: string): string {
  const label = FIELD_LABELS[field] || field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
  const lower = message.toLowerCase();

  if (field === "inviteCode") {
    if (lower.includes("at least") || lower.includes("required") || lower.includes("expected")) {
      return "Enter a valid invite code";
    }
  }
  if (lower.includes("required") || lower.includes("expected string") || lower.includes("invalid_type")) {
    return `${label} is required`;
  }
  if (lower.includes("at least")) {
    return `${label} is too short`;
  }
  if (lower.includes("at most") || lower.includes("too long")) {
    return `${label} is too long`;
  }
  if (lower.includes("invalid email")) {
    return "Enter a valid email address";
  }

  return `${label}: ${message}`;
}

function isZodFlattened(value: unknown): value is ZodFlattened {
  return (
    !!value &&
    typeof value === "object" &&
    ("fieldErrors" in value || "formErrors" in value)
  );
}

/** Turn API / Zod error payloads into a short message safe to show users. */
export function formatUserFacingApiError(
  payload: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (payload == null) return fallback;

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return formatUserFacingApiError(JSON.parse(trimmed), fallback);
      } catch {
        return trimmed || fallback;
      }
    }
    return trimmed || fallback;
  }

  if (typeof payload !== "object") {
    return fallback;
  }

  const obj = payload as Record<string, unknown>;

  if ("error" in obj) {
    return formatUserFacingApiError(obj.error, fallback);
  }

  if (isZodFlattened(obj)) {
    const formErrors = Array.isArray(obj.formErrors)
      ? obj.formErrors.filter((m): m is string => typeof m === "string" && m.length > 0)
      : [];
    if (formErrors[0]) return formErrors[0];

    const fieldErrors = obj.fieldErrors || {};
    const messages: string[] = [];
    for (const [field, errs] of Object.entries(fieldErrors)) {
      if (!errs?.length) continue;
      messages.push(friendlyFieldMessage(field, errs[0]!));
    }
    if (messages.length) return messages.join(". ");
  }

  const message = (obj as { message?: unknown }).message;
  if (typeof message === "string" && message.trim()) {
    return formatUserFacingApiError(message, fallback);
  }

  return fallback;
}

export function zodErrorToMessage(error: ZodError): string {
  return formatUserFacingApiError(error.flatten());
}
