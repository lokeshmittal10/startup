const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Logging } = require('@google-cloud/logging');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Path to persistent task database
const dbPath = path.join(__dirname, 'tasks_db.json');

// Extract local configuration from config.js
let OMNIMIND_LLM_CONFIG = null;
try {
  const configPath = path.join(__dirname, 'config.js');
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    const sandboxEval = new Function(`let window = {}; ${content}; return window.OMNIMIND_LLM_CONFIG;`);
    OMNIMIND_LLM_CONFIG = sandboxEval();
    console.log("[SERVER CONFIG]: Loaded configuration successfully.");
  }
} catch (err) {
  console.warn("[SERVER CONFIG WARNING]: Could not parse config.js. Running with environment variables.", err.message);
}

// Extract service account
const serviceAccount = OMNIMIND_LLM_CONFIG ? OMNIMIND_LLM_CONFIG.serviceAccount : null;

// Initialize Firebase Admin
try {
  auth.initFirebase(serviceAccount);
} catch (err) {
  console.warn("[FIREBASE WARNING]: Failed to initialize Firebase Admin SDK. Auth features will run in sandbox mode:", err.message);
}

// Initialize Google Cloud Logging Client
let clLog = null;
try {
  const loggingOptions = {
    projectId: serviceAccount ? serviceAccount.project_id : process.env.GOOGLE_CLOUD_PROJECT
  };
  if (serviceAccount) {
    loggingOptions.credentials = serviceAccount;
  }
  const logging = new Logging(loggingOptions);
  clLog = logging.log('omnimind-v2-logs');
  console.log("[CLOUD LOGGING]: Initialized Google Cloud Logging stream successfully.");
} catch (err) {
  console.warn("[CLOUD LOGGING WARNING]: Failed to initialize Google Cloud Logging. Falling back to local console logging:", err.message);
}

/**
 * Log writer helper to stream messages to Google Cloud Logging
 */
async function writeLog(message, severity = 'INFO', metadata = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${severity}] ${message}`, JSON.stringify(metadata));
  
  if (clLog) {
    try {
      const metadataPayload = {
        resource: { type: 'global' },
        severity: severity,
        labels: {
          app: "omnimind-v2",
          ...metadata
        }
      };
      const entry = clLog.entry(metadataPayload, message);
      await clLog.write(entry);
    } catch (err) {
      console.error("[CLOUD LOGGING ERROR]: Failed to write entry:", err.message);
    }
  }
}

// Helper: load tasks from disk
function loadTasks() {
  try {
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    }
  } catch (err) {
    console.error("Error reading tasks database:", err);
  }
  return {
    brainIndex: [],
    weekendTasks: [],
    alerts: [],
    tripChecklist: []
  };
}

// Helper: save tasks to disk
function saveTasks(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing tasks database:", err);
  }
}

// Serve static frontend files from this directory
app.use(express.static(__dirname));

/**
 * Task Synchronization Endpoints
 */
app.get('/api/tasks', async (req, res) => {
  const startTime = Date.now();
  const data = loadTasks();
  const latency = Date.now() - startTime;
  
  await writeLog(`Fetched task list database state.`, 'INFO', {
    endpoint: "GET /api/tasks",
    latency_ms: String(latency),
    task_count: String(data.brainIndex.length)
  });
  
  res.json(data);
});

app.post('/api/tasks', async (req, res) => {
  const startTime = Date.now();
  const { brainIndex, weekendTasks, alerts, tripChecklist } = req.body;
  
  const payload = {
    brainIndex: brainIndex || [],
    weekendTasks: weekendTasks || [],
    alerts: alerts || [],
    tripChecklist: tripChecklist || []
  };
  
  saveTasks(payload);
  const latency = Date.now() - startTime;
  
  await writeLog(`Synchronized task database.`, 'INFO', {
    endpoint: "POST /api/tasks",
    latency_ms: String(latency),
    task_count: String(payload.brainIndex.length)
  });
  
  res.json({ success: true, message: "Tasks synchronized successfully." });
});

/**
 * Authentication Endpoints
 */
app.post('/api/auth/signup', async (req, res) => {
  const startTime = Date.now();
  const { email, phoneNumber, displayName } = req.body;
  
  if (!email || !phoneNumber) {
    await writeLog("Signup attempt failed: missing parameters.", "WARNING", { email, phoneNumber });
    return res.status(400).json({ error: "Missing required parameters: email and phoneNumber." });
  }
  
  try {
    const userRecord = await auth.linkGoogleAndPhone(email, phoneNumber, displayName);
    const latency = Date.now() - startTime;
    
    await writeLog(`Successfully created/linked user: ${email}`, 'INFO', {
      endpoint: "POST /api/auth/signup",
      uid: userRecord.uid,
      latency_ms: String(latency)
    });
    
    res.json({ success: true, uid: userRecord.uid, email: userRecord.email });
  } catch (error) {
    const latency = Date.now() - startTime;
    await writeLog(`Auth signup error for: ${email}`, 'ERROR', {
      error: error.message,
      latency_ms: String(latency)
    });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/verify-2fa', async (req, res) => {
  const startTime = Date.now();
  const { uid, deviceSignature } = req.body;
  
  if (!uid || !deviceSignature) {
    return res.status(400).json({ error: "Missing parameters: uid and deviceSignature." });
  }
  
  try {
    const validation = await auth.verifySessionHandshake2FA(uid, deviceSignature);
    const latency = Date.now() - startTime;
    
    await writeLog(`Session handshake verified: ${uid}`, 'INFO', {
      endpoint: "POST /api/auth/verify-2fa",
      uid: uid,
      deviceSignature: deviceSignature,
      latency_ms: String(latency)
    });
    
    res.json(validation);
  } catch (error) {
    const latency = Date.now() - startTime;
    await writeLog(`2FA validation error: ${uid}`, 'ERROR', {
      error: error.message,
      latency_ms: String(latency)
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Client Inbound Logging Stream Endpoint
 */
app.post('/api/logs', async (req, res) => {
  const { message, severity, labels } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: "Missing log message content." });
  }
  
  await writeLog(message, severity || 'INFO', {
    source: "client-frontend",
    ...labels
  });
  
  res.json({ success: true });
});

app.listen(PORT, async () => {
  await writeLog(`OmniMind v2.0 Stateful Container Backend Server started on port ${PORT}`, 'INFO', {
    port: String(PORT)
  });
});
