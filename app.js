// OmniMind - Core Application Logic

// Live Production Ingestion Configuration
const OMNIMIND_LLM_CONFIG = window.OMNIMIND_LLM_CONFIG;

// Resetting Seeding Data to a Clean Slate
const initialBrainIndex = [];
const initialAlerts = [];
const initialWeekendTasks = [];

// Keep only the master structure template for the checklist, but start it unselected/empty if necessary
const defaultTripChecklist = [
  { text: "Children's Prescription Box", checked: false },
  { text: "Allergy Medication (Zyrtec/EpiPen)", checked: false },
  { text: "First-aid Supplies & Bandaids", checked: false }
];


// App State
let state = {
  brainIndex: JSON.parse(localStorage.getItem("omnimind_index")) || initialBrainIndex,
  alerts: JSON.parse(localStorage.getItem("omnimind_alerts")) || initialAlerts,
  weekendTasks: JSON.parse(localStorage.getItem("omnimind_tasks")) || initialWeekendTasks,
  tripChecklist: JSON.parse(localStorage.getItem("omnimind_trip_checklist")) || defaultTripChecklist,
  ttsEnabled: JSON.parse(localStorage.getItem("omnimind_tts")) !== false,
  currentMode: localStorage.getItem("omnimind_mode") || "Free",
  briefingN: parseInt(localStorage.getItem("omnimind_briefing_n")) || 3,
  activeLanguage: localStorage.getItem("omnimind_language") || "en-US",
  activeFilter: "all",
  chatHistory: JSON.parse(localStorage.getItem("omnimind_chathistory")) || [
    {
      sender: "bot",
      text: "Hello Mohit. I am monitoring your context. You can type or speak to add items, ask about upcoming tasks, or log notes. How can I help you today?"
    }
  ]
};

// State Utilities
function saveState() {
  localStorage.setItem("omnimind_index", JSON.stringify(state.brainIndex));
  localStorage.setItem("omnimind_alerts", JSON.stringify(state.alerts));
  localStorage.setItem("omnimind_tasks", JSON.stringify(state.weekendTasks));
  localStorage.setItem("omnimind_trip_checklist", JSON.stringify(state.tripChecklist));
  localStorage.setItem("omnimind_tts", JSON.stringify(state.ttsEnabled));
  localStorage.setItem("omnimind_mode", state.currentMode);
  localStorage.setItem("omnimind_briefing_n", state.briefingN);
  localStorage.setItem("omnimind_language", state.activeLanguage);
  localStorage.setItem("omnimind_chathistory", JSON.stringify(state.chatHistory));
  updateStats();
  renderAnalytics();
}

// Speech Systems
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = state.activeLanguage;
}

// DOM Elements
const chatMessagesContainer = document.getElementById("chat-messages-container");
const chatInput = document.getElementById("chat-input");
const sendTrigger = document.getElementById("send-trigger");
const micTrigger = document.getElementById("mic-trigger");
const ttsMuteBtn = document.getElementById("tts-mute-btn");
const listeningOverlay = document.getElementById("listening-overlay");
const cancelListeningBtn = document.getElementById("cancel-listening-btn");
const activeAlertCount = document.getElementById("active-alert-count");
const proactiveAlertsGrid = document.getElementById("proactive-alerts-grid");
const weekendTaskList = document.getElementById("weekend-task-list");
const quickTaskInput = document.getElementById("quick-task-input");
const addQuickTaskBtn = document.getElementById("add-quick-task-btn");
const brainIndexList = document.getElementById("brain-index-list");
const globalSearch = document.getElementById("global-search");
const tabPanels = document.querySelectorAll(".tab-panel");
const navItems = document.querySelectorAll(".nav-item");
const carplayToggleBtn = document.getElementById("carplay-toggle-btn");
const greetingText = document.getElementById("greeting-text");
const currentDateEl = document.getElementById("current-date");

// CarPlay Console DOM
const cpClock = document.getElementById("cp-clock");
const carplayStatus = document.getElementById("carplay-status");
const carplayPrompt = document.getElementById("carplay-prompt");
const carplayMicTrigger = document.getElementById("carplay-mic-trigger");
const cpActBriefing = document.getElementById("cp-act-briefing");
const cpActComplaint = document.getElementById("cp-act-complaint");
const carplayTicker = document.getElementById("carplay-ticker");
const carplayWrapper = document.querySelector(".carplay-wrapper");

// Template sync DOM
const syncTextarea = document.getElementById("sync-textarea");
const runSyncBtn = document.getElementById("run-sync-btn");
const syncLogOutput = document.getElementById("sync-log-output");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupSpeechHandlers();
  setupSyncSimulator();
  setupSightIngestion();
  setupModeControls();

  // Lifecycle checks on launch
  runLifecycleTracker();

  renderAll();
  updateGreeting();

  // Refresh Clock for CarPlay
  setInterval(updateCarPlayClock, 1000);
  updateCarPlayClock();

  // Set default volume button style
  updateVolumeBtnStyle();
});

// Update Clock & Greeting
function updateGreeting() {
  const hours = new Date().getHours();
  let greet = "Good evening, Mohit";
  if (hours < 12) greet = "Good morning, Mohit";
  else if (hours < 17) greet = "Good afternoon, Mohit";

  greetingText.textContent = greet;
  currentDateEl.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function updateCarPlayClock() {
  if (cpClock) {
    cpClock.textContent = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// Navigation Tabs
function setupTabs() {
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetTab = item.getAttribute("data-tab");
      switchTab(targetTab);
    });
  });

  carplayToggleBtn.addEventListener("click", () => {
    switchTab("carplay");
  });

  // Index filter buttons
  document.getElementById("index-filters-container").addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-btn")) {
      document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
      e.target.classList.add("active");
      state.activeFilter = e.target.getAttribute("data-filter");
      renderBrainIndex();
    }
  });
}

function switchTab(tabId) {
  navItems.forEach(item => {
    if (item.getAttribute("data-tab") === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  tabPanels.forEach(panel => {
    if (panel.id === `panel-${tabId}`) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });
}

// Speech Systems Logic
function setupSpeechHandlers() {
  if (!recognition) {
    console.warn("Speech Recognition not supported on this browser.");
    micTrigger.style.opacity = "0.5";
    carplayMicTrigger.style.opacity = "0.5";
  } else {
    // Web Speech API Handlers
    recognition.onstart = () => {
      showListening(true);
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      if (chatInput.value === "") {
        chatInput.value = text;
      }
      addChatMessage("user", text);
      handleUserInput(text);
      chatInput.value = "";
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      addLog("Speech recognition error: " + event.error, "error");
      showListening(false);
      speakText("Sorry, I didn't catch that. Could you repeat?");
    };

    recognition.onend = () => {
      showListening(false);
    };

    // UI Click triggers
    micTrigger.addEventListener("click", () => {
      try {
        recognition.start();
      } catch (err) {
        recognition.stop();
      }
    });

    carplayMicTrigger.addEventListener("click", () => {
      try {
        recognition.start();
      } catch (err) {
        recognition.stop();
      }
    });
  }

  cancelListeningBtn.addEventListener("click", () => {
    if (recognition) recognition.stop();
    showListening(false);
  });

  ttsMuteBtn.addEventListener("click", () => {
    state.ttsEnabled = !state.ttsEnabled;
    saveState();
    updateVolumeBtnStyle();
  });

  // Action Buttons
  sendTrigger.addEventListener("click", submitTextChat);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") submitTextChat();
  });

  // CarPlay Console actions
  if (cpActBriefing) {
    cpActBriefing.addEventListener("click", () => {
      runCarPlayBriefing();
    });
  }

  cpActComplaint.addEventListener("click", () => {
    const openTasks = getActiveFilteredTasks().filter(t => !t.completed && t.category === "House Maintenance");
    if (openTasks.length > 0) {
      const summary = openTasks.map((t, idx) => `${idx + 1}. ${t.title}`).join(", ");
      speakText("You have " + openTasks.length + " pending builder tasks for this weekend: " + summary);
      carplayPrompt.textContent = `Pending Tasks: ${openTasks.length} builder complaints`;
    } else {
      speakText("All house builder complaints filed successfully!");
      carplayPrompt.textContent = "All house builder complaints filed successfully!";
    }
  });
}

function updateVolumeBtnStyle() {
  if (state.ttsEnabled) {
    ttsMuteBtn.textContent = "🔊 Sound On";
    ttsMuteBtn.classList.add("sound-on");
    ttsMuteBtn.classList.remove("text-muted");
  } else {
    ttsMuteBtn.textContent = "🔇 Muted";
    ttsMuteBtn.classList.remove("sound-on");
    ttsMuteBtn.classList.add("text-muted");
  }
}

function showListening(isListening) {
  if (isListening) {
    listeningOverlay.classList.add("active");
    carplayWrapper.classList.add("listening");
    carplayWrapper.classList.remove("speaking");
    carplayStatus.textContent = "Omni is Listening...";
  } else {
    listeningOverlay.classList.remove("active");
    carplayWrapper.classList.remove("listening");
    carplayStatus.textContent = 'Say "Hey Omni" or tap below';
  }
}

if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    console.log("[SPEECH SYNTHESIS] Registered system voices:", window.speechSynthesis.getVoices().map(v => `${v.name} (${v.lang})`));
  };
}

function findBestIndianFemaleVoice(voices, lang) {
  const cleanLang = lang.toLowerCase().replace('_', '-');

  // Filter voices that match target language locale (e.g. en-in, hi-in, pa-in)
  const matchingLangVoices = voices.filter(v => {
    const vLang = v.lang.toLowerCase().replace('_', '-');
    return vLang.startsWith(cleanLang) || vLang.includes(cleanLang);
  });

  if (matchingLangVoices.length === 0) {
    // If no exact match (especially for pa-IN which is rare on standard Windows/Mac registries), fallback to en-IN
    if (cleanLang !== 'en-in') {
      return findBestIndianFemaleVoice(voices, 'en-in');
    }
    return null;
  }

  // Prioritize high-quality female profiles
  let best = matchingLangVoices.find(v => {
    const name = v.name.toLowerCase();
    return name.includes("female") || name.includes("aria") || name.includes("heera") || name.includes("zira") || name.includes("google") || name.includes("online") || name.includes("natural");
  });

  if (best) return best;
  return matchingLangVoices[0];
}

