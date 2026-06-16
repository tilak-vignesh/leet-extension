// sidebar.js — conversation logic + Gemini API integration

const SYSTEM_PROMPT = `You are a Socratic interview coach helping a developer work through a LeetCode problem.

Your rules:
1. NEVER give the full solution unless the user has explicitly tried and given up and asks for it directly.
2. Always start by asking the user what their initial instinct is, even if they say they have no idea.
3. Guide them toward recognizing the problem pattern (sliding window, two pointers, BFS/DFS, dynamic programming, etc.) through questions, not statements.
4. When they're stuck, give the smallest useful nudge — a question, not an answer.
5. Be encouraging but honest. If their approach won't work, tell them gently and redirect.
6. After they solve it (or explicitly give up), give a clear explanation of: the pattern, why it applies here, the time/space complexity, and what to remember for similar problems.
7. Keep responses concise — this is a conversation, not a lecture.
8. Match the user's energy — if they're casual, be casual. If they're stressed, be calm and reassuring.

The problem context will be provided at the start of each conversation.`;

const OPENING_MESSAGE =
  "Alright, here's what we're working with. What's your first instinct when you read this problem? Don't overthink it — just tell me what comes to mind.";

// ── State ──────────────────────────────────────────────────────────────────
let conversationHistory = [];
let currentProblem = null;
let apiKey = null;

// ── DOM refs ───────────────────────────────────────────────────────────────
const messagesEl = document.getElementById("messages");
const userInputEl = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const newProblemBtn = document.getElementById("new-problem-btn");
const problemBanner = document.getElementById("problem-banner");
const problemTitleDisplay = document.getElementById("problem-title-display");
const problemDifficultyDisplay = document.getElementById("problem-difficulty-display");
const noKeyWarning = document.getElementById("no-key-warning");

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  const stored = await chrome.storage.local.get("geminiApiKey");
  apiKey = stored.geminiApiKey || null;

  if (!apiKey) {
    noKeyWarning.classList.remove("hidden");
  }

  // Check if background already has problem data (e.g., sidebar opened late)
  const session = await chrome.storage.session.get("currentProblem");
  if (session.currentProblem) {
    loadProblem(session.currentProblem);
  }
}

// ── Problem loading ────────────────────────────────────────────────────────
function loadProblem(data) {
  currentProblem = data;
  conversationHistory = [];
  clearMessages();

  if (data.title) {
    problemTitleDisplay.textContent = data.title;
    problemBanner.classList.remove("hidden");
  }

  if (data.difficulty) {
    const d = data.difficulty.toLowerCase();
    problemDifficultyDisplay.textContent = data.difficulty;
    problemDifficultyDisplay.className = d.includes("easy")
      ? "easy" : d.includes("hard") ? "hard" : "medium";
    problemDifficultyDisplay.classList.remove("hidden");
  }

  // Seed conversation with problem context as first user turn
  const problemContext = buildProblemContext(data);
  conversationHistory.push({
    role: "user",
    parts: [{ text: problemContext }]
  });

  // Auto-send coach opening message (simulated — no API call for the opener)
  conversationHistory.push({
    role: "model",
    parts: [{ text: OPENING_MESSAGE }]
  });

  appendMessage("coach", OPENING_MESSAGE);
}

function buildProblemContext(data) {
  let ctx = `Problem: ${data.title || "Unknown"}\n`;
  if (data.difficulty) ctx += `Difficulty: ${data.difficulty}\n`;
  if (data.description) ctx += `\n${data.description}`;
  return ctx.trim();
}

// ── Message rendering ──────────────────────────────────────────────────────
function appendMessage(role, text) {
  const el = document.createElement("div");
  el.classList.add("message", role);
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function clearMessages() {
  messagesEl.innerHTML = "";
}

function showTyping() {
  const el = document.createElement("div");
  el.classList.add("message", "typing");
  el.id = "typing-indicator";
  el.textContent = "Coach is thinking…";
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

// ── Gemini API ─────────────────────────────────────────────────────────────
async function sendToGemini(userText) {
  if (!apiKey) {
    noKeyWarning.classList.remove("hidden");
    appendMessage("system", "Add your Gemini API key via the extension popup.");
    return;
  }

  conversationHistory.push({
    role: "user",
    parts: [{ text: userText }]
  });

  sendBtn.disabled = true;
  userInputEl.disabled = true;
  showTyping();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: conversationHistory,
          generationConfig: {
            thinkingConfig: { thinkingBudget: 250 }
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) throw new Error("Empty response from Gemini.");

    conversationHistory.push({
      role: "model",
      parts: [{ text: replyText }]
    });

    hideTyping();
    appendMessage("coach", replyText);
  } catch (err) {
    hideTyping();
    appendMessage("system", `Error: ${err.message}`);
    // Remove the user message we just added since it failed
    conversationHistory.pop();
  } finally {
    sendBtn.disabled = false;
    userInputEl.disabled = false;
    userInputEl.focus();
  }
}

// ── Send handler ───────────────────────────────────────────────────────────
function handleSend() {
  const text = userInputEl.value.trim();
  if (!text) return;

  if (!currentProblem) {
    appendMessage("system", "Navigate to a LeetCode problem page to start.");
    return;
  }

  appendMessage("user", text);
  userInputEl.value = "";
  userInputEl.style.height = "auto";
  sendToGemini(text);
}

// ── Event listeners ────────────────────────────────────────────────────────
sendBtn.addEventListener("click", handleSend);

userInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// Auto-grow textarea
userInputEl.addEventListener("input", () => {
  userInputEl.style.height = "auto";
  userInputEl.style.height = Math.min(userInputEl.scrollHeight, 150) + "px";
});

newProblemBtn.addEventListener("click", () => {
  conversationHistory = [];
  currentProblem = null;
  clearMessages();
  problemBanner.classList.add("hidden");
  appendMessage("system", "Navigate to a new LeetCode problem to begin.");
});

// Listen for problem data posted from content.js via iframe postMessage
window.addEventListener("message", (event) => {
  if (event.data?.type === "PROBLEM_DATA") {
    loadProblem(event.data.data);
  }
});

// Listen for API key updates from popup
chrome.storage.onChanged.addListener((changes) => {
  if (changes.geminiApiKey) {
    apiKey = changes.geminiApiKey.newValue || null;
    if (apiKey) {
      noKeyWarning.classList.add("hidden");
    } else {
      noKeyWarning.classList.remove("hidden");
    }
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
init();
