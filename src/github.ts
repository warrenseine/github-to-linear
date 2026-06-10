import type { OpenLinearMessage } from "./shared";

const TAB_ID = "gtl-view-in-linear-tab";

// Linear logo glyph (viewBox 0 0 100 100), official mark — same path as icons/linear.svg
const LINEAR_LOGO_PATH =
  "M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3541-.0443L12.6587 18.074Z";

const LINEAR_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 100 100" aria-hidden="true" style="margin-right:8px;flex-shrink:0;vertical-align:text-bottom"><path d="${LINEAR_LOGO_PATH}" fill="currentColor"/></svg>`;

function isPrPage(): boolean {
  return /^\/[^/]+\/[^/]+\/pull\/\d+/.test(location.pathname);
}

function prBaseUrl(): string {
  const match = location.pathname.match(/^(\/[^/]+\/[^/]+\/pull\/\d+)/);
  return match ? `${location.origin}${match[1]}` : location.href;
}

function waitFor<T>(
  probe: () => T | null | undefined,
  timeoutMs: number,
  intervalMs = 100
): Promise<T | null> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const tick = () => {
      const result = probe();
      if (result) return resolve(result);
      if (Date.now() - startedAt >= timeoutMs) return resolve(null);
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

function showToast(message: string, isError = false): void {
  document.getElementById("gtl-toast")?.remove();
  const toast = document.createElement("div");
  toast.id = "gtl-toast";
  toast.textContent = message;
  toast.style.cssText = [
    "position:fixed",
    "bottom:16px",
    "right:16px",
    "z-index:2147483647",
    `background:${isError ? "#cf222e" : "#1f2328"}`,
    "color:#fff",
    "padding:10px 14px",
    "border-radius:8px",
    "font-size:13px",
    "max-width:360px",
    "box-shadow:0 4px 12px rgba(0,0,0,.3)",
  ].join(";");
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

// --- PR metadata -----------------------------------------------------------

function getCurrentUsername(): string | null {
  return (
    document
      .querySelector<HTMLMetaElement>('meta[name="user-login"]')
      ?.content?.trim() || null
  );
}

function getPrTitle(): string | null {
  const selectors = [
    'h1[class*="PageHeader-Title"] .markdown-title',
    '[data-testid="issue-title"]',
    "bdi.js-issue-title",
    ".js-issue-title",
    ".gh-header-title .markdown-title",
  ];
  for (const selector of selectors) {
    const text = document.querySelector(selector)?.textContent?.trim();
    if (text) return text;
  }
  return null;
}

function getHeadBranch(): string | null {
  let text: string | undefined;

  // New React UI: BranchName anchors render as "base, head" pairs
  const branchNames = [
    ...document.querySelectorAll<HTMLElement>(
      'a[class*="branchName"], a[class*="BranchName"]'
    ),
  ].map((el) => el.textContent?.trim() ?? "");
  if (branchNames.length > 0) {
    // head = first entry that differs from the base (first entry)
    text = branchNames.find((name) => name && name !== branchNames[0]);
    text ??= branchNames[0];
  }

  if (!text) {
    const selectors = [".head-ref", '[data-testid="head-ref"]'];
    for (const selector of selectors) {
      text = document.querySelector(selector)?.textContent?.trim();
      if (text) break;
    }
  }
  if (!text) {
    // classic UI: base ref comes first, head ref second
    const refs = document.querySelectorAll(".commit-ref");
    text = refs[1]?.textContent?.trim();
  }
  if (!text) return null;
  // cross-repo PRs render as "owner:branch"
  return text.includes(":") ? text.slice(text.indexOf(":") + 1) : text;
}

function getPrAuthor(): string | null {
  const selectors = [
    ".gh-header-meta a.author",
    '[data-testid="issue-body-header"] a[data-hovercard-type="user"]',
    ".timeline-comment-header a.author",
  ];
  for (const selector of selectors) {
    const text = document.querySelector(selector)?.textContent?.trim();
    if (text) return text;
  }
  return null;
}

// --- Reviewers sidebar -----------------------------------------------------

function findReviewersSection(): HTMLElement | null {
  // Classic UI: .discussion-sidebar-item with a "Reviewers" heading
  for (const item of document.querySelectorAll<HTMLElement>(
    ".discussion-sidebar-item"
  )) {
    const heading = item.querySelector(".discussion-sidebar-heading");
    if (heading?.textContent?.trim().startsWith("Reviewers")) return item;
  }
  // New React UI / generic: any small heading whose text is exactly "Reviewers"
  for (const heading of document.querySelectorAll<HTMLElement>(
    "h2, h3, span, div"
  )) {
    if (heading.childElementCount > 0) continue;
    if (heading.textContent?.trim() !== "Reviewers") continue;
    const section = heading.closest<HTMLElement>(
      '[data-testid*="sidebar"], section, .discussion-sidebar-item'
    );
    if (section) return section;
  }
  return null;
}

function isListedAsReviewer(section: HTMLElement, username: string): boolean {
  const userPath = `/${username}`.toLowerCase();
  for (const anchor of section.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    try {
      if (new URL(anchor.href).pathname.toLowerCase() === userPath) return true;
    } catch {
      // ignore unparsable hrefs
    }
  }
  return false;
}

async function assignViaClassicMenu(
  section: HTMLElement,
  username: string
): Promise<boolean> {
  const details = section.querySelector<HTMLDetailsElement>("details");
  const summary = details?.querySelector<HTMLElement>("summary");
  if (!details || !summary) return false;

  summary.click(); // opens the menu and triggers the lazy include-fragment load

  const item = await waitFor(() => {
    for (const candidate of details.querySelectorAll<HTMLElement>(
      "label.select-menu-item, .select-menu-item, [role='menuitemcheckbox']"
    )) {
      const login =
        candidate.querySelector(".js-username")?.textContent?.trim() ??
        candidate.textContent?.trim().split(/\s+/)[0];
      if (login?.toLowerCase() === username.toLowerCase()) return candidate;
    }
    return null;
  }, 6000);

  if (!item) {
    if (details.open) summary.click();
    return false;
  }

  item.click();
  // Classic UI submits reviewer changes when the menu closes
  if (details.open) summary.click();
  return true;
}

async function assignViaReactDialog(
  section: HTMLElement,
  username: string
): Promise<boolean> {
  const editButton =
    section.querySelector<HTMLElement>(
      'button[aria-label*="reviewer" i], button[aria-label*="Reviewers" i]'
    ) ??
    [...section.querySelectorAll<HTMLElement>("button")].find((button) =>
      /edit/i.test(button.textContent ?? "")
    ) ??
    null;
  if (!editButton) return false;

  editButton.click();

  const filterInput = await waitFor(
    () =>
      document.querySelector<HTMLInputElement>(
        '[role="dialog"] input[type="text"], [role="dialog"] input:not([type]), [data-testid*="picker"] input'
      ),
    3000
  );
  if (filterInput) {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;
    valueSetter?.call(filterInput, username);
    filterInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const option = await waitFor(() => {
    for (const candidate of document.querySelectorAll<HTMLElement>(
      '[role="dialog"] [role="option"], [role="listbox"] [role="option"]'
    )) {
      if (
        candidate.textContent?.toLowerCase().includes(username.toLowerCase())
      ) {
        return candidate;
      }
    }
    return null;
  }, 6000);

  if (!option) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    return false;
  }

  option.click();
  // Close the picker so the change is saved
  (filterInput ?? option).dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  );
  document
    .querySelector<HTMLElement>('[role="dialog"] button[aria-label*="lose" i]')
    ?.click();
  return true;
}

/**
 * Best-effort: make sure the current user is a reviewer. Returns true when the
 * user is (or just became) a reviewer; false means "couldn't do it via DOM".
 */
async function ensureReviewer(username: string): Promise<boolean> {
  const section = findReviewersSection();
  if (!section) return false;
  if (isListedAsReviewer(section, username)) return true;

  const assigned =
    (await assignViaClassicMenu(section, username)) ||
    (await assignViaReactDialog(section, username));
  if (!assigned) return false;

  // GitHub updates the sidebar asynchronously after the menu closes
  const confirmed = await waitFor(() => {
    const freshSection = findReviewersSection();
    return freshSection && isListedAsReviewer(freshSection, username)
      ? true
      : null;
  }, 8000, 250);
  return confirmed === true;
}

// --- Click flow ------------------------------------------------------------

let clickInFlight = false;

async function onTabClick(_tab: HTMLElement, label: HTMLElement): Promise<void> {
  if (clickInFlight) return;
  clickInFlight = true;
  const originalText = label.textContent;
  label.textContent = "Opening Linear…";

  try {
    const title = getPrTitle();
    const username = getCurrentUsername();
    const branch = getHeadBranch() ?? "";

    if (!title) {
      showToast("Couldn't read the PR title — aborting.", true);
      return;
    }

    if (username) {
      const author = getPrAuthor();
      const isAuthor =
        author !== null && author.toLowerCase() === username.toLowerCase();
      if (!isAuthor) {
        const ok = await ensureReviewer(username);
        if (!ok) {
          showToast(
            "Couldn't auto-assign you as reviewer — add yourself manually. Opening Linear anyway…",
            true
          );
        }
      }
    }

    const message: OpenLinearMessage = {
      type: "open-linear",
      title,
      branch,
      prUrl: prBaseUrl(),
    };
    await chrome.runtime.sendMessage(message);
  } finally {
    label.textContent = originalText;
    clickInFlight = false;
  }
}

// --- Tab injection ---------------------------------------------------------

/**
 * The most stable anchor across GitHub's UI variants is the "Files changed"
 * tab itself: an <a> inside the PR tablist whose pathname is "<pr>/changes"
 * (new React UI) or "<pr>/files" (classic UI).
 */
function findFilesTab(): HTMLAnchorElement | null {
  const prPath = location.pathname.match(/^(\/[^/]+\/[^/]+\/pull\/\d+)/)?.[1];
  if (!prPath) return null;
  const targets = new Set([`${prPath}/changes`, `${prPath}/files`]);
  const matches: HTMLAnchorElement[] = [];
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/changes"], a[href*="/files"]'
  )) {
    try {
      if (targets.has(new URL(anchor.href).pathname)) matches.push(anchor);
    } catch {
      // ignore unparsable hrefs
    }
  }
  // Prefer the one inside the actual tab nav over inline text links
  return (
    matches.find((anchor) => anchor.closest('[role="tablist"], .tabnav')) ??
    null
  );
}