function speakText(text) {
  if (!state.ttsEnabled) {
    console.log("Speech synthesis muted:", text);
    return;
  }

  // Cancel any running speech
  window.speechSynthesis.cancel();

  // ElevenLabs Custom Voice Replica Matrix Simulation Hook
  // Acoustic Target Aura: Sweet, warm, clear, Bollywood actress Sonali Bendre natural speaking voice
  console.log("%c[ELEVENLABS REPLICA VOICE MATRIX] Passing payload to voice cloning pipeline...", "color: #ff007f; font-weight: bold;");
  console.log("Endpoint: https://api.elevenlabs.io/v1/text-to-speech/SonaliBendreVoiceMatrixToken");
  console.log(`Payload: { text: "${text}", voice_settings: { stability: 0.75, similarity_boost: 0.85 } }`);

  const utterance = new SpeechSynthesisUtterance(text);

  if (window.speechSynthesis) {
    const voices = window.speechSynthesis.getVoices();
    let targetLang = "en-IN";
    if (state.activeLanguage === "hi-IN") targetLang = "hi-IN";
    else if (state.activeLanguage === "pa-IN") targetLang = "pa-IN";

    // Find best matching voice using our robust fuzzy matcher
    const selectedVoice = findBestIndianFemaleVoice(voices, targetLang);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
      console.log(`[SPEECH SYNTHESIS] Mapped to sweet female voice: ${selectedVoice.name} (${selectedVoice.lang})`);
    } else {
      utterance.lang = targetLang;
      console.log(`[SPEECH SYNTHESIS] Default fallback locale: ${targetLang}`);
    }
  }

  // Adjust synthesis properties for a sweet, youthful, energetic tone
  utterance.rate = 1.05; // Slightly faster for a natural, youthful cadence
  utterance.pitch = 1.15; // Moderately elevated pitch to achieve a bright, clear female tone

  utterance.onstart = () => {
    if (carplayWrapper) {
      carplayWrapper.classList.add("speaking");
      carplayStatus.textContent = "Omni is Speaking...";
      carplayPrompt.textContent = `"${text}"`;
    }
  };

  utterance.onend = () => {
    if (carplayWrapper) {
      carplayWrapper.classList.remove("speaking");
      carplayStatus.textContent = 'Say "Hey Omni" or tap below';
    }
  };

  utterance.onerror = (e) => {
    console.error("Speech Synthesis Error:", e);
    if (carplayWrapper) carplayWrapper.classList.remove("speaking");
  };

  window.speechSynthesis.speak(utterance);
}

function submitTextChat() {
  const text = chatInput.value.trim();
  if (text === "") return;

  addChatMessage("user", text);
  handleUserInput(text);
  chatInput.value = "";
}

function addChatMessage(sender, text) {
  // Check for duplicates (e.g. if already pushed to avoid double logging)
  const lastMsg = state.chatHistory[state.chatHistory.length - 1];
  if (!lastMsg || lastMsg.text !== text || lastMsg.sender !== sender) {
    state.chatHistory.push({ sender, text });
    if (state.chatHistory.length > 30) {
      state.chatHistory.shift();
    }
    saveState();
  }

  const msgEl = document.createElement("div");
  msgEl.classList.add("msg", sender);

  const avatar = sender === "user" ? "👤" : "🤖";
  msgEl.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-bubble">${escapeHtml(text)}</div>
  `;

  chatMessagesContainer.appendChild(msgEl);
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function renderChatHistory() {
  if (!chatMessagesContainer) return;
  chatMessagesContainer.innerHTML = "";
  state.chatHistory.forEach(msg => {
    const msgEl = document.createElement("div");
    msgEl.classList.add("msg", msg.sender);
    const avatar = msg.sender === "user" ? "👤" : "🤖";
    msgEl.innerHTML = `
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-bubble">${escapeHtml(msg.text)}</div>
    `;
    chatMessagesContainer.appendChild(msgEl);
  });
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Service Account Client-Side OAuth Token Exchange helpers using Web Crypto API
function base64UrlEncode(str) {
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function arrayBufferToBase64Url(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function pemToDer(pem) {
  const rawPem = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  return base64ToArrayBuffer(rawPem);
}

async function importPrivateKey(pemKey) {
  const derBuffer = pemToDer(pemKey);
  return await window.crypto.subtle.importKey(
    "pkcs8",
    derBuffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" }
    },
    false,
    ["sign"]
  );
}

async function createServiceAccountJwt(serviceAccount) {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const tokenInput = `${encodedHeader}.${encodedPayload}`;
  
  const privateKey = await importPrivateKey(serviceAccount.private_key);
  const encoder = new TextEncoder();
  const data = encoder.encode(tokenInput);
  
  const signature = await window.crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    data
  );
  const encodedSignature = arrayBufferToBase64Url(signature);
  return `${tokenInput}.${encodedSignature}`;
}

async function getVertexAccessToken(serviceAccount) {
  if (!serviceAccount || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error("Invalid service account JSON structure. Please verify private_key and client_email properties.");
  }
  
  const cachedToken = sessionStorage.getItem("vertex_oauth_token");
  const cachedExpiry = sessionStorage.getItem("vertex_oauth_expiry");
  
  if (cachedToken && cachedExpiry) {
    const expiryTime = parseInt(cachedExpiry);
    if (Date.now() < expiryTime - 300000) {
      console.log("[VERTEX OAUTH]: Using cached access token.");
      return cachedToken;
    }
  }
  
  console.log("[VERTEX OAUTH]: Generating new OAuth token from Service Account key...");
  const jwt = await createServiceAccountJwt(serviceAccount);
  const response = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange JWT for access token: ${errorText}`);
  }
  
  const data = await response.json();
  if (data.access_token) {
    const expiryTimestamp = Date.now() + (data.expires_in || 3600) * 1000;
    sessionStorage.setItem("vertex_oauth_token", data.access_token);
    sessionStorage.setItem("vertex_oauth_expiry", expiryTimestamp.toString());
    return data.access_token;
  } else {
    throw new Error("No access_token returned in Google OAuth response.");
  }
}

function getFormattedChatHistoryForGemini() {
  const formatted = [];
  let lastRole = null;

  // Send the last 12 messages for richer context
  const historyLimit = 12;
  const recentHistory = state.chatHistory.slice(-historyLimit);

  recentHistory.forEach(msg => {
    const role = msg.sender === "user" ? "user" : "model";
    if (role === lastRole) {
      if (formatted.length > 0) {
        formatted[formatted.length - 1].parts[0].text += "\n" + msg.text;
      }
    } else {
      formatted.push({
        role: role,
        parts: [{ text: msg.text }]
      });
      lastRole = role;
    }
  });

  return formatted;
}

