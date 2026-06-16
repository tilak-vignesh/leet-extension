// Content script — extracts problem data from LeetCode DOM and injects sidebar

(function () {
  if (document.getElementById("lc-coach-sidebar")) return; // already injected

  // ── Sidebar injection ──────────────────────────────────────────────────────

  const sidebar = document.createElement("div");
  sidebar.id = "lc-coach-sidebar";
  sidebar.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 360px;
    height: 100vh;
    z-index: 99999;
    border: none;
    box-shadow: -4px 0 16px rgba(0,0,0,0.4);
  `;

  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("sidebar.html");
  iframe.style.cssText = "width:100%;height:100%;border:none;";
  sidebar.appendChild(iframe);
  document.body.appendChild(sidebar);

  // Push LeetCode content area left to make room
  injectLayoutStyle();

  // ── Problem extraction ─────────────────────────────────────────────────────

  function extractProblem() {
    // Title
    const titleEl =
      document.querySelector('[data-cy="question-title"]') ||
      document.querySelector(".text-title-large a") ||
      document.querySelector(".text-title-large");
    const title = titleEl ? titleEl.textContent.trim() : "";

    // Difficulty
    const diffEl = document.querySelector('[diff]') ||
      document.querySelector(".text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard") ||
      document.querySelector('[class*="difficulty"]');
    const difficulty = diffEl ? diffEl.textContent.trim() : "";

    // Description (LeetCode's main content div)
    const descEl =
      document.querySelector(".elfjS") ||
      document.querySelector('[data-track-load="description_content"]') ||
      document.querySelector(".question-content__JfgR");
    const description = descEl ? descEl.innerText.trim() : "";

    return { title, difficulty, description };
  }

  function sendProblemData(data) {
    // Send to background to store in session storage
    chrome.runtime.sendMessage({ type: "PROBLEM_DATA", data });
    // Also post directly to iframe once it loads
    iframe.addEventListener("load", () => {
      iframe.contentWindow.postMessage({ type: "PROBLEM_DATA", data }, "*");
    }, { once: true });

    // If iframe already loaded, post immediately
    if (iframe.contentDocument && iframe.contentDocument.readyState === "complete") {
      iframe.contentWindow.postMessage({ type: "PROBLEM_DATA", data }, "*");
    }
  }

  // Wait for dynamic content via MutationObserver with timeout fallback
  function waitForContent() {
    let resolved = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 60; // 30 seconds

    function tryExtract() {
      const data = extractProblem();
      if (data.title && data.description) {
        resolved = true;
        sendProblemData(data);
        return true;
      }
      return false;
    }

    if (tryExtract()) return;

    const observer = new MutationObserver(() => {
      if (resolved) return;
      if (tryExtract()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Fallback polling
    const poll = setInterval(() => {
      attempts++;
      if (resolved || attempts >= MAX_ATTEMPTS) {
        clearInterval(poll);
        observer.disconnect();
        if (!resolved) {
          // Send whatever we have
          sendProblemData(extractProblem());
        }
        return;
      }
      if (tryExtract()) {
        clearInterval(poll);
        observer.disconnect();
      }
    }, 500);
  }

  waitForContent();

  // ── Layout adjustment ──────────────────────────────────────────────────────

  function injectLayoutStyle() {
    const style = document.createElement("style");
    style.id = "lc-coach-layout";
    style.textContent = `
      /* Shift LeetCode's main layout to leave room for the sidebar */
      #app, .main-content, [class*="layout__"], [class*="ContentWrapper"] {
        margin-right: 360px !important;
        transition: margin-right 0.2s ease;
      }
    `;
    document.head.appendChild(style);
  }

})();
