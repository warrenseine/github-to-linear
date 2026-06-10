export const DEFAULT_WORKSPACE = "hey-pearl";
export const PENDING_KEY = "pendingReview";
export const WORKSPACE_KEY = "workspaceSlug";

/** Max age of a pending lookup before the Linear content script ignores it. */
export const PENDING_TTL_MS = 5 * 60 * 1000;

export interface PendingReview {
  title: string;
  branch: string;
  prUrl: string;
  createdAt: number;
}

export interface OpenLinearMessage {
  type: "open-linear";
  title: string;
  branch: string;
  prUrl: string;
}

export async function getWorkspaceSlug(): Promise<string> {
  const stored = await chrome.storage.sync.get(WORKSPACE_KEY);
  const slug = (stored[WORKSPACE_KEY] as string | undefined)?.trim();
  return slug || DEFAULT_WORKSPACE;
}

export async function getPendingReview(): Promise<PendingReview | null> {
  const stored = await chrome.storage.local.get(PENDING_KEY);
  const pending = stored[PENDING_KEY] as PendingReview | undefined;
  if (!pending) return null;
  if (Date.now() - pending.createdAt > PENDING_TTL_MS) {
    await clearPendingReview();
    return null;
  }
  return pending;
}

export async function setPendingReview(pending: PendingReview): Promise<void> {
  await chrome.storage.local.set({ [PENDING_KEY]: pending });
}

export async function clearPendingReview(): Promise<void> {
  await chrome.storage.local.remove(PENDING_KEY);
}

/** Collapse whitespace, trim, lowercase — for fuzzy-exact title comparison. */
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Strip everything non-alphanumeric, lowercase. Linear builds the review slug
 * from the source branch this way: `feat/slack-scope-x` → `featslack-scope-x`,
 * so comparing alphanumeric-only forms matches reliably.
 */
export function alnumOnly(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}
