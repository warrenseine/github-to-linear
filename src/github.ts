const TAB_ID = "gtl-view-in-linear-tab";

// Linear logo glyph (viewBox 0 0 100 100), official mark — same path as icons/linear.svg
const LINEAR_LOGO_PATH =
  "M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3541-.0443L12.6587 18.074Z";

const LINEAR_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 100 100" aria-hidden="true" style="margin-right:8px;flex-shrink:0;vertical-align:text-bottom"><path d="${LINEAR_LOGO_PATH}" fill="currentColor"/></svg>`;

function prPath(): string | null {
  return location.pathname.match(/^(\/[^/]+\/[^/]+\/pull\/\d+)/)?.[1] ?? null;
}

/**
 * Linear's review URL mirrors the GitHub repo path verbatim:
 * github.com/owner/repo/pull/123 → linear.app/review/owner/repo/pull/123.
 * Linear redirects this to the canonical opaque-slug review, so no lookup or
 * workspace config is needed.
 */
function linearReviewUrl(path: string): string {
  return `https://linear.app/review${path}`;
}

// --- Tab injection ---------------------------------------------------------

/**
 * The most stable anchor across GitHub's UI variants is the "Files changed"
 * tab itself: an <a> inside the PR tablist whose pathname is "<pr>/changes"
 * (new React UI) or "<pr>/files" (classic UI).
 */
function findFilesTab(path: string): HTMLAnchorElement | null {
  const targets = new Set([`${path}/changes`, `${path}/files`]);
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
  const path = prPath();
  if (!path) {
    document.getElementById(TAB_ID)?.remove();
    return;
  }
  if (document.getElementById(TAB_ID)) return;

  const filesTab = findFilesTab(path);
  if (!filesTab) {
    console.debug("[gtl] Files changed tab not found, cannot inject");
    return;
  }

  const tab = document.createElement("a");
  tab.id = TAB_ID;
  tab.href = linearReviewUrl(path);
  tab.target = "_blank";
  tab.rel = "noopener";
  // Clone the Files tab's classes but drop every "selected" marker — the React
  // UI flags the active tab with both `selected` and a hashed
  // `prc-TabNav-Selected-*` class, and the latter draws the active border.
  tab.className = filesTab.className
    .split(/\s+/)
    .filter((cls) => cls !== "selected" && !/Selected/.test(cls))
    .join(" ");
  tab.removeAttribute("aria-current");
  tab.setAttribute("aria-selected", "false");
  tab.innerHTML = LINEAR_ICON_SVG;
  const label = document.createElement("span");
  label.textContent = "View in Linear";
  tab.appendChild(label);
  // <a> otherwise inherits GitHub's blue link color. Pin it to the tab text
  // color (read from the active tab, which is never muted) so the label + icon
  // match the other tabs by default, not just on hover.
  const activeTab = document.querySelector<HTMLElement>(
    '[role="tab"][aria-selected="true"], .tabnav-tab.selected'
  );
  tab.style.color = getComputedStyle(activeTab ?? filesTab).color;

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
