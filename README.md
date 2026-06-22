# OmniMind - Personal Brain & CarPlay Assistant

OmniMind is a proactive personal knowledge dashboard and hands-free CarPlay assistant. It consolidates fragmented information (checklists, dates, home complaints, and notes) and uses voice and context-driven rules to trigger alerts and action items.

## Features

1. **Dashboard Overview**: Access structured context cards, proactive alerts, the weekend action plan, and stats overview.
2. **CarPlay Voice Console**: A large-screen simulated console featuring:
   - Voice assistant simulator with Text-to-Speech (read-back responses) and Speech-to-Text (dictation input) using browser APIs.
   - Dynamic glowing neon visualizer representing state transitions (Listening, Speaking, Idle).
   - Quick action triggers: read travel checklists, check home complaints.
3. **Feed Sync Scanner**: A simulated inbox scanner allowing you to select mock email/SMS templates (e.g. flight bookings, solar installations, complaints notes) and ingest them into your brain. The local engine extracts tasks and issues alerts automatically.
4. **Brain Index Catalog**: Tagged classification of your brain index (Trips, House Complaints, Finance/Dates, General Notes) with instant search filters.
5. **Persistent State**: Fully backed by LocalStorage.

## Running the Application

To run OmniMind locally:
1. Open the directory `personal-brain/` on your computer.
2. Double-click `index.html` (or drag it into your web browser, such as Google Chrome or Microsoft Edge).
3. (Optional but recommended) Run a lightweight web server:
   - If you have Python: `python -m http.server 8000` in the directory, then visit `http://localhost:8000`.
   - If you have Node.js: `npx serve .`

## How to Test User Scenarios

### Scenario 1: Proactive Trip Alerts & Medical Essentials
1. In the **Feed Sync** tab, click **Trip Email** to load a confirmation flight to Hawaii.
2. Click **Scan and Ingest into Brain**.
3. Go back to the **Dashboard**. You'll see a proactive alert: **Upcoming Family Trip Checklist: Remember your last trip with the kids where you forgot the medical kit! Pack prescription box, allergy medication, and first-aid supplies.**
4. A corresponding checklist item is also created in the Weekend Action List: **Assemble & double-check kids medical kits for Hawaii Plan**.

### Scenario 2: Solar Panel Installation Date Follow-up
1. In the **Feed Sync** tab, click **Solar Install Text** to load a confirmation text.
2. Click **Scan and Ingest**.
3. An alert is raised: **Solar energy bill verification due: review the upcoming energy bill 30 days after solar installation date (6/19).**
4. A task is added to the Weekend Action List to verify energy bill solar credits.

### Scenario 3: Builder Complaints & De-fragmentation
1. In the **Feed Sync** tab, click **Wife's Complaint List**.
2. Click **Scan and Ingest**.
3. All complaints (drywall crack, loose tiles, garage noise, kitchen pipes) are instantly parsed, indexed in the catalog under **House Complaints**, and added to the **Weekend Action List** so they are consolidated in a priority list.

### Scenario 4: CarPlay Voice Interaction
1. Go to the **CarPlay Console** tab.
2. Click the large microphone button in the middle (or click the microphone icon next to the chat bar on the dashboard).
3. If prompted, allow microphone permissions.
4. Speak a command such as: *"Wife asked me to fix the loose tiles and check the drywall cracks"* or *"Plan a trip to Europe with the kids next week"*.
5. OmniMind will capture your input, update the index, check constraints, and read back the assistant's feedback using the computer's speech synthesis engine.