// Intelligent Ingestion & Normalization Layer (NLP Google Gemini Integration v2.0)
async function handleUserInput(text) {
  const normalized = text.toLowerCase();
  let reply = "";

  // Ensure the user's text is logged in chat history
  const lastMsg = state.chatHistory[state.chatHistory.length - 1];
  if (!lastMsg || lastMsg.text !== text || lastMsg.sender !== "user") {
    addChatMessage("user", text);
  }

  // 0. Handle Confirmation States First (Fast local resolution)
  if (state.pendingDeleteTask) {
    const isYes = normalized.includes("yes") ||
      normalized.includes("yep") ||
      normalized.includes("yeah") ||
      normalized.includes("confirm") ||
      normalized.includes("हाँ") ||
      normalized.includes("haan") ||
      normalized.includes("ha") ||
      normalized.includes("ਹਾਂ");

    const isNo = normalized.includes("no") ||
      normalized.includes("don't") ||
      normalized.includes("cancel") ||
      normalized.includes("ना") ||
      normalized.includes("नहीं") ||
      normalized.includes("na") ||
      normalized.includes("nahi") ||
      normalized.includes("ਨਾ") ||
      normalized.includes("ਨਹੀਂ");

    if (isYes) {
      const taskToDelete = state.pendingDeleteTask;
      state.weekendTasks = state.weekendTasks.filter(t => t.id !== taskToDelete.id);
      state.brainIndex = state.brainIndex.filter(t => t.id !== taskToDelete.id);
      state.pendingDeleteTask = null;
      saveState();
      renderAll();

      const successMsg = state.activeLanguage.startsWith("hi") ? `काम "${taskToDelete.title}" हटा दिया गया है।` : state.activeLanguage.startsWith("pa") ? `ਕੰਮ "${taskToDelete.title}" ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।` : `Task "${taskToDelete.title}" has been deleted.`;
      addChatMessage("bot", successMsg);
      speakText(successMsg);
      return;
    } else if (isNo || normalized.length > 0) {
      const cancelMsg = state.activeLanguage.startsWith("hi") ? "हटाना रद्द कर दिया गया है।" : state.activeLanguage.startsWith("pa") ? "ਹਟਾਉਣਾ ਰੱਦ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।" : "Deletion cancelled.";
      state.pendingDeleteTask = null;
      addChatMessage("bot", cancelMsg);
      speakText(cancelMsg);
      return;
    }
  }

  if (state.pendingUpdateTask) {
    const task = state.pendingUpdateTask.task;
    const field = state.pendingUpdateTask.field;

    if (field === "item_priority") {
      let priorityVal = null;
      const numMatch = normalized.match(/\b(1|2|3|4|5|one|two|three|four|five)\b/);
      if (numMatch) {
        const numStr = numMatch[1];
        if (numStr === "1" || numStr === "one") priorityVal = 1;
        else if (numStr === "2" || numStr === "two") priorityVal = 2;
        else if (numStr === "3" || numStr === "three") priorityVal = 3;
        else if (numStr === "4" || numStr === "four") priorityVal = 4;
        else if (numStr === "5" || numStr === "five") priorityVal = 5;
      }

      if (priorityVal !== null) {
        task.item_priority = priorityVal;
        state.pendingUpdateTask = null;
        saveState();
        renderAll();
        const successMsg = `Priority for "${task.title}" updated to ${priorityVal}.`;
        addChatMessage("bot", successMsg);
        speakText(successMsg);
        return;
      }
    } else if (field === "mode_restrictions") {
      let targetMode = null;
      const modesList = ["Work", "Free", "Snooze", "Sleep", "Wakeup", "Inside", "Outside", "Driving", "Cooking", "Playing"];
      for (const m of modesList) {
        if (normalized.includes(m.toLowerCase())) {
          targetMode = m;
          break;
        }
      }

      if (targetMode) {
        if (!task.mode_restrictions) task.mode_restrictions = [];
        if (!task.mode_restrictions.includes(targetMode)) {
          task.mode_restrictions.push(targetMode);
        }
        state.pendingUpdateTask = null;
        saveState();
        renderAll();
        const successMsg = `Moved "${task.title}" to ${targetMode}.`;
        addChatMessage("bot", successMsg);
        speakText(successMsg);
        return;
      }
    }
    state.pendingUpdateTask = null;
  }

  // 1. Live LLM Google Gemini Ingestion flow
  try {
    const existingTasksSummary = state.weekendTasks
      .filter(t => !t.completed)
      .map(t => `- "${t.title}" (ID: ${t.id}, Category: ${t.category}, Priority: ${t.item_priority})`)
      .join("\n");

    const systemPrompt = `You are the central orchestration AI for OmniMind v2.0, a context-aware personal brain and task manager.
Current Date: 2026-06-20
Current Mode: "${state.currentMode}"
Active Language setting: "${state.activeLanguage}" (Use this language for conversational responses - Hindi, Punjabi or English)
Available Modes: ["Work", "Free", "Snooze", "Sleep", "Wakeup", "Inside", "Outside", "Driving", "Cooking", "Playing"]

List of active (uncompleted) tasks:
${existingTasksSummary}

Analyze the user's latest message in the conversation history context.

Determine if this is a:
1. CREATE: User wants to add/remind a task (e.g. "Add a task...", "remind me to...").
2. READ: User wants to list, view, check agenda or active tasks.
3. UPDATE: User wants to modify an existing task's priority, move to a mode, or snooze.
4. DELETE: User wants to remove or delete a task.
5. MODE_SWITCH: User wants to switch system mode (e.g. "switch to driving mode", "work mode").
6. CHAT: General query, Q&A, wife complained checks, or generic chat.

You must respond with a strictly formatted minified JSON object only, matching this structure:
{
  "action": "CREATE" | "READ" | "UPDATE" | "DELETE" | "MODE_SWITCH" | "CHAT",
  "mode": "String (Target mode name if action is MODE_SWITCH)",
  "reply": "String (Your response to the user. For CREATE, confirm creation. For READ, outline matching tasks. For UPDATE/DELETE/MODE_SWITCH, confirm action. For CHAT, answer query. Translate this response into the active language locale if the language is Hindi or Punjabi)",
  "task": {
    "title": "String (Task title or search string to locate existing task)",
    "content": "String (Task description)",
    "category": "House Maintenance" | "Finance" | "Family/Travel" | "Work" | "General Tasks",
    "topic": "String (Topic/Tag)",
    "item_priority": 1 | 2 | 3 | 4 | 5,
    "category_priority": 1 | 2 | 3 | 4 | 5,
    "date_due": "YYYY-MM-DD" | null,
    "mode_restrictions": ["List of acceptable modes"]
  },
  "update_field": "item_priority" | "mode_restrictions" | "snooze",
  "update_value": "Any (1-5 for priority, Mode Name for mode restrictions, null for snooze)"
}

Rules:
- For UPDATE or DELETE, set "task.title" to a substring of the title of the task from the list above that best matches the user's request.
- For CHAT: If the user searches for tasks, you can answer the query in the "reply" string.
- Provide ONLY raw JSON. No markdown backticks, no comments.`;

    const formattedHistory = getFormattedChatHistoryForGemini();

    // Inject the systemPrompt and context constraints directly into the last user turn text
    // as suggested by the user's snippet.
    if (formattedHistory.length > 0) {
      const lastTurn = formattedHistory[formattedHistory.length - 1];
      if (lastTurn.role === "user") {
        lastTurn.parts[0].text = `${systemPrompt}\n\nUser Input: ${text}`;
      } else {
        formattedHistory.push({
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nUser Input: ${text}` }]
        });
      }
    } else {
      formattedHistory.push({
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nUser Input: ${text}` }]
      });
    }

    let url = OMNIMIND_LLM_CONFIG.endpoint;
    const headers = {
      "Content-Type": "application/json"
    };

    if (OMNIMIND_LLM_CONFIG.provider === "Vertex AI" && OMNIMIND_LLM_CONFIG.authMethod === "serviceAccount" && OMNIMIND_LLM_CONFIG.serviceAccount) {
      // Automatically swap {PROJECT_ID} or {YOUR_PROJECT_ID} in the endpoint URL from the service account JSON
      const projectId = OMNIMIND_LLM_CONFIG.serviceAccount.project_id;
      if (projectId) {
        url = url.replace("{PROJECT_ID}", projectId).replace("{YOUR_PROJECT_ID}", projectId);
      }
      const token = await getVertexAccessToken(OMNIMIND_LLM_CONFIG.serviceAccount);
      headers["Authorization"] = `Bearer ${token}`;
    } else if (OMNIMIND_LLM_CONFIG.provider === "Vertex AI" && OMNIMIND_LLM_CONFIG.authMethod === "bearer") {
      headers["Authorization"] = `Bearer ${OMNIMIND_LLM_CONFIG.apiKey}`;
    } else {
      headers["X-goog-api-key"] = OMNIMIND_LLM_CONFIG.apiKey;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        contents: formattedHistory
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      let rawText = data.candidates[0].content.parts[0].text.trim();
      if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }

      const res = JSON.parse(rawText);
      console.log("[GEMINI INGESTION DECISION]:", res);

      if (res.action === "CREATE" && res.task && res.task.title) {
        const newTask = createOmniItem({
          type: "todo",
          title: res.task.title,
          content: res.task.content || "Voice-ingested task.",
          category: res.task.category || "General Tasks",
          topic: res.task.topic || "General",
          item_priority: res.task.item_priority || 3,
          category_priority: res.task.category_priority || 3,
          date_due: res.task.date_due || null,
          mode_restrictions: res.task.mode_restrictions || []
        });
        state.brainIndex.unshift(newTask);
        state.weekendTasks.unshift(newTask);
        saveState();
        renderAll();
        reply = res.reply || `Created task "${res.task.title}".`;
      }
      else if (res.action === "MODE_SWITCH" && res.mode) {
        updateActiveMode(res.mode);
        reply = res.reply || `Switched mode to ${res.mode}.`;
      }
      else if (res.action === "READ") {
        runCarPlayBriefing();
        return;
      }
      else if (res.action === "UPDATE" && res.task && res.task.title) {
        const task = findTaskByTitle(res.task.title);
        if (task) {
          if (res.update_field === "item_priority" && res.update_value) {
            let priorityVal = parseInt(res.update_value);
            if (!isNaN(priorityVal)) {
              task.item_priority = priorityVal;
            }
            reply = res.reply || `Updated priority of "${task.title}" to ${res.update_value}.`;
          } else if (res.update_field === "mode_restrictions" && res.update_value) {
            if (!task.mode_restrictions) task.mode_restrictions = [];
            if (!task.mode_restrictions.includes(res.update_value)) {
              task.mode_restrictions.push(res.update_value);
            }
            reply = res.reply || `Moved "${task.title}" to ${res.update_value}.`;
          } else if (res.update_field === "snooze") {
            if (!task.mode_restrictions) task.mode_restrictions = [];
            if (!task.mode_restrictions.includes("Snooze")) {
              task.mode_restrictions.push("Snooze");
            }
            if (task.date_due) {
              const d = new Date(task.date_due);
              d.setDate(d.getDate() + 1);
              task.date_due = d.toISOString().split('T')[0];
            }
            reply = res.reply || `Snoozed task "${task.title}".`;
          }
          saveState();
          renderAll();
        } else {
          reply = `I couldn't find a task matching "${res.task.title}" to update.`;
        }
      }
      else if (res.action === "DELETE" && res.task && res.task.title) {
        const task = findTaskByTitle(res.task.title);
        if (task) {
          state.pendingDeleteTask = task;
          reply = res.reply || `Are you sure you want to delete "${task.title}"?`;
        } else {
          reply = `I couldn't find a task matching "${res.task.title}" to delete.`;
        }
      }
      else if (res.action === "CHAT") {
        reply = res.reply || "I am not sure how to help with that request.";
      }

      saveState();
      renderAll();

      addChatMessage("bot", reply);
      speakText(reply);
      if (carplayWrapper && (carplayWrapper.classList.contains("listening") || carplayWrapper.classList.contains("speaking"))) {
        carplayPrompt.textContent = reply;
      }
      return;
    }
  } catch (err) {
    console.warn("Gemini API ingestion failed, falling back to local deterministic parsing:", err);
    addLog("Gemini API Offline/Error: " + err.message + ". Running local NLP fallback.", "warning");
    handleUserInputLocalFallback(text);
  }
}

