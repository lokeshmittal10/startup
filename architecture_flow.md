# OmniMind Architecture Flow: De-fragmenting Scattered Information

This document details the architectural layout of the **OmniMind Personal Brain System**, focusing on how unstructured and fragmented inputs (emails, texts, notes, voice) are unified into a prioritized weekend task checklist and context-aware CarPlay alerts.

---

## 🏗️ System Architecture Flow

The following Mermaid diagram outlines the end-to-end ingestion, semantic extraction, storage, and presentation workflow:

```mermaid
graph TD
    %% Input Sources
    subgraph Input_Ingestion["1. Input Ingestion Layer"]
        A1["Voice Input (CarPlay / Mic)"]
        A2["Sync Feeds (iCloud Notes / SMS / Emails)"]
        A3["Dashboard Text Input"]
        A4["Calendar & Location Services"]
    end

    %% Semantic Engine
    subgraph Semantic_Engine["2. Semantic & NLP Parsing Layer"]
        B1["Context Classifier<br/>(Trips, Home, Finance, Misc)"]
        B2["Temporal & Date Extractor<br/>(Extracts deadlines & install dates)"]
        B3["Entity Extractor<br/>(Detects 'kids', 'builder', 'wife')"]
        B4["History Context Resolver<br/>(Queries past warnings e.g., 'forgot medicals')"]
    end

    %% Database & State
    subgraph Storage_Layer["3. Unified Storage Layer"]
        C1[("Brain Knowledge DB<br/>(Indexed Notes & Facts)")]
        C2[("Proactive Alerts Registry<br/>(Pending Reminders)")]
        C3[("Consolidated Weekend Task List")]
    end

    %% Dispatcher & Logic
    subgraph Orchestration_Layer["4. Prioritization & Dispatching"]
        D1["Weekend Focus Aggregator<br/>(Filters & clusters weekly tasks)"]
        D2["Alert Scheduling Daemon<br/>(Tracks +30 days solar checks, etc.)"]
    end

    %% Presenters
    subgraph Output_Interfaces["5. Output Interface Layer"]
        E1["CarPlay Audio Console<br/>(TTS Briefings & Speech Input)"]
        E2["Interactive UI Dashboard<br/>(Categorized lists & filters)"]
        E3["Mobile Pushes & Notifications"]
    end

    %% Connections
    A1 & A2 & A3 & A4 --> B1
    B1 --> B2 & B3 --> B4
    B4 --> C1 & C2 & C3
    
    C3 & C1 --> D1
    C2 --> D2
    
    D1 --> E2
    D2 --> E3
    D1 & D2 --> E1
    
    %% Styles
    classDef layer fill:#15102a,stroke:#9d4edd,stroke-width:2px,color:#fff;
    classDef db fill:#0a192f,stroke:#00f5d4,stroke-width:2px,color:#fff;
    class Input_Ingestion,Semantic_Engine,Orchestration_Layer,Output_Interfaces layer;
    class Storage_Layer,C1,C2,C3 db;
```

---

## 🔍 Detailed Component Walkthrough

### 1. Input Ingestion Layer
Scattered items enter the brain through different channels:
*   **Active Capture**: Voice dictation during commutes (e.g. CarPlay) or quick typed dashboard notes.
*   **Passive Capture**: Background scanning of external text feeds (i.e. forwarding emails, parsing SMS notifications from contractors, or syncing collaborative family notes).

### 2. Semantic & NLP Parsing Layer
This is the core parsing logic that turns disorganized text into structured database fields:
*   **Context Classifier**: Understands the domain of the note. For example, if it detects "drywall", "builder", or "tile", it routes to the *Home Maintenance* group.
*   **Temporal & Date Extractor**: Scans for exact dates (e.g. "6/19") or relative terms (e.g. "next month", "after a month") and maps them to true ISO dates.
*   **Entity Extractor**: Identifies crucial stakeholders. Knowing "wife asked" raises the task priority, while "kids" triggers family-safety templates.
*   **History Context Resolver**: Cross-references new entries with historical patterns. If a travel entity is detected, it searches history for travel mishaps (e.g., *"forgot medical kit"* last trip) to append proactive warnings.

### 3. Unified Storage Layer
Information is stored in normalized schemas:
*   **Brain Knowledge DB**: Read-only reference index (e.g. "Solar was installed on 6/19").
*   **Proactive Alerts Registry**: Actionable time-based or location-based alerts.
*   **Weekend Task List**: The actionable todo items.

### 4. Prioritization & Dispatching
Instead of presenting a massive, scrolling list of todos:
*   **Weekend Focus Aggregator**: Collects all tasks logged during the week that do not have an active weekday deadline. It groups them by domain (e.g. group all builder complaints together) and constructs a consolidated **Weekend Priority List** to prevent weekday cognitive overload.
*   **Alert Scheduling Daemon**: Evaluates date parameters. It computes intervals (e.g., Solar Installation Date `2026-06-19` + 30 days = Alert Date `2026-07-19`) and schedules push triggers.

### 5. Output Interface Layer
*   **CarPlay Console**: Focused on voice. Delivers short briefings (e.g. *"You have 4 builder complaints to file this weekend. Would you like me to draft them?"*) and accepts hands-free voice commands.
*   **Web/Mobile Dashboard**: Glassmorphic, highly visual dashboard designed for detailed reviews, indexing filters, and modal-based audits.