function injectTab(): void {
  if (!isPrPage()) {
    document.getElementById(TAB_ID)?.remove();
    return;
  }
  if (document.getElementById(TAB_ID)) return;

  const filesTab = findFilesTab();
  if (!filesTab) {
    console.debug("[gtl] Files changed tab not found, cannot inject");
    return;
  }

  const tab = document.createElement("a");
  tab.id = TAB_ID;
  tab.href = "#";
  tab.className = filesTab.className;
  tab.classList.remove("selected");
  tab.removeAttribute("aria-current");
  tab.setAttribute("aria-selected", "false");
  tab.innerHTML = LINEAR_ICON_SVG;
  const label = document.createElement("span");
  label.textContent = "View in Linear";
  tab.appendChild(label);
  tab.style.cursor = "pointer";

  tab.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void onTabClick(tab, label);
  });

  // Mirror the structure of the Files changed tab (it may sit inside an <li>)
  const filesItem = filesTab.closest("li");
  if (filesItem && filesItem.parentElement) {
    const li = document.createElement("li");
    li.className = filesItem.className;
    li.appendChild(tab);
    filesItem.insertAdjacentElement("afterend", li);
  } else {
    filesTab.insertAdjacentElement("afterend", tab);
  }
  console.debug("[gtl] tab injected");
}

function watchForNavigation(): void {
  injectTab();
  document.addEventListener("turbo:load", () => injectTab());
  document.addEventListener("pjax:end", () => injectTab());

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      injectTab();
    }, 300);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

watchForNavigation();