// Local Fallback Parser when API is offline/unavailable
function handleUserInputLocalFallback(text) {
  const normalized = text.toLowerCase();
  const cleanInput = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
  let reply = "";

  // 0. Greeting Handler (Local conversational fallback)
  const greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "namaste", "sat sri akal", "satsriakal", "hola"];
  const isGreeting = greetings.some(g => cleanInput === g || cleanInput.startsWith(g + " "));
  if (isGreeting) {
    if (state.activeLanguage.startsWith("hi")) {
      reply = "नमस्ते! मैं आपकी क्या सहायता कर सकता हूँ?";
    } else if (state.activeLanguage.startsWith("pa")) {
      reply = "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?";
    } else {
      reply = "Hello Mohit! How can I help you today?";
    }
    
    setTimeout(() => {
      addChatMessage("bot", reply);
      speakText(reply);
      if (carplayWrapper && (carplayWrapper.classList.contains("listening") || carplayWrapper.classList.contains("speaking"))) {
        carplayPrompt.textContent = reply;
      }
    }, 500);
    return;
  }

  // 1. Voice Mode Switches
  if (normalized.includes("mode") || normalized.includes("driving") || normalized.includes("working") || normalized.includes("snooze") || normalized.includes("playing") || normalized.includes("cooking") || normalized.includes("free")) {
    let targetMode = null;
    if (normalized.includes("work")) targetMode = "Work";
    else if (normalized.includes("drive") || normalized.includes("driving")) targetMode = "Driving";
    else if (normalized.includes("free")) targetMode = "Free";
    else if (normalized.includes("snooze")) targetMode = "Snooze";
    else if (normalized.includes("sleep")) targetMode = "Sleep";
    else if (normalized.includes("wakeup")) targetMode = "Wakeup";
    else if (normalized.includes("outside")) targetMode = "Outside";
    else if (normalized.includes("inside")) targetMode = "Inside";
    else if (normalized.includes("cook") || normalized.includes("cooking")) targetMode = "Cooking";
    else if (normalized.includes("play") || normalized.includes("playing")) targetMode = "Playing";

    if (targetMode) {
      updateActiveMode(targetMode);
      reply = `I have switched your operational mode to ${targetMode}. Your view and notifications have been updated.`;
      setTimeout(() => {
        addChatMessage("bot", reply);
        speakText(reply);
      }, 500);
      return;
    }
  }

  // 2. CREATE Command Matching
  const isCreate = normalized.startsWith("add") ||
    normalized.startsWith("remind") ||
    normalized.startsWith("ਨਵਾਂ ਕੰਮ") ||
    normalized.startsWith("लिख लो") ||
    normalized.includes("ਨਵਾਂ ਕੰਮ") ||
    normalized.includes("लिख लो");

  if (isCreate) {
    let cleanText = text;
    let matchedTrigger = "";
    if (normalized.startsWith("add")) {
      matchedTrigger = "add";
      cleanText = text.substring(3).trim();
    } else if (normalized.startsWith("remind")) {
      matchedTrigger = "remind";
      cleanText = text.substring(6).trim();
    } else if (normalized.includes("ਨਵਾਂ ਕੰਮ")) {
      matchedTrigger = "ਨਵਾਂ ਕੰਮ";
      const idx = normalized.indexOf("ਨਵਾਂ ਕੰਮ");
      cleanText = text.substring(idx + 8).trim();
    } else if (normalized.includes("लिख लो")) {
      matchedTrigger = "लिख लो";
      const idx = normalized.indexOf("लिख लो");
      cleanText = text.substring(idx + 6).trim();
    }

    cleanText = cleanText
      .replace(/^(me to|me\b|to\b|that\b|ਮੈਨੂੰ\s+|मुझे\s+|की\s+)/i, "")
      .trim();

    if (cleanText.length > 0) {
      const meta = deduceCategoryAndTopic(cleanText);
      const newTask = createOmniItem({
        type: "todo",
        title: cleanText,
        content: `Voice-ingested task via command "${matchedTrigger}". Category: ${meta.category}, Topic: ${meta.topic}.`,
        category: meta.category,
        topic: meta.topic,
        item_priority: meta.item_priority,
        category_priority: meta.category_priority,
        mode_restrictions: meta.mode_restrictions
      });

      state.brainIndex.unshift(newTask);
      state.weekendTasks.unshift(newTask);
      saveState();
      renderAll();

      reply = state.activeLanguage.startsWith("hi")
        ? `नया काम "${cleanText}" जोड़ दिया गया है। प्राथमिकता: ${meta.item_priority}।`
        : state.activeLanguage.startsWith("pa")
          ? `ਨਵਾਂ ਕੰਮ "${cleanText}" ਜੋੜ ਦਿੱਤਾ ਗਿਆ ਹੈ। ਤਰਜੀਹ: ${meta.item_priority}।`
          : `Created new task: "${cleanText}" under "${meta.category}" with priority ${meta.item_priority}.`;

      setTimeout(() => {
        addChatMessage("bot", reply);
        speakText(reply);
      }, 600);
      return;
    }
  }

  // 3. READ Command Matching
  const isRead = normalized.includes("what's on my list") ||
    normalized.includes("what is on my list") ||
    normalized.includes("agenda") ||
    normalized.includes("ਮੇਰੇ ਕੰਮ") ||
    normalized.includes("काम बताओ");

  if (isRead) {
    runCarPlayBriefing();
    return;
  }

  // 4. UPDATE Command Matching
  const isUpdate = normalized.includes("change priority") ||
    normalized.includes("move to") ||
    normalized.includes("snooze") ||
    normalized.includes("ਬਦਲੋ") ||
    normalized.includes("बदलो") ||
    normalized.includes("बਦਲੋ");

  if (isUpdate) {
    const priorityMatch = normalized.match(/^(?:change priority|ਬਦਲੋ|बदलो|बਦਲੋ)(?:\s+(?:of|for|task))?\s+(.*?)\s+(?:to\s+)?(1|2|3|4|5|one|two|three|four|five)$/i);
    const moveMatch = normalized.match(/^(?:move)(?:\s+(?:of|for|task))?\s+(.*?)\s+(?:to\s+)?(work|free|snooze|sleep|wakeup|inside|outside|driving|cooking|playing)$/i);
    const snoozeMatch = normalized.match(/^(?:snooze)(?:\s+(?:of|for|task))?\s+(.*)$/i);
    const priorityAskMatch = normalized.match(/^(?:change priority|ਬਦਲੋ|बਦਲੋ|बदलो)(?:\s+(?:of|for|task))?\s+(.*)$/i);

    if (priorityMatch) {
      const taskQuery = priorityMatch[1].trim();
      const numStr = priorityMatch[2].trim();
      let priorityVal = 3;
      if (numStr === "1" || numStr === "one") priorityVal = 1;
      else if (numStr === "2" || numStr === "two") priorityVal = 2;
      else if (numStr === "3" || numStr === "three") priorityVal = 3;
      else if (numStr === "4" || numStr === "four") priorityVal = 4;
      else if (numStr === "5" || numStr === "five") priorityVal = 5;

      const task = findTaskByTitle(taskQuery);
      if (task) {
        task.item_priority = priorityVal;
        saveState();
        renderAll();
        reply = `Updated priority for "${task.title}" to ${priorityVal}.`;
      } else {
        reply = `I couldn't find a task matching "${taskQuery}" to change priority.`;
      }
    } else if (moveMatch) {
      const taskQuery = moveMatch[1].trim();
      const rawMode = moveMatch[2].trim();
      const modesList = ["Work", "Free", "Snooze", "Sleep", "Wakeup", "Inside", "Outside", "Driving", "Cooking", "Playing"];
      const targetMode = modesList.find(m => m.toLowerCase() === rawMode.toLowerCase());

      const task = findTaskByTitle(taskQuery);
      if (task && targetMode) {
        if (!task.mode_restrictions) task.mode_restrictions = [];
        if (!task.mode_restrictions.includes(targetMode)) {
          task.mode_restrictions.push(targetMode);
        }
        saveState();
        renderAll();
        reply = `Moved "${task.title}" to ${targetMode} mode restrictions.`;
      } else {
        reply = `I couldn't find a task matching "${taskQuery}".`;
      }
    } else if (snoozeMatch) {
      const taskQuery = snoozeMatch[1].trim();
      const task = findTaskByTitle(taskQuery);
      if (task) {
        if (!task.mode_restrictions) task.mode_restrictions = [];
        if (!task.mode_restrictions.includes("Snooze")) {
          task.mode_restrictions.push("Snooze");
        }
        if (task.date_due) {
          const d = new Date(task.date_due);
          d.setDate(d.getDate() + 1);
          task.date_due = d.toISOString().split('T')[0];
        }
        saveState();
        renderAll();
        reply = `Snoozed task "${task.title}". It has been moved to Snooze mode restrictions and its due date extended.`;
      } else {
        reply = `I couldn't find a task matching "${taskQuery}" to snooze.`;
      }
    } else if (priorityAskMatch) {
      const taskQuery = priorityAskMatch[1].trim();
      const task = findTaskByTitle(taskQuery);
      if (task) {
        reply = `Found task "${task.title}". What priority should I set? Please say a number from 1 to 5.`;
        state.pendingUpdateTask = { task: task, field: "item_priority" };
      } else {
        reply = `I couldn't find a task matching "${taskQuery}" to change priority.`;
      }
    } else {
      reply = "I didn't recognize that update command details locally.";
    }
  }

  // 5. DELETE Command Matching
  const isDelete = normalized.includes("remove") ||
    normalized.includes("delete") ||
    normalized.includes("ਹਟਾ ਦਿਓ") ||
    normalized.includes("ਹਟਾਓ") ||
    normalized.includes("हटाओ");

  if (isDelete) {
    const deleteMatch = normalized.match(/^(?:delete|remove|ਹਟਾ ਦਿਓ|ਹਟਾਓ|हटाओ)(?:\s+(?:of|for|task))?\s+(.*)$/i);
    if (deleteMatch) {
      const taskQuery = deleteMatch[1].trim();
      const task = findTaskByTitle(taskQuery);
      if (task) {
        state.pendingDeleteTask = task;
        const confirmMsg = state.activeLanguage.startsWith("hi")
          ? `क्या आप वाकई "${task.title}" को हटाना चाहते हैं?`
          : state.activeLanguage.startsWith("pa")
            ? `ਕੀ ਤੁਸੀਂ ਵਾਕਈ "${task.title}" ਨੂੰ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?`
            : `Are you sure you want to delete "${task.title}"?`;

        speakText(confirmMsg);
        if (carplayPrompt) carplayPrompt.textContent = confirmMsg;
        addChatMessage("bot", confirmMsg);
        return;
      } else {
        reply = `I couldn't find a task matching "${taskQuery}" to delete.`;
      }
    } else {
      reply = "Which task would you like to delete?";
    }
  }

  // 6. FALLBACK HEURISTIC RULES
  // Rule 1: Trip / Travel Context
  if (normalized.includes("trip") || normalized.includes("travel") || normalized.includes("vacation") || normalized.includes("kids")) {
    const tripName = extractTripName(text) || "Hawaii Trip";
    const newItem = createOmniItem({
      type: "todo",
      title: `Pack kids medical essentials for ${tripName} Plan`,
      content: `Verify prescription box, allergy medication, and first-aid supplies. Ingested from request context: "${text}"`,
      category: "Family/Travel",
      topic: `${tripName} Trip`,
      item_priority: 1,
      category_priority: 1,
      date_due: "2026-07-10",
      mode_restrictions: ["Driving", "Outside"]
    });

    state.brainIndex.unshift(newItem);
    state.weekendTasks.unshift(newItem);

    const tripAlertExists = state.alerts.some(a => a.type === "trip");
    if (!tripAlertExists) {
      state.alerts.unshift({
        id: "alert-" + Date.now(),
        type: "trip",
        title: "⚠️ Family Trip Health Checklist Alert",
        content: "Remember your last trip with the kids where you forgot the medical kit! Pack prescription box, allergy medication, and first-aid supplies.",
        actionText: "View Trip Checklist"
      });
    }

    reply = `I've created a Family/Travel checklist for "${tripName}". Based on your last trip where medicals were forgotten, I've raised a proactive alert to remember kids' prescription items.`;
    const cpTicker = document.getElementById("carplay-ticker");
    if (cpTicker) cpTicker.textContent = `💡 PROACTIVE ALERT: Upcoming trip detected! Pack kids medical essentials.`;
  }

  // Rule 2: Solar Panels & Energy bills
  else if (normalized.includes("solar") || normalized.includes("energy") || normalized.includes("bill")) {
    const dateMatch = normalized.match(/(\d{1,2})[\/\-](\d{1,2})/);
    let installDate = "6/19";
    if (dateMatch) {
      installDate = `${dateMatch[1]}/${dateMatch[2]}`;
    }

    const newItem = createOmniItem({
      type: "todo",
      title: "Verify solar savings against energy bill",
      content: `Verify savings and credits 30 days after solar installation date (${installDate}) to confirm net metering activation.`,
      category: "Finance",
      topic: "Solar",
      item_priority: 2,
      category_priority: 2,
      date_due: "2026-07-19",
      mode_restrictions: ["Work", "Driving"]
    });

    state.brainIndex.unshift(newItem);
    state.weekendTasks.unshift(newItem);

    state.alerts.unshift({
      id: "alert-" + Date.now(),
      type: "finance",
      title: "📅 Solar bill month verification",
      content: `Verification due: review the upcoming energy bill 30 days after solar installation date (${installDate}) to verify solar credits.`,
      actionText: "Verify Energy Bill"
    });

    reply = `Recorded solar system completed on ${installDate}. I have set a proactive finance reminder to track energy bill credits in 30 days.`;
  }

  // Rule 3: House maintenance complaints to builder
  else if (normalized.includes("complain") || normalized.includes("builder") || normalized.includes("drywall") || normalized.includes("tile") || normalized.includes("leak") || normalized.includes("fix")) {
    const complaints = extractComplaints(text);

    complaints.forEach(comp => {
      const newItem = createOmniItem({
        type: "todo",
        title: `File builder complaint: ${comp}`,
        content: `Complaint logged for builder warranty repairs: ${comp}`,
        category: "House Maintenance",
        topic: "Builder Warranty",
        item_priority: 2,
        category_priority: 2,
        date_due: "2026-06-27",
        mode_restrictions: ["Work", "Outside"]
      });
      state.brainIndex.unshift(newItem);
      state.weekendTasks.unshift(newItem);
    });

    reply = `I have logged ${complaints.length} builder complaints into your House Maintenance index and synced them to your Weekend Action List.`;
  }

  // Rule 4: Ask about priorities or todo lists
  else if (normalized.includes("todo") || normalized.includes("priority") || normalized.includes("weekend") || normalized.includes("what do i need to do") || normalized.includes("agenda")) {
    const openTasks = getActiveFilteredTasks().filter(t => !t.completed);
    if (openTasks.length > 0) {
      reply = `You have ${openTasks.length} items on your priority list matching your current mode. These include: ${openTasks.slice(0, 3).map(t => t.title).join(", ")}.`;
    } else {
      reply = "Your weekend priority list is clean! Let me know if you want to add any complaints or notes.";
    }
  }

  // Fallback Rule: Tell the user Gemini API is offline/error instead of saving raw text as a task
  else {
    if (state.activeLanguage.startsWith("hi")) {
      reply = "क्षमा करें, मैं इस निर्देश को समझ नहीं सका। जेमिनी एआई प्रोसेसर अभी अनुपलब्ध है (HTTP 403)।";
    } else if (state.activeLanguage.startsWith("pa")) {
      reply = "ਮਾਫ਼ ਕਰਨਾ, ਮੈਂ ਇਸ ਨਿਰਦੇਸ਼ ਨੂੰ ਸਮਝ ਨਹੀਂ ਸਕਿਆ। ਜੇਮਿਨੀ ਏਆਈ ਪ੍ਰੋਸੈਸਰ ਇਸ ਵੇਲੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ (HTTP 403)।";
    } else {
      reply = "Sorry, I couldn't process that command. The Gemini AI processor is currently offline (HTTP 403).";
    }
  }

  saveState();
  renderAll();

  setTimeout(() => {
    addChatMessage("bot", reply);
    speakText(reply);

    if (carplayWrapper && (carplayWrapper.classList.contains("listening") || carplayWrapper.classList.contains("speaking"))) {
      carplayPrompt.textContent = reply;
    }
  }, 600);
}

