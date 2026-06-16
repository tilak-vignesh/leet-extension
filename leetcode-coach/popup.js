// popup.js — API key management

const keyInput = document.getElementById("api-key-input");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("status");
const toggleBtn = document.getElementById("toggle-visibility");

// Load existing key on open
chrome.storage.local.get("geminiApiKey", ({ geminiApiKey }) => {
  if (geminiApiKey) {
    keyInput.value = geminiApiKey;
    showStatus("Key saved ✓", false);
  }
});

// Save key
saveBtn.addEventListener("click", () => {
  const key = keyInput.value.trim();
  if (!key) {
    showStatus("Please enter an API key.", true);
    return;
  }
chrome.storage.local.set({ geminiApiKey: key }, () => {
    showStatus("Saved! ✓", false);
  });
});

// Toggle visibility
toggleBtn.addEventListener("click", () => {
  if (keyInput.type === "password") {
    keyInput.type = "text";
    toggleBtn.textContent = "🙈";
  } else {
    keyInput.type = "password";
    toggleBtn.textContent = "👁";
  }
});

// Enter key shortcut
keyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveBtn.click();
});

function showStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.className = isError ? "error" : "";
  if (!isError) {
    setTimeout(() => { statusEl.textContent = ""; }, 3000);
  }
}
