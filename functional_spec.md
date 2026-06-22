# OmniMind - Functional Specification Document

## 1. Overview & Objectives
OmniMind is a personal intelligence assistant and knowledge de-fragmentation engine. It consolidates dispersed chores, emails, notifications, builder complaints, and travel details into an organized brain index. It enables hands-free voice control (suitable for CarPlay on-road use) and proactively alarms users of critical preparation steps based on historical travel data and scheduled installation logs.

### Objectives:
*   **Consolidate scattered lists**: Auto-compile weekly notes and synced messages into a unified Weekend Action list.
*   **Proactive alerts**: Warn the user of critical checklist tasks (like kids' medical kits) before family trips without being asked.
*   **Time-interval tracking**: Remind users of follow-up chores (e.g., checking energy bills 30 days after a solar installation).
*   **Warranty complaints logger**: Capture domestic builder repairs asked by household partners and compile them for submission.
*   **Hands-free voice assistant**: Provide a CarPlay-friendly console running voice recognition input and speech readout feedback.

---

## 2. User Scenarios & Workflows

### Scenario A: Commuter CarPlay Voice Input
1.  User enters CarPlay Console mode while driving.
2.  User says: *"Hey Omni, file a builder complaint for drywall cracks in the guest room."*
3.  The system:
    *   Listens using browser speech recognition.
    *   Triggers the glowing orb animation.
    *   Parses the input, categorizes it under **House Complaints**, and adds a corresponding task to the **Weekend Action List**.
    *   Responds verbally via text-to-speech: *"I have logged a builder complaint for the guest room drywall cracks and added it to your weekend tasks."*

### Scenario B: Proactive Family Trip Setup
1.  An email arrives confirming flight bookings for a family trip. The user inputs this email into the **Feed Sync** panel.
2.  The system analyzes the email text:
    *   Identifies travel locations and passenger names.
    *   Flags the keyword "kids" or child passenger details.
    *   Cross-references historical trip files, identifying that "medicals were forgotten last time."
    *   Generates a high-priority red alert banner: **⚠️ Upcoming Family Trip Checklist**.
    *   Appends a task: *Assemble & check kids' medical kits* to the Weekend Action List.
3.  The user clicks "View Checklist" on the alert banner, opening the **Trip Essentials Checklist** modal to double-check allergy medications and prescriptions.

### Scenario C: Solar Month-End Savings Audit
1.  User uploads or inputs a text confirmation: *"Solar panels installed on 6/19."*
2.  The system parses the date and logs a finance tracker index.
3.  The scheduler sets an alarm trigger date for exactly 30 days later (July 19, 2026).
4.  On the dashboard, an active alert states: **📅 Solar Bill Month Check (July 19)**.
5.  Clicking "Verify Energy Bill" opens the **Savings Auditor Modal**.
    *   User inputs actual solar generation (kWh) vs grid consumption (kWh).
    *   The tool calculates net energy offsets and displays a status card.
    *   The system saves the audit log into the finance database and dismisses the alert.

---

## 3. Feature Specifications

### 3.1 Input Parser Engine (NLP Rules Simulator)
*   **Ingestion Filters**:
    *   *Trip Trigger*: Matches: `trip`, `travel`, `vacation`, `flight`, `kids`. Creates trip entities and proactive checklists.
    *   *Solar Tracker Trigger*: Matches: `solar`, `energy`, `bill`, `installed`. Sets +30 days verification alarms.
    *   *Repair Trigger*: Matches: `builder`, `complaint`, `drywall`, `tile`, `leak`, `fix`. Adds tasks directly to weekend focus list.
*   **Search Engine**: Real-time filtering scans title, content, and tags.

### 3.2 Proactive Alerts Panel
*   **Visual States**: Uses color coding for alert urgency (e.g. green/blue info flags vs red critical alarms).
*   **Interaction**: Each card supports a "Take Action" target (opens specific modal context) and a "Dismiss" option.

### 3.3 Weekend Priorities Consolidation
*   **Auto-aggregation**: Weekly repairs and scheduled billing audits are clustered into a checklist.
*   **Task Controls**: Users can toggle task completion, delete tasks, or type to add quick entries.

### 3.4 CarPlay Dashboard Console
*   **Orb States**:
    *   *Idle*: Pulsing deep blue circle.
    *   *Listening*: Multi-color radial gradient pulsing rapidly (cyan/magenta/purple).
    *   *Speaking*: Radial ripple animation showing vocal speech feedback.
*   **Quick Targets**: Enlarged layout boxes for maps/mic/briefing triggers to fit dashboard screen constraints.

### 3.5 Action Modals
*   **Trip Checklist**: Checked list containing prescription controls, tickets, and swimwear. Allows adding custom check items.
*   **Warranty Complaint Email Composer**: Prefills service emails (`warranty@custombuilders.com`) containing problem descriptions. Simulates mail delivery loading animations.
*   **Energy Auditor**: Performs division arithmetic (`Solar Generation / Grid Consumed`) to output net offset percentage figures and logs reports.

---

## 4. Technical Constraints & Architecture
*   **Browser Compatibility**: Speech Recognition requires Chrome/Edge (`webkitSpeechRecognition`). Speech Synthesis uses the standard `SpeechSynthesisUtterance` package.
*   **Data Persistence**: Client-side storage uses the `localStorage` key-value API.
*   **Styling & UI**: Fluid viewport heights, glassmorphic filters, CSS keyframes, and CSS layout grids.
