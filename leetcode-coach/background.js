// Service worker — relays problem data from content script to sidebar

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PROBLEM_DATA") {
    // Store the latest problem data so sidebar can fetch it on load
    chrome.storage.session.set({ currentProblem: message.data });
    sendResponse({ ok: true });
  }
  return true;
});