// Helpers to extract structured text
function extractTripName(text) {
  const matches = text.match(/(?:trip to|travel to|vacation in|visit)\s+([a-zA-Z\s]+)/i);
  return matches ? matches[1].trim() : null;
}

function extractComplaints(text) {
  const cleaned = text.replace(/wife asked/i, "").replace(/to file complaints/i, "").replace(/for lot of issues/i, "");
  const triggers = ["drywall cracks", "drywall crack", "loose tile", "loose tiles", "broken tile", "broken tiles", "leaking pipe", "leaking pipes", "leak", "cracks in living room"];
  const found = [];

  triggers.forEach(trig => {
    if (cleaned.toLowerCase().includes(trig)) {
      found.push(trig);
    }
  });

  if (found.length === 0) {
    found.push(text.length > 50 ? text.substring(0, 50) + "..." : text);
  }
  return found;
}

function findTaskByTitle(query) {
  let match = state.weekendTasks.find(t => t.title.toLowerCase().includes(query.toLowerCase()));
  if (!match) {
    match = state.brainIndex.find(t => t.title.toLowerCase().includes(query.toLowerCase()));
  }
  return match;
}

function deduceCategoryAndTopic(text) {
  const lower = text.toLowerCase();
  let category = "General Tasks";
  let topic = "Scattered Note";
  let item_priority = 3;
  let category_priority = 3;
  let mode_restrictions = [];

  if (lower.includes("solar") || lower.includes("energy") || lower.includes("bill") || lower.includes("electricity") || lower.includes("credit") || lower.includes("savings")) {
    category = "Finance";
    topic = "Solar";
    item_priority = 2;
    category_priority = 2;
    mode_restrictions = ["Work", "Driving"];
  } else if (lower.includes("trip") || lower.includes("travel") || lower.includes("hawaii") || lower.includes("flight") || lower.includes("pack") || lower.includes("med") || lower.includes("kids")) {
    category = "Family/Travel";
    topic = "Hawaii Trip";
    item_priority = 1;
    category_priority = 1;
    mode_restrictions = ["Driving", "Outside"];
  } else if (lower.includes("builder") || lower.includes("complaint") || lower.includes("drywall") || lower.includes("tile") || lower.includes("leak") || lower.includes("paint") || lower.includes("repair") || lower.includes("house") || lower.includes("door")) {
    category = "House Maintenance";
    topic = "Builder Complaint";
    item_priority = 2;
    category_priority = 2;
    mode_restrictions = ["Work", "Outside"];
  } else if (lower.includes("birthday") || lower.includes("gift") || lower.includes("nidhi") || lower.includes("cake")) {
    category = "Family/Travel";
    topic = "Birthday Gift";
    item_priority = 1;
    category_priority = 1;
    mode_restrictions = ["Free", "Outside"];
  } else if (lower.includes("work") || lower.includes("meeting") || lower.includes("office") || lower.includes("report") || lower.includes("project")) {
    category = "Work";
    topic = "Office Task";
    item_priority = 3;
    category_priority = 3;
    mode_restrictions = ["Work"];
  }

  return { category, topic, item_priority, category_priority, mode_restrictions };
}

// Rendering System
function renderAll() {
  renderAlerts();
  renderWeekendTasks();
  renderBrainIndex();
  updateStats();
  renderAnalytics();
  renderChatHistory();
}

function renderAlerts() {
  activeAlertCount.textContent = `${state.alerts.length} Alert${state.alerts.length !== 1 ? 's' : ''}`;

  if (state.alerts.length === 0) {
    proactiveAlertsGrid.innerHTML = `
      <div class="empty-state">
        <p>No active intelligence alerts. You are completely on track!</p>
      </div>
    `;
    return;
  }

  proactiveAlertsGrid.innerHTML = state.alerts.map(alert => {
    const alertClass = alert.type === "trip" ? "trip-alert" : "finance-alert";
    const icon = alert.type === "trip" ? "✈️" : "⚡";
    return `
      <div class="alert-card ${alertClass}">
        <div class="alert-icon">${icon}</div>
        <div class="alert-content">
          <h4>${escapeHtml(alert.title)}</h4>
          <p>${escapeHtml(alert.content)}</p>
          <div style="display:flex; gap:10px;">
            <button class="alert-action-btn" style="background:var(--primary); border:none;" onclick="handleAlertAction('${alert.type}', '${alert.id}')">${escapeHtml(alert.actionText || 'Take Action')}</button>
            <button class="alert-action-btn" onclick="dismissAlert('${alert.id}')">Dismiss</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function dismissAlert(alertId) {
  state.alerts = state.alerts.filter(a => a.id !== alertId);
  saveState();
  renderAlerts();

  addLog(`Acknowledged alert: ${alertId}`, "success");
}

function calculateTaskScore(task, currentMode) {
  const itemP = task.item_priority || 3;
  const catP = task.category_priority || 3;
  const restrictions = task.mode_restrictions || [];

  let Cm = 0.0;
  if (restrictions.includes(currentMode)) {
    Cm = 2.0;
  }

  const score = (6 - itemP) * 0.5 + (6 - catP) * 0.3 + Cm;
  return parseFloat(score.toFixed(2));
}

function getActiveFilteredTasks() {
  const mode = state.currentMode;
  let list = [...state.weekendTasks];

  // Calculate scores
  list.forEach(t => {
    t.score = calculateTaskScore(t, mode);
  });

  // Filter based on mode
  if (mode === "Work") {
    list = list.filter(t => t.category !== "House Maintenance" && t.category !== "Family/Travel");
  } else if (mode === "Driving") {
    list = list.filter(t => (t.mode_restrictions && t.mode_restrictions.includes("Driving")) || t.score >= 3.5);
  }

  // Sort by score descending
  list.sort((a, b) => b.score - a.score);

  return list;
}

function renderWeekendTasks() {
  const list = getActiveFilteredTasks();

  if (list.length === 0) {
    weekendTaskList.innerHTML = `
      <li class="empty-state-list">No pending tasks matching your current mode.</li>
    `;
    return;
  }

  weekendTaskList.innerHTML = list.map(task => {
    const score = calculateTaskScore(task, state.currentMode);
    let badgeColor = "var(--text-muted)";
    if (score >= 4) badgeColor = "var(--accent-pink)";
    else if (score >= 3) badgeColor = "var(--accent-yellow)";
    else if (score >= 2) badgeColor = "var(--accent-cyan)";

    const restrictionsHtml = task.mode_restrictions && task.mode_restrictions.length > 0
      ? `<span style="font-size: 10px; color: var(--text-muted); margin-left: 6px;">[${task.mode_restrictions.join(", ")}]</span>`
      : "";

    return `
      <li class="task-item" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
        <div style="display:flex; align-items: flex-start; gap: 12px; flex-grow: 1;">
          <input type="checkbox" id="${task.id}" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}')">
          <label for="${task.id}" style="${task.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''} cursor: pointer;">
            <strong>${escapeHtml(task.title)}</strong>
            <p style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(task.content)}</p>
            ${restrictionsHtml}
          </label>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
          <span class="score-badge" style="background: rgba(255,255,255,0.05); border: 1px solid ${badgeColor}; border-radius: 6px; padding: 2px 6px; font-size: 10px; color: #fff; font-weight: 600;">S: ${score.toFixed(1)}</span>
          <button class="delete-index-btn" style="font-size: 12px;" onclick="deleteTask('${task.id}')">✕</button>
        </div>
      </li>
    `;
  }).join("");
}

window.toggleTask = function (taskId) {
  const task = state.weekendTasks.find(t => t.id === taskId) || state.brainIndex.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    task.timestamp_completed = task.completed ? new Date().toISOString() : null;

    // sync in both lists
    const tIndex = state.brainIndex.find(t => t.id === taskId);
    if (tIndex) {
      tIndex.completed = task.completed;
      tIndex.timestamp_completed = task.timestamp_completed;
    }
    const tWeek = state.weekendTasks.find(t => t.id === taskId);
    if (tWeek) {
      tWeek.completed = task.completed;
      tWeek.timestamp_completed = task.timestamp_completed;
    }

    saveState();
    renderAll();
    addLog(`Task "${task.title}" status changed.`, "success");
  }
};

window.deleteTask = function (taskId) {
  state.weekendTasks = state.weekendTasks.filter(t => t.id !== taskId);
  state.brainIndex = state.brainIndex.filter(t => t.id !== taskId);
  saveState();
  renderAll();
  addLog("Task removed.", "warning");
};

addQuickTaskBtn.addEventListener("click", () => {
  const val = quickTaskInput.value.trim();
  if (val !== "") {
    const newTask = createOmniItem({
      type: "todo",
      title: val,
      content: "Manually entered quick task.",
      category: "General Tasks",
      topic: "Quick Add",
      item_priority: 3,
      category_priority: 3
    });

    state.weekendTasks.push(newTask);
    state.brainIndex.push(newTask);
    quickTaskInput.value = "";
    saveState();
    renderAll();
    addLog(`Quick task added: "${val}"`, "success");
  }
});

function renderBrainIndex() {
  const searchQuery = globalSearch.value.toLowerCase().trim();
  let filtered = state.brainIndex;

  // Category filter mapping to schema categories
  if (state.activeFilter !== "all") {
    filtered = filtered.filter(item => {
      if (state.activeFilter === "trips") return item.category === "Family/Travel";
      if (state.activeFilter === "house") return item.category === "House Maintenance";
      if (state.activeFilter === "finance") return item.category === "Finance";
      if (state.activeFilter === "work") return item.category === "Work";
      if (state.activeFilter === "general") return item.category === "General Tasks";
      return true;
    });
  }

  let showSearchToAdd = false;

  // Search Filter
  if (searchQuery !== "") {
    const query = searchQuery.toLowerCase();

    // Semantic queries: "wife complained" or "complained"
    const isWifeQuery = query.includes("wife") || query.includes("complain") || query.includes("complained") || query.includes("complaints");
    if (isWifeQuery) {
      filtered = filtered.filter(item =>
        item.category === "House Maintenance" ||
        item.content.toLowerCase().includes("wife") ||
        item.title.toLowerCase().includes("complaint")
      );
    } else {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        (item.topic && item.topic.toLowerCase().includes(query)) ||
        (item.category && item.category.toLowerCase().includes(query))
      );
    }

    // Search-to-add painter checker
    if (query.includes("painter")) {
      const painterExists = state.brainIndex.some(item => item.title.toLowerCase().includes("painter") || item.content.toLowerCase().includes("painter"));
      if (!painterExists) {
        showSearchToAdd = true;
      }
    }
  }

  let searchToAddHtml = "";
  if (showSearchToAdd) {
    searchToAddHtml = `
      <div class="index-item search-to-add-card" style="border: 1px dashed var(--accent-pink); background: rgba(255, 0, 127, 0.05); border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px;">
        <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">🔍 I couldn't find a scheduled task for the painter. Would you like me to create a task for it?</span>
        <button class="alert-action-btn" style="background: var(--accent-pink); border: none; align-self: flex-start; margin-top: 0; padding: 6px 14px; cursor: pointer;" onclick="createPainterTask()">Create Painter Task</button>
      </div>
    `;
  }

  if (filtered.length === 0 && !showSearchToAdd) {
    brainIndexList.innerHTML = `
      <div class="empty-state">
        <p>No knowledge items found matching your selection.</p>
      </div>
    `;
    return;
  }

  brainIndexList.innerHTML = searchToAddHtml + filtered.map(item => {
    let typeIcon = "📄";
    if (item.category === "Family/Travel") typeIcon = "✈️";
    if (item.category === "House Maintenance") typeIcon = "🏠";
    if (item.category === "Finance") typeIcon = "⚡";
    if (item.category === "Work") typeIcon = "💼";

    let actionHtml = "";
    if (item.category === "House Maintenance") {
      actionHtml = `<button class="alert-action-btn" style="margin-top:8px; display:inline-block;" onclick="openComplaintModal('${escapeHtml(item.title)}', '${escapeHtml(item.content)}')">File Warranty Complaint</button>`;
    }

    const dateStr = item.timestamp_created ? item.timestamp_created.split('T')[0] : new Date().toISOString().split('T')[0];
    const tags = [item.topic || "General"];

    return `
      <div class="index-item">
        <div class="index-item-left">
          <div class="index-type-icon">${typeIcon}</div>
          <div class="index-details">
            <h4>${escapeHtml(item.title)}</h4>
            <p>${escapeHtml(item.content)}</p>
            ${actionHtml}
            <div class="index-meta" style="margin-top: 8px;">
              <span class="index-date">Logged on ${dateStr}</span>
              ${tags.map(tag => `<span class="index-tag">#${tag}</span>`).join(" ")}
              <span class="index-tag" style="background: rgba(255,255,255,0.05); color: var(--accent-cyan);">Pri: ${item.item_priority || 3}</span>
            </div>
          </div>
        </div>
        <div class="index-item-right">
          <button class="delete-index-btn" onclick="deleteIndexItem('${item.id}')" title="Delete note">🗑️</button>
        </div>
      </div>
    `;
  }).join("");
}

window.deleteIndexItem = function (id) {
  state.brainIndex = state.brainIndex.filter(item => item.id !== id);
  state.weekendTasks = state.weekendTasks.filter(item => item.id !== id);
  saveState();
  renderBrainIndex();
  addLog(`Deleted item: ${id}`, "warning");
};

globalSearch.addEventListener("input", renderBrainIndex);

function updateStats() {
  const tripsCount = state.brainIndex.filter(i => i.category === "Family/Travel").length;
  const houseCount = state.brainIndex.filter(i => i.category === "House Maintenance").length;
  const financeCount = state.brainIndex.filter(i => i.category === "Finance").length;
  const workCount = state.brainIndex.filter(i => i.category === "Work").length;

  const st = document.getElementById("stat-trips");
  const sh = document.getElementById("stat-complaints");
  const sf = document.getElementById("stat-finance");
  const sw = document.getElementById("stat-work");

  if (st) st.textContent = tripsCount;
  if (sh) sh.textContent = houseCount;
  if (sf) sf.textContent = financeCount;
  if (sw) sw.textContent = workCount;
}

// Feed Sync Simulator
const templates = {
  trip: `From: flight confirmations <airline-bookings@travel-deals.com>
Subject: CONFIRMED - Flight details to Hawaii - Mohit Mittal

Dear Mohit,
Your booking for flight UA-402 on July 10, 2026 is confirmed.
Travel details:
- Passenger: Mohit Mittal, Nidhi Mittal, Rudransh Mittal (Child)
- From: Seattle (SEA) to Honolulu (HNL)
- Return flight scheduled on July 20, 2026.

Thank you for flying with us.`,

  solar: `SMS from: EnergySolutions Solar Installer
Received: 6/19/2026 04:30 PM

Hi Mohit, your solar panel array installation is now complete and fully active! 
Please allow 30 days for the net metering activation. We recommend following up on your energy bill after a month to ensure energy credits are applying correctly.`,

  complaints: `Notes synced from Wife's iCloud Notes:
"Things to complain to the builder this weekend:
- Drywall crack in the living room ceiling corner.
- Broken tile in guest shower cabin.
- Garage door makes a grinding sound on opening.
- Leaking pipes under kitchen sink cabinet needs attention."`
};

function setupSyncSimulator() {
  const buttons = document.querySelectorAll(".template-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-template");
      syncTextarea.value = templates[type] || "";
      addLog(`Loaded mock template: ${type}`, "system");
    });
  });

  runSyncBtn.addEventListener("click", () => {
    const content = syncTextarea.value.trim();
    if (content === "") {
      alert("Please paste some feed content first.");
      return;
    }

    addLog("Starting automated content scan...", "system");

    setTimeout(() => {
      // Analyze text
      const lower = content.toLowerCase();
      let detectedCount = 0;

      if (lower.includes("hawaii") || lower.includes("flight") || lower.includes("airline")) {
        addLog("Sync Match Found: Upcoming Travel Details to Hawaii", "success");
        detectedCount++;
        handleUserInput("Simulated Sync: Trip to Hawaii flight UA-402 confirmed on July 10 with kids.");
      }

      if (lower.includes("solar panel") || (lower.includes("solar") && lower.includes("6/19"))) {
        addLog("Sync Match Found: Solar installation receipt complete (6/19)", "success");
        detectedCount++;
        handleUserInput("Simulated Sync: Solar panel installation complete on 6/19, follow up in a month.");
      }

      if (lower.includes("builder") || lower.includes("complain") || lower.includes("drywall crack") || lower.includes("shower cabin") || lower.includes("leaking pipes")) {
        addLog("Sync Match Found: Wife's builder complaints list", "success");

        let subtasks = [];
        if (lower.includes("drywall crack")) subtasks.push("drywall crack in living room");
        if (lower.includes("broken tile") || lower.includes("shower cabin")) subtasks.push("loose tile in guest bathroom");
        if (lower.includes("garage door")) subtasks.push("garage door grinding noise");
        if (lower.includes("leaking pipes")) subtasks.push("leaking pipes under kitchen sink");

        subtasks.forEach(t => {
          detectedCount++;
          handleUserInput(`Simulated Sync: file builder complaint for ${t}`);
        });
      }

      if (detectedCount === 0) {
        addLog("Scan complete: No structured match found. Logged as unstructured data.", "warning");
        handleUserInput(content);
      } else {
        addLog(`Scan complete: successfully extracted ${detectedCount} parameters and synced with CarPlay.`, "success");
      }

      syncTextarea.value = "";
    }, 1200);
  });
}

function addLog(text, type = "system") {
  const entry = document.createElement("div");
  entry.classList.add("log-entry", type);
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  entry.textContent = `[${time}] ${text}`;
  syncLogOutput.appendChild(entry);
  syncLogOutput.scrollTop = syncLogOutput.scrollHeight;
}

// Enable dismiss Alert globally
window.dismissAlert = dismissAlert;

// Modal Visibility Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
  }
}

// Alert action handlers
function handleAlertAction(type, alertId) {
  // Save active alert ID context to dismiss on save
  state.activeTriggerAlertId = alertId;

  if (type === "trip") {
    renderTripChecklist();
    openModal("modal-trip-checklist");
  } else if (type === "finance") {
    // Reset audit display
    document.getElementById("audit-results").style.display = "none";
    openModal("modal-energy-bill");
  }
}

// Trip Checklist Logic
function renderTripChecklist() {
  const container = document.getElementById("modal-trip-items");
  if (!container) return;

  container.innerHTML = state.tripChecklist.map((item, idx) => `
    <li class="checklist-item-row">
      <div class="checklist-item-row-left">
        <input type="checkbox" id="trip-item-${idx}" ${item.checked ? 'checked' : ''} onchange="toggleTripChecklistItem(${idx})">
        <label for="trip-item-${idx}">${escapeHtml(item.text)}</label>
      </div>
      <button class="delete-index-btn" style="font-size: 11px;" onclick="deleteTripChecklistItem(${idx})">✕</button>
    </li>
  `).join("");
}

function toggleTripChecklistItem(index) {
  if (state.tripChecklist[index]) {
    state.tripChecklist[index].checked = !state.tripChecklist[index].checked;
  }
}

function deleteTripChecklistItem(index) {
  state.tripChecklist.splice(index, 1);
  renderTripChecklist();
}

function addTripChecklistItem() {
  const input = document.getElementById("new-checklist-item-input");
  const val = input.value.trim();
  if (val !== "") {
    state.tripChecklist.push({ text: val, checked: false });
    input.value = "";
    renderTripChecklist();
  }
}

function saveTripChecklist() {
  saveState();
  closeModal("modal-trip-checklist");

  // Acknowledge trigger alert
  if (state.activeTriggerAlertId) {
    dismissAlert(state.activeTriggerAlertId);
    state.activeTriggerAlertId = null;
  }

  addLog("Trip essentials checklist updated and synchronized with CarPlay dashboard.", "success");

  // Verbal response
  speakText("Your trip checklist is updated and synchronized. CarPlay will prompt you to pack remaining essentials when you start your route.");
}

// House Builder Complaint Modal Logic
function openComplaintModal(title, content) {
  openModal("modal-file-complaint");

  const subject = document.getElementById("complaint-subject");
  const body = document.getElementById("complaint-body-text");

  subject.value = `Warranty Repair Request: ${title}`;
  body.value = `Hello Builder Warranty Support,\n\nI am filing a formal request to fix the following issue:\n\n${content}\n\nPlease contact me at your earliest convenience to schedule a repair technician.\n\nBest regards,\nMohit Mittal`;

  // Reset send button
  const sendBtn = document.getElementById("send-complaint-email-btn");
  sendBtn.textContent = "Simulate Send Email";
  sendBtn.disabled = false;
  sendBtn.style.opacity = "1";
}

document.getElementById("send-complaint-email-btn").addEventListener("click", () => {
  const btn = document.getElementById("send-complaint-email-btn");
  btn.textContent = "Sending...";
  btn.disabled = true;
  btn.style.opacity = "0.7";

  setTimeout(() => {
    btn.textContent = "✓ Sent Successfully!";

    // Add success note in sync log
    addLog(`Warranty claim submitted to builder for: "${document.getElementById("complaint-subject").value}"`, "success");

    // Add chat confirmation
    setTimeout(() => {
      closeModal("modal-file-complaint");

      const successMsg = "I've filed the builder complaint and saved the submission receipt in your brain history. A warranty specialist should contact you shortly.";
      addChatMessage("bot", successMsg);
      speakText(successMsg);
    }, 1000);
  }, 1500);
});

