# Project: LeetCode Socratic Coach — Browser Extension

## What We're Building
A Chrome browser extension that sits on top of LeetCode and acts as a personal AI interview coach. It reads the current problem and guides the user through solving it using the Socratic method — asking questions, giving nudges, never just handing over the answer.

This is a personal tool for the developer. Not a product, not a SaaS. Just something that works for one person right now.

---

## The Core Problem We're Solving
When the user opens a LeetCode medium problem, they go blank. They don't know how to start thinking through an unfamiliar problem. Existing tools (LeetCode hints, YouTube, courses) are either too passive or too abrupt. What's missing is an interactive thinking partner that scaffolds the problem-solving process in real time.

---

## How It Should Work

1. User opens any LeetCode problem page
2. Extension automatically detects the problem title, description, constraints, and examples
3. A sidebar opens (or a button activates it) with the AI coach
4. User types their initial thoughts — even if it's "I have no idea"
5. The AI coach responds Socratically:
   - Asks "what's your instinct here?"
   - Nudges toward the right pattern without revealing it ("have you thought about what data structure might help here?")
   - Gives the smallest possible hint when truly stuck
   - Never gives the full solution unprompted
6. After the user solves it or gives up, the coach explains:
   - Why this problem maps to this specific pattern
   - What the key insight was
   - What to remember for next time

---

## Key Design Principles
- **Socratic only** — the AI never just dumps the answer. It asks, nudges, hints.
- **Conversational** — feels like talking to a senior engineer, not reading docs
- **No judgment** — no scores, no timers, no pressure. Just thinking together.
- **Minimal UI** — sidebar that doesn't get in the way of LeetCode itself
- **Personal tool** — no auth, no backend, no database. Everything runs locally or via direct API call.

---

## Tech Stack

- **Extension:** Chrome Extension (Manifest V3)
- **Content Script:** Reads the LeetCode DOM to extract problem details
- **Sidebar UI:** Simple HTML/CSS/JS injected into the page
- **AI:** Google Gemini API (`gemini-2.0-flash`) via direct fetch calls from the extension
- **API Key:** Stored locally in Chrome extension storage (chrome.storage.local) — this is a personal tool so local key storage is fine
- **No backend needed** — all API calls made directly from the extension

---

## Chrome Extension Structure

```
leetcode-coach/
├── manifest.json          # Manifest V3
├── background.js          # Service worker
├── content.js             # Injected into LeetCode pages, reads DOM
├── sidebar.html           # The coach UI
├── sidebar.js             # Handles conversation logic + API calls
├── sidebar.css            # Styling — dark theme matching LeetCode
└── icons/                 # Extension icons
```

---

## Content Script — What to Extract from LeetCode DOM

The content script should extract:
- Problem title
- Problem description (full text)
- Examples (input/output)
- Constraints
- Difficulty level (Easy/Medium/Hard)

LeetCode renders content dynamically so the content script should wait for the DOM to fully load before extracting.

---

## The AI System Prompt

This is critical. The AI should behave like a Socratic coach, not a solution dispenser.

```
You are a Socratic interview coach helping a developer work through a LeetCode problem. 

Your rules:
1. NEVER give the full solution unless the user has explicitly tried and given up and asks for it directly.
2. Always start by asking the user what their initial instinct is, even if they say they have no idea.
3. Guide them toward recognizing the problem pattern (sliding window, two pointers, BFS/DFS, dynamic programming, etc.) through questions, not statements.
4. When they're stuck, give the smallest useful nudge — a question, not an answer.
5. Be encouraging but honest. If their approach won't work, tell them gently and redirect.
6. After they solve it (or explicitly give up), give a clear explanation of: the pattern, why it applies here, the time/space complexity, and what to remember for similar problems.
7. Keep responses concise — this is a conversation, not a lecture.
8. Match the user's energy — if they're casual, be casual. If they're stressed, be calm and reassuring.

The problem context will be provided at the start of each conversation.
```

---

## Conversation Flow

```
[System prompt + problem context injected automatically]

Coach: "Alright, here's what we're working with. What's your first instinct when you read this problem? Don't overthink it — just tell me what comes to mind."

User: "I have no idea where to start"

Coach: "That's fine. Let's break it down. What are we actually being asked to do here — can you describe it in plain English, ignoring the code for now?"

... and so on
```

---

## UI — The Sidebar

- Fixed sidebar on the right side of the LeetCode page
- Dark theme (`#1a1a1a` background, `#ffffff` text) to match LeetCode's aesthetic
- Chat-style interface — coach messages on left, user messages on right
- Text input at the bottom with send button
- "New Problem" button that resets the conversation when user navigates to a new problem
- Subtle, doesn't cover the problem or the code editor

---

## API Call Structure

```javascript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: conversationHistory
    })
  }
);
```

Maintain full conversation history in memory so the coach has context of everything discussed so far.

---

## Settings Page

Simple settings page (accessible via extension popup) where user can:
- Enter and save their Anthropic API key
- That's it for now

---

## What This Is NOT
- Not a LeetCode scraper or automation tool
- Not submitting solutions on behalf of the user
- Not storing data anywhere outside the user's local browser
- Not a SaaS, not multi-user, not monetized

---

## First Version Success Criteria
- Extension loads on any LeetCode problem page
- Correctly reads the problem title and description
- Sidebar opens and starts a conversation
- AI responds in Socratic style and never dumps the answer
- Conversation feels natural and helpful
- User can work through a medium problem without going completely blank

That's it. No more features until this works well.