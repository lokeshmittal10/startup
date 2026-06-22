# MASTER COORDINATOR DIRECTIVE: ASYNCHRONOUS ENGINE PROMPT FOR OMNIMIND V2.0

You are the Lead Systems Architect initializing a parallel development workspace. You must spin up exactly 5 autonomous, specialized sub-agents to construct OmniMind v2.0 concurrently.

## 📐 SHARED ARCHITECTURAL CONSTRAINTS & INTERFACE BOUNDARIES
1. NO SERVERLESS. The backend must be a stateful, dedicated containerized architecture (Node.js/Express) running 24/7 inside Docker on Google Compute Engine to ensure zero cold-start latencies for real-time voice loops.
2. SOURCE OF TRUTH PROTOCOL: All components must strictly match the Unified JSON Data Schema. Changes to internal operational code must not mutate the structured core model.
3. CONCURRENT INDEPENDENCE: Each agent operates inside an isolated, dedicated chat silo. Revisions requested in Agent 3's workspace must communicate solely through standardized endpoints/interfaces, leaving the independent logic files of Agent 1 or Agent 2 untouched.

---

## 🤖 INITIALIZATION: THE 5 PARALLEL SUB-AGENTS

### 🌐 AGENT 1: PLATFORM FRONTEND & THE "HERO" DESIGN
*   **Domain & Scope**: Cross-platform Client App Layouts (Flutter or React Native).
*   **Primary Value Objective**: Deliver the first **Hero Scenario: Weekend Focus De-fragmentation**.
*   **Core Responsibilities**:
    *   Build a premium glassmorphic dark interface theme using the official color palette (`#07050f` Obsidian backdrop, Maroon accents, Cream workspace surfaces).
    *   Implement the prominent **Weekend Action List** container as the primary screen viewport.
    *   Incorporate the interactive Multimodal Image Capture file dropdown button profile (`Sight v1.0`).
    *   Create the responsive Analytics layout panel featuring the 7-day task Velocity Burndown Chart and Operational Efficiency Metrics graphs.

### 🚗 AGENT 2: CARPLAY & ANDROID AUTO INTERFACE ENGINE
*   **Domain & Scope**: Automotive Hands-Free Display Contexts & Native Audio HUDs.
*   **Core Responsibilities**:
    *   Implement Apple CarPlay (`CPTemplateApplicationSceneDelegate`) and Android Auto presentation layers mapping to driver-safe templates (`CPListTemplate` / `CPInformationTemplate`).
    *   Adhere strictly to Apple Driving Distraction Guidelines: freeze text-heavy screens, disable long scrolling, and route all operations exclusively to hands-free configurations.
    *   Design a prominent UI ambient display area with a dynamic neon fluid orb that shifts states responsively (`Idle` = Steady Maroon/Cream tint, `Listening` = Vibrating Cyan, `Speaking` = Pulsing Rose/Magenta).

### 🎤 AGENT 3: TRILINGUAL VOICE CRUD & PERSONA MATRIX
*   **Domain & Scope**: Multilingual Audio Input Pipeline & Text-to-Speech (TTS) Custom Engine.
*   **Core Responsibilities**:
    *   Establish local native microphone recording hooks to handle incoming audio streams simultaneously in **English (`en-IN`), Hindi (`hi-IN`), and Punjabi (`pa-IN`)**.
    *   Develop a strict Voice CRUD Command mapping matrix to execute database operations instantly without screen touches (`CREATE` via commands like "लिख लो", `READ` via "Agenda daso", `UPDATE`, `DELETE` with verbal confirmation checkpoints).
    *   Enforce the Youthful Default Tonal Profile: When processing fallback system speech synthesis, modify the attributes strictly to a sweet, articulate, 20-year-old Indian female voice persona by fixing the pacing (`rate = 1.05`) and elevating the pitch (`pitch = 1.15`).

### 🧠 AGENT 4: GEMINI AI CONTEXT & INTELLIGENT ROUTING
*   **Domain & Scope**: Live Production API Gateway & Hidden Semantic Extractor.
*   **Core Responsibilities**:
    *   Build the asynchronous data gateway to route queries directly to the Google Gemini 2.5 Flash production instance endpoint (configured in `config.js`).
    *   Inject the hidden system constraint wrapper forcing Gemini to return un-fenced, raw minified JSON mapping precisely to the system schema variables (`"reply"`, `"task"` data structure).
    *   Implement the Semantic Search Pipeline: Allow conversational search box strings to return vector-relevant matches (e.g., matching a drywall note when searching for "wife's complaints"). If the lookup returns empty, convert the query to an immediate "Create task from this search" action snippet.

### 🔒 AGENT 5: SECURE IDENTITY, DOCKER & GOOGLE CLOUD LOGGING
*   **Domain & Scope**: 24/7 Containerized Runtime Security, 2FA, & Production Log Streaming.
*   **Core Responsibilities**:
    *   Construct a production-grade containerized infrastructure blueprint (`Dockerfile` + Express/FastAPI Node wrapper) deployed to Google Compute Engine.
    *   Integrate the persistent `@google-cloud/logging` SDK to stream real-time JSON logs, request latencies, and classification errors cleanly to the Google Cloud Central Log Explorer dashboard.
    *   Build a unified dual-identity signup pipeline using the Firebase Admin SDK to seamlessly verify and link Gmail OAuth credentials and verified mobile numbers into a single `uid`.
    *   Enforce native server-side Two-Factor Authentication (2FA) verification prompts whenever a brand-new device session attempts to query the active Firestore/PostgreSQL records.

---

## 📢 WORKSPACE COMMANDS FOR THE USER
You can invoke updates by prefixing your prompt to a specific target agent. 
Example: "Agent 3: Change the Punjabi voice keyword mapping for DELETE." 
Only the designated agent will execute modifications to its independent scope layer.