// Energy Bill Auditor Logic
function runEnergyAudit() {
  const solarGen = parseFloat(document.getElementById("solar-gen-input").value) || 0;
  const gridCon = parseFloat(document.getElementById("grid-con-input").value) || 0;
  const netCharge = parseFloat(document.getElementById("bill-charge-input").value) || 0;

  const resultsBox = document.getElementById("audit-results");
  resultsBox.style.display = "flex";

  const totalOffset = Math.round((solarGen / gridCon) * 100);
  const netMeteringStatus = totalOffset >= 80 ? "Net Metering Active (Excellent offset!)" : "Net Metering Active (Moderate offset)";

  resultsBox.innerHTML = `
    <h4>Audit Results</h4>
    <p><strong>Status:</strong> ${netMeteringStatus}</p>
    <p>Your solar installation covers <strong>${totalOffset}%</strong> of your grid consumption this month.</p>
    <div class="audit-stat-row">
      <span>Solar Generation:</span>
      <span>${solarGen} kWh</span>
    </div>
    <div class="audit-stat-row">
      <span>Grid Consumed:</span>
      <span>${gridCon} kWh</span>
    </div>
    <div class="audit-stat-row">
      <span>Final Charge:</span>
      <span>$${netCharge.toFixed(2)}</span>
    </div>
  `;

  // Log to history index
  state.brainIndex.unshift({
    id: "idx-" + Date.now(),
    type: "finance",
    title: `Solar Bill Audit - June/July 2026`,
    content: `Energy bill audit logged. Solar Offset: ${totalOffset}% (${solarGen} kWh generated, ${gridCon} kWh grid consumed). Net cost: $${netCharge.toFixed(2)}.`,
    date: new Date().toISOString().split('T')[0],
    tags: ["Solar Audit", "Finance", "Energy Bill"]
  });

  // Acknowledge trigger alert
  if (state.activeTriggerAlertId) {
    dismissAlert(state.activeTriggerAlertId);
    state.activeTriggerAlertId = null;
  }

  saveState();
  renderBrainIndex();

  addLog(`Solar month audit complete: offset ${totalOffset}%, final charge $${netCharge}`, "success");

  setTimeout(() => {
    closeModal("modal-energy-bill");

    const reply = `Solar bill audit is complete. Your system achieved a ${totalOffset}% offset. I have logged these numbers in your finance index history.`;
    addChatMessage("bot", reply);
    speakText(reply);
  }, 3500);
}

// Attach helpers to window for button onclick handlers
window.openModal = openModal;
window.closeModal = closeModal;
window.handleAlertAction = handleAlertAction;
window.toggleTripChecklistItem = toggleTripChecklistItem;
window.deleteTripChecklistItem = deleteTripChecklistItem;
window.addTripChecklistItem = addTripChecklistItem;
window.saveTripChecklist = saveTripChecklist;
window.openComplaintModal = openComplaintModal;
window.runEnergyAudit = runEnergyAudit;

// v2.0 Ingest, mode, and analytics helper functions
function createOmniItem({
  type = "todo",
  title,
  content = "",
  category = "General Tasks",
  topic = "General",
  item_priority = 3,
  category_priority = 3,
  date_due = null,
  mode_restrictions = [],
  completed = false
}) {
  return {
    id: "omni-" + Math.random().toString(36).substr(2, 9) + "-" + Date.now(),
    type,
    title,
    content,
    category,
    topic,
    item_priority: parseInt(item_priority),
    category_priority: parseInt(category_priority),
    date_due,
    mode_restrictions,
    completed,
    timestamp_created: new Date().toISOString(),
    timestamp_completed: null
  };
}

function updateActiveMode(newMode) {
  state.currentMode = newMode;
  const modeSelect = document.getElementById("current-mode-select");
  if (modeSelect) {
    modeSelect.value = newMode;
  }

  const cpWrapper = document.querySelector(".carplay-wrapper");
  const cpBtn = document.getElementById("cp-driving-mode-btn");
  if (newMode === "Driving") {
    document.body.classList.add("eyes-free");
    if (cpWrapper) cpWrapper.classList.add("eyes-free-carplay");
    if (cpBtn) {
      cpBtn.textContent = "Driving Mode: ON";
      cpBtn.style.background = "rgba(16, 185, 129, 0.2)";
      cpBtn.style.borderColor = "rgba(16, 185, 129, 0.4)";
    }
    addLog("Driving mode active: Locked text-heavy console, eyes-free HUD running.", "warning");
  } else {
    document.body.classList.remove("eyes-free");
    if (cpWrapper) cpWrapper.classList.remove("eyes-free-carplay");
    if (cpBtn) {
      cpBtn.textContent = "Toggle Driving Mode";
      cpBtn.style.background = "rgba(239, 68, 68, 0.2)";
      cpBtn.style.borderColor = "rgba(239, 68, 68, 0.4)";
    }
  }

  saveState();
  renderAll();
}

function runLifecycleTracker() {
  const today = new Date("2026-06-20"); // Fixed system current date for consistent testing
  let updated = false;

  state.brainIndex.forEach(item => {
    if (item.type === "birthday") {
      const dueDate = new Date(item.date_due);
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 5) {
        const helperTaskTitle = `Buy birthday card/gift for ${item.title}`;
        const exists = state.weekendTasks.some(t => t.title === helperTaskTitle);
        if (!exists) {
          const helperTask = createOmniItem({
            type: "todo",
            title: helperTaskTitle,
            content: `Automated lifecycle task generated 5 days prior to ${item.title} (${item.date_due}).`,
            category: "Family/Travel",
            topic: "Birthday Gift",
            item_priority: 2,
            category_priority: 1,
            date_due: item.date_due,
            mode_restrictions: ["Outside", "Free"]
          });
          state.weekendTasks.unshift(helperTask);
          state.brainIndex.unshift(helperTask);
          updated = true;
          addLog(`Lifecycle Auto-Trigger: Generated task "${helperTaskTitle}"`, "success");
        }
      }
    }
  });

  if (updated) {
    saveState();
  }
}

function renderAnalytics() {
  // 1. Efficiency gauge
  const completedTasks = state.weekendTasks.filter(t => t.completed);
  const totalTasks = state.weekendTasks.length;
  let efficiency = 0;

  if (totalTasks > 0) {
    const onTimeCount = state.weekendTasks.filter(t => {
      if (!t.completed) return false;
      if (!t.date_due) return true;

      const compDate = new Date(t.timestamp_completed);
      const dueDate = new Date(t.date_due);
      compDate.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      return compDate <= dueDate;
    }).length;

    efficiency = Math.round((onTimeCount / totalTasks) * 100);
  }

  const gaugeFill = document.getElementById("efficiency-gauge-fill");
  const gaugeText = document.getElementById("efficiency-gauge-text");
  if (gaugeFill && gaugeText) {
    const offset = 251.2 - (251.2 * efficiency) / 100;
    gaugeFill.style.strokeDashoffset = offset;
    gaugeText.textContent = `${efficiency}%`;
  }

  // 2. 7-Day Burndown Line Chart in SVG
  const burndownSvg = document.getElementById("burndown-svg");
  if (burndownSvg) {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date("2026-06-20");
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const injectedCounts = dates.map(dateStr => {
      return state.weekendTasks.filter(t => t.timestamp_created && t.timestamp_created.startsWith(dateStr)).length;
    });

    const completedCounts = dates.map(dateStr => {
      return state.weekendTasks.filter(t => t.completed && t.timestamp_completed && t.timestamp_completed.startsWith(dateStr)).length;
    });

    const maxVal = Math.max(...injectedCounts, ...completedCounts, 3);

    let svgHtml = "";

    // Y-axis grid
    for (let i = 0; i <= 3; i++) {
      const y = 10 + i * 30;
      const val = Math.round(maxVal - (maxVal / 3) * i);
      svgHtml += `<line x1="30" y1="${y}" x2="270" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1" />`;
      svgHtml += `<text x="5" y="${y + 4}" fill="var(--text-muted)" font-size="8" font-family="var(--font-family)">${val}</text>`;
    }

    // X axis labels
    dates.forEach((dStr, idx) => {
      const x = 30 + idx * 40;
      const label = dStr.substring(8, 10);
      svgHtml += `<text x="${x}" y="115" fill="var(--text-muted)" font-size="8" font-family="var(--font-family)" text-anchor="middle">${label}</text>`;
    });

    const getCoords = (counts) => {
      return counts.map((val, idx) => {
        const x = 30 + idx * 40;
        const y = 100 - (val / maxVal) * 90;
        return `${x},${y}`;
      }).join(" ");
    };

    const injectedPoints = getCoords(injectedCounts);
    const completedPoints = getCoords(completedCounts);

    svgHtml += `<polyline points="${injectedPoints}" fill="none" stroke="var(--accent-cyan)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`;
    svgHtml += `<polyline points="${completedPoints}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`;

    dates.forEach((_, idx) => {
      const ix = 30 + idx * 40;
      const iy = 100 - (injectedCounts[idx] / maxVal) * 90;
      const cy = 100 - (completedCounts[idx] / maxVal) * 90;

      svgHtml += `<circle cx="${ix}" cy="${iy}" r="3.5" fill="var(--bg-dark)" stroke="var(--accent-cyan)" stroke-width="2" />`;
      svgHtml += `<circle cx="${ix}" cy="${cy}" r="3.5" fill="var(--bg-dark)" stroke="var(--primary)" stroke-width="2" />`;
    });

    svgHtml += `
      <g transform="translate(140, 5)" font-size="8" font-family="var(--font-family)">
        <circle cx="10" cy="5" r="3" fill="var(--accent-cyan)" />
        <text x="18" y="8" fill="var(--text-secondary)">Injected</text>
        <circle cx="70" cy="5" r="3" fill="var(--primary)" />
        <text x="78" y="8" fill="var(--text-secondary)">Completed</text>
      </g>
    `;

    burndownSvg.innerHTML = svgHtml;
  }

  // 3. Upcoming events
  const lifecycleEventsList = document.getElementById("lifecycle-events-list");
  if (lifecycleEventsList) {
    const list = state.brainIndex.filter(i => i.type === "birthday" || i.type === "appointment");
    if (list.length === 0) {
      lifecycleEventsList.innerHTML = `<li style="font-size: 11px; color: var(--text-muted); font-style: italic;">No events scheduled.</li>`;
    } else {
      lifecycleEventsList.innerHTML = list.map(item => {
        const dateStr = new Date(item.date_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const icon = item.type === "birthday" ? "🎂" : "📅";
        return `
          <li style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 6px 10px; font-size: 11.5px;">
            <span>${icon} <strong>${escapeHtml(item.title)}</strong></span>
            <span style="color: var(--accent-cyan); font-weight: 500;">${dateStr}</span>
          </li>
        `;
      }).join("");
    }
  }
}

function setupSightIngestion() {
  const imageTemplates = document.querySelectorAll(".image-template-btn");
  const dragZone = document.getElementById("image-drag-zone");
  const fileInput = document.getElementById("image-file-input");

  if (imageTemplates) {
    imageTemplates.forEach(btn => {
      btn.addEventListener("click", () => {
        const imgType = btn.getAttribute("data-image");
        runOcrScanner(imgType);
      });
    });
  }

  if (dragZone && fileInput) {
    dragZone.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        runOcrScanner("custom", e.target.files[0]);
      }
    });

    dragZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dragZone.style.borderColor = "var(--accent-cyan)";
      dragZone.style.background = "rgba(0, 245, 212, 0.05)";
    });

    dragZone.addEventListener("dragleave", () => {
      dragZone.style.borderColor = "rgba(255, 255, 255, 0.15)";
      dragZone.style.background = "rgba(0,0,0,0.1)";
    });

    dragZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dragZone.style.borderColor = "rgba(255, 255, 255, 0.15)";
      dragZone.style.background = "rgba(0,0,0,0.1)";
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        runOcrScanner("custom", e.dataTransfer.files[0]);
      }
    });
  }
}

