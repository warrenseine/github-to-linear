# GitHub PR → Linear Review

Chrome extension that adds a **"View in Linear"** tab to GitHub pull request pages, next to "Files changed". Clicking it:

1. Checks whether you're a reviewer on the PR — if not (and you're not the author), self-assigns you via the Reviewers sidebar.
2. Opens your Linear workspace's `/reviews` page in a new tab.
3. Auto-finds the PR there (matching by title, falling back to branch-name slug), waiting up to 1 minute for Linear to sync, then navigates to the review.

The Linear review URL can't be constructed from the PR number (the slug ends in an opaque id Linear doesn't expose via its public API), hence the reviews-page lookup.

## Install

```sh
npm install
npm run build
```

Then in Chrome: `chrome://extensions` → enable Developer mode → **Load unpacked** → select the `dist/` folder.

## Configure

Extension options → set your Linear workspace slug (defaults to `hey-pearl`).

## Develop

```sh
npm run watch   # rebuild on change; reload the extension in chrome://extensions
```

## How it works

- `src/github.ts` — content script on github.com. Injects the tab (handles GitHub's SPA navigation), reads PR title/branch/author, self-assigns via DOM automation on the Reviewers sidebar (classic and new React UI strategies; falls back to a toast asking for manual assignment).
- `src/background.ts` — stores the pending lookup and opens `https://linear.app/<slug>/reviews`.
- `src/linear.ts` — content script on linear.app. Polls every second for a `/review/` link matching the PR title (or whose slug matches the branch name with non-alphanumerics stripped), clicks it when found, gives up after 1 minute.
- `src/options.ts` — workspace slug setting (`chrome.storage.sync`).

## Known fragility

- Reviewer self-assignment relies on GitHub's sidebar markup; if GitHub changes it, you'll get a toast asking to assign manually — the Linear lookup still proceeds.
- The Linear reviews list is virtualized; matching only works for rows rendered in the DOM (recent PRs sit at the top, so this is fine in practice).
