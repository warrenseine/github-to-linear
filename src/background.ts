import {
  getWorkspaceSlug,
  setPendingReview,
  type OpenLinearMessage,
} from "./shared";

chrome.runtime.onMessage.addListener(
  (message: OpenLinearMessage, _sender, sendResponse) => {
    if (message?.type !== "open-linear") return;
    void (async () => {
      await setPendingReview({
        title: message.title,
        branch: message.branch,
        prUrl: message.prUrl,
        createdAt: Date.now(),
      });
      const slug = await getWorkspaceSlug();
      await chrome.tabs.create({ url: `https://linear.app/${slug}/reviews` });
      sendResponse({ ok: true });
    })();
    return true; // keep the message channel open for the async response
  }
);
