import {
  alnumOnly,
  clearPendingReview,
  getPendingReview,
  normalizeText,
  type PendingReview,
} from "./shared";

const POLL_INTERVAL_MS = 1000;
const TIMEOUT_MS = 60 * 1000;
const OVERLAY_ID = "gtl-linear-overlay";

function isReviewsPage(): boolean {
  return /^\/[^/]+\/reviews(\/|$)/.test(location.pathname);
}

// --- Overlay ---------------------------------------------------------------

function showOverlay(html: string, withDismiss = false): void {
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = [
      "position:fixed",
      "bottom:16px",
      "right:16px",
      "z-index:2147483647",
      "background:#1f2023",
      "color:#eee",
      "padding:12px 16px",
      "border-radius:8px",
      "font-size:13px",
      "font-family:inherit",
      "max-width:380px",
      "box-shadow:0 4px 16px rgba(0,0,0,.4)",
      "border:1px solid #3a3b40",
    ].join(";");
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = html;
  if (withDismiss) {
    const button = document.createElement("button");
    button.textContent = "Dismiss";
    button.style.cssText =
      "margin-top:8px;display:block;background:#3a3b40;color:#eee;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px";
    button.addEventListener("click", () => overlay.remove());
    overlay.appendChild(button);
  }
}

function removeOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove();
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// --- Matching --------------------------------------------------------------

/**
 * The review link slug is the source branch with non-alphanumerics dropped,
 * plus a trailing 12-hex slugId: /review/featslack-scope-…-903c71c963e7
 */
function hrefMatchesBranch(href: string, branch: string): boolean {
  if (!branch) return false;
  const match = href.match(/\/review\/([^/?#]+)/);
  if (!match) return false;
  const slug = match[1].replace(/-[0-9a-f]{12}$/i, "");
  return alnumOnly(slug) === alnumOnly(branch);
}

function findReviewLink(pending: PendingReview): HTMLAnchorElement | null {
  const wantedTitle = normalizeText(pending.title);
  const anchors = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/review/"]'
  );
  for (const anchor of anchors) {
    if (normalizeText(anchor.textContent ?? "").includes(wantedTitle)) {
      return anchor;
    }
  }
  for (const anchor of anchors) {
    if (hrefMatchesBranch(anchor.getAttribute("href") ?? "", pending.branch)) {
      return anchor;
    }
  }
  return null;
}

// --- Poll loop -------------------------------------------------------------

async function run(): Promise<void> {
  if (!isReviewsPage()) return;
  const pending = await getPendingReview();
  if (!pending) return;

  showOverlay(
    `Looking for <b>${escapeHtml(pending.title)}</b>…<br><span style="opacity:.7">waiting for Linear to sync the PR</span>`
  );

  const startedAt = Date.now();
  const timer = setInterval(async () => {
    const link = findReviewLink(pending);
    if (link) {
      clearInterval(timer);
      await clearPendingReview();
      removeOverlay();
      link.click(); // SPA navigation
      return;
    }
    if (Date.now() - startedAt >= TIMEOUT_MS) {
      clearInterval(timer);
      await clearPendingReview();
      showOverlay(
        `Couldn't find <b>${escapeHtml(pending.title)}</b> in Linear after 1 minute.<br><span style="opacity:.7">Linear may not have synced it yet — retry from GitHub.</span>`,
        true
      );
    }
  }, POLL_INTERVAL_MS);
}

void run();
