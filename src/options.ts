import { DEFAULT_WORKSPACE, WORKSPACE_KEY, getWorkspaceSlug } from "./shared";

const input = document.getElementById("workspace") as HTMLInputElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLSpanElement;

void getWorkspaceSlug().then((slug) => {
  input.value = slug;
});

saveButton.addEventListener("click", async () => {
  const slug = input.value.trim() || DEFAULT_WORKSPACE;
  await chrome.storage.sync.set({ [WORKSPACE_KEY]: slug });
  input.value = slug;
  status.textContent = "Saved";
  setTimeout(() => (status.textContent = ""), 1500);
});