function runOcrScanner(imgType, file = null) {
  const overlay = document.getElementById("ocr-scanning-overlay");
  const progressBar = document.getElementById("ocr-progress-bar");
  const statusText = document.getElementById("ocr-status-text");

  if (!overlay || !progressBar || !statusText) return;

  overlay.style.display = "flex";
  progressBar.style.width = "0%";
  statusText.textContent = "Sight Engine: Initializing OCR scan...";

  addLog(`Ingesting sight media: ${file ? file.name : imgType + " template"}`, "system");

  let progress = 0;
  const statusMessages = [
    { limit: 20, text: "Sight Engine: Running OCR layout analysis..." },
    { limit: 50, text: "Sight Engine: Extracting text from image..." },
    { limit: 80, text: "Sight Engine: Deducing semantic intent..." },
    { limit: 95, text: "Sight Engine: Auto-routing task parameters..." }
  ];

  const interval = setInterval(() => {
    progress += 5;
    progressBar.style.width = `${progress}%`;

    const msg = statusMessages.find(m => progress <= m.limit);
    if (msg) {
      statusText.textContent = msg.text;
    } else {
      statusText.textContent = "Sight Engine: Compiling task template...";
    }

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        overlay.style.display = "none";
        completeOcrSync(imgType, file);
      }, 300);
    }
  }, 80);
}

function completeOcrSync(imgType, file = null) {
  let draftedTask = null;
  let ocrResponse = "";

  if (imgType === "bill") {
    ocrResponse = "OCR SUCCESS: Energy bill savings check - Solar panel install date 6/19. Net metering audit due after 30 days.";
    draftedTask = createOmniItem({
      type: "todo",
      title: "Verify energy bill solar credits (Month 1 post-installation)",
      content: "Ingested via Sight Interface OCR (Energy Bill template). Solar installation audit and savings verification due in 30 days.",
      category: "Finance",
      topic: "Solar",
      item_priority: 2,
      category_priority: 2,
      date_due: "2026-07-19",
      mode_restrictions: ["Work", "Driving"]
    });
  } else if (imgType === "wall") {
    ocrResponse = "OCR SUCCESS: Living room drywall cracking photo. Repair warranty submission needed.";
    draftedTask = createOmniItem({
      type: "todo",
      title: "File builder complaint: kitchen drywall cracks",
      content: "Ingested via Sight Interface OCR (Drywall photo template). File builder warranty claim for structural drywall cracks inside cabinet corner.",
      category: "House Maintenance",
      topic: "Drywall",
      item_priority: 1,
      category_priority: 2,
      date_due: "2026-06-27",
      mode_restrictions: ["Outside", "Work"]
    });
  } else if (imgType === "flight") {
    ocrResponse = "OCR SUCCESS: Flight HNL-SEA July 10 passenger list includes Rudransh Mittal (child).";
    draftedTask = createOmniItem({
      type: "todo",
      title: "Pack kids medical essentials for Hawaii Plan",
      content: "Ingested via Sight Interface OCR (Flight booking screenshot). Travel with kids detected. Pack prescription box, allergy medication, and first-aid supplies.",
      category: "Family/Travel",
      topic: "Hawaii Trip",
      item_priority: 1,
      category_priority: 1,
      date_due: "2026-07-10",
      mode_restrictions: ["Outside", "Driving"]
    });
  } else {
    const titleText = file ? file.name.split('.')[0] : "Uploaded Document";
    ocrResponse = `OCR SUCCESS: Scanned custom file "${file ? file.name : 'image.png'}". Extracted text.`;
    draftedTask = createOmniItem({
      type: "todo",
      title: `Review document: ${titleText}`,
      content: `OCR Extracted content from custom sight uploader: "${ocrResponse}"`,
      category: "General Tasks",
      topic: "Document Ingestion",
      item_priority: 3,
      category_priority: 3,
      date_due: "2026-06-27",
      mode_restrictions: ["Work"]
    });
  }

  state.brainIndex.unshift(draftedTask);
  state.weekendTasks.unshift(draftedTask);

  // Proactively generate corresponding alerts
  if (imgType === "flight") {
    const hasTripAlert = state.alerts.some(a => a.type === "trip");
    if (!hasTripAlert) {
      state.alerts.unshift({
        id: "alert-" + Date.now(),
        type: "trip",
        title: "⚠️ Family Trip Health Checklist Alert",
        content: "Remember your last trip with the kids where you forgot the medical kit! Pack prescription box, allergy medication, and first-aid supplies.",
        actionText: "View Trip Checklist"
      });
    }
  } else if (imgType === "bill") {
    const hasFinanceAlert = state.alerts.some(a => a.type === "finance");
    if (!hasFinanceAlert) {
      state.alerts.unshift({
        id: "alert-" + Date.now(),
        type: "finance",
        title: "📅 Solar energy bill verification",
        content: "Verification due: review the upcoming energy bill 30 days after solar installation date (6/19) to verify solar credits.",
        actionText: "Verify Energy Bill"
      });
    }
  }

  saveState();
  renderAll();

  addLog(ocrResponse, "success");

  const botReply = `I've ingested the image, run OCR text analysis, and automatically drafted a task: "${draftedTask.title}". It has been added to your priority list.`;
  addChatMessage("bot", botReply);
  speakText(botReply);
}

function setupModeControls() {
  const modeSelect = document.getElementById("current-mode-select");
  const briefingNInput = document.getElementById("briefing-n-input");
  const cpBtn = document.getElementById("cp-driving-mode-btn");
  const langSelect = document.getElementById("current-lang-select");
  const resetBtn = document.getElementById("reset-brain-btn");

  if (modeSelect) {
    modeSelect.value = state.currentMode;
    modeSelect.addEventListener("change", (e) => {
      updateActiveMode(e.target.value);
    });
  }

  if (briefingNInput) {
    briefingNInput.value = state.briefingN;
    briefingNInput.addEventListener("change", (e) => {
      let val = parseInt(e.target.value) || 3;
      if (val < 1) val = 1;
      if (val > 5) val = 5;
      state.briefingN = val;
      saveState();
      addLog(`Updated Briefing Count settings: N = ${val}`, "success");
    });
  }

  if (langSelect) {
    langSelect.value = state.activeLanguage;
    langSelect.addEventListener("change", (e) => {
      state.activeLanguage = e.target.value;
      if (recognition) {
        recognition.lang = e.target.value;
      }
      saveState();
      addLog(`System language locale code switched to: ${e.target.value}`, "success");

      const welcomeMsg = e.target.value.startsWith("hi") ? "नमस्ते मोहित, भाषा बदल दी गई है।" : e.target.value.startsWith("pa") ? "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਮੋਹਿਤ, ਭਾਸ਼ਾ ਬਦਲ ਦਿੱਤੀ ਗਈ ਹੈ।" : "System language updated successfully.";
      addChatMessage("bot", welcomeMsg);
      speakText(welcomeMsg);
    });
  }

  if (cpBtn) {
    cpBtn.addEventListener("click", () => {
      const nextMode = state.currentMode === "Driving" ? "Free" : "Driving";
      updateActiveMode(nextMode);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to completely reset all items and start fresh?")) {
        localStorage.removeItem("omnimind_index");
        localStorage.removeItem("omnimind_alerts");
        localStorage.removeItem("omnimind_tasks");
        localStorage.removeItem("omnimind_trip_checklist");
        localStorage.removeItem("omnimind_chathistory");

        state.brainIndex = [];
        state.alerts = [];
        state.weekendTasks = [];
        state.tripChecklist = [
          { text: "Children's Prescription Box", checked: false },
          { text: "Allergy Medication (Zyrtec/EpiPen)", checked: false },
          { text: "First-aid Supplies & Bandaids", checked: false }
        ];
        state.chatHistory = [
          {
            sender: "bot",
            text: "Hello Mohit. I am monitoring your context. You can type or speak to add items, ask about upcoming tasks, or log notes. How can I help you today?"
          }
        ];

        saveState();
        renderAll();
        addLog("Database reset successfully: clean slate active.", "warning");
        speakText("Brain database reset to clean slate.");
      }
    });
  }

  if (state.currentMode === "Driving") {
    updateActiveMode("Driving");
  }
}

function runCarPlayBriefing() {
  const n = state.briefingN || 3;
  const list = getActiveFilteredTasks().filter(t => !t.completed);

  if (list.length === 0) {
    const text = `Mohit, you are currently in ${state.currentMode} mode. You have no pending tasks.`;
    speakText(text);
    if (carplayPrompt) carplayPrompt.textContent = text;
    return;
  }

  const topTasks = list.slice(0, n);
  const nTasksText = topTasks.map((t, idx) => {
    const prefixes = ["First", "Second", "Third", "Fourth", "Fifth"];
    const prefix = prefixes[idx] || `${idx + 1}th`;
    return `${prefix}: ${t.title}.`;
  }).join(" ");

  const fullText = `Mohit, you are currently in ${state.currentMode} mode. You have ${list.length} top-priority tasks matching your current path. ${nTasksText} Shall I draft the response for the first item now?`;

  speakText(fullText);
  if (carplayPrompt) carplayPrompt.textContent = `briefing top ${topTasks.length} tasks: ${topTasks.map(t => t.title).join(", ")}`;
}

window.createPainterTask = function () {
  const newTask = createOmniItem({
    type: "todo",
    title: "Schedule painter for home maintenance",
    content: "Automatically created via search-to-add pipeline. Contact painting contractor to paint drywall patches and window trims.",
    category: "House Maintenance",
    topic: "Painter",
    item_priority: 3,
    category_priority: 2,
    date_due: "2026-06-27",
    mode_restrictions: ["Outside", "Work"]
  });

  state.brainIndex.unshift(newTask);
  state.weekendTasks.unshift(newTask);

  const globalSearch = document.getElementById("global-search");
  if (globalSearch) globalSearch.value = "";

  saveState();
  renderAll();

  addLog("Search-to-Add Trigger: Created task 'Schedule painter for home maintenance'", "success");

  const botReply = "I couldn't find a scheduled painter in your logs, so I have created a new task to schedule the painter and added it to your weekend action plan.";
  addChatMessage("bot", botReply);
  speakText(botReply);
};

window.createOmniItem = createOmniItem;
window.updateActiveMode = updateActiveMode;
window.runLifecycleTracker = runLifecycleTracker;
window.renderAnalytics = renderAnalytics;
window.setupSightIngestion = setupSightIngestion;
window.runOcrScanner = runOcrScanner;
window.completeOcrSync = completeOcrSync;
window.setupModeControls = setupModeControls;
window.runCarPlayBriefing = runCarPlayBriefing;
