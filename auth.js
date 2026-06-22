const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using Service Account configuration or Application Default Credentials
function initFirebase(serviceAccount) {
  if (admin.apps.length === 0) {
    if (serviceAccount && serviceAccount.private_key) {
      console.log("[FIREBASE]: Initializing Firebase Admin SDK via Service Account credentials.");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.log("[FIREBASE]: Initializing Firebase Admin SDK via default Google credentials.");
      admin.initializeApp();
    }
  }
}

/**
 * Link Google OAuth identity and verified phone number under a single Firebase user profile.
 */
async function linkGoogleAndPhone(email, phoneNumber, displayName) {
  try {
    let userRecord = null;

    // 1. Try retrieving user by Google email
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log(`[FIREBASE]: Found existing user record by email: ${email} (UID: ${userRecord.uid})`);
    } catch (e) {
      // User not found by email
      console.log(`[FIREBASE]: No user found by email: ${email}. Checking by phone number...`);
    }

    // 2. Try retrieving user by verified phone number if not found by email
    if (!userRecord) {
      try {
        userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
        console.log(`[FIREBASE]: Found existing user record by phone: ${phoneNumber} (UID: ${userRecord.uid})`);
      } catch (e) {
        // User not found by phone either
        console.log(`[FIREBASE]: No user found by phone: ${phoneNumber}. Creating new user account...`);
      }
    }

    // 3. Create a brand-new user if none exists
    if (!userRecord) {
      userRecord = await admin.auth().createUser({
        email: email,
        phoneNumber: phoneNumber,
        displayName: displayName || "Mohit Mittal",
        emailVerified: true
      });
      console.log(`[FIREBASE]: Successfully created new linked user: ${userRecord.uid}`);
      return userRecord;
    }

    // 4. Update the existing user to link email or phone number if they are not already linked
    const updates = {};
    if (!userRecord.email) updates.email = email;
    if (!userRecord.phoneNumber) updates.phoneNumber = phoneNumber;
    if (!userRecord.displayName && displayName) updates.displayName = displayName;

    if (Object.keys(updates).length > 0) {
      userRecord = await admin.auth().updateUser(userRecord.uid, updates);
      console.log(`[FIREBASE]: Successfully updated and linked credentials for user: ${userRecord.uid}`);
    }

    return userRecord;
  } catch (error) {
    console.error("[FIREBASE ERROR]: Failed to link identities in Firebase Admin SDK:", error);
    throw error;
  }
}

/**
 * Server-side 2FA check verification.
 * Validates session handshake details on new device connections.
 */
async function verifySessionHandshake2FA(uid, deviceSignature) {
  if (!uid || !deviceSignature) {
    throw new Error("Missing uid or deviceSignature for 2FA validation.");
  }
  
  console.log(`[FIREBASE 2FA]: Verifying session handshake 2FA for UID: ${uid} (Device: ${deviceSignature})`);
  
  // Simulated 2FA validation check. In a production scenario, this queries a database
  // of registered devices or checks a temporary TOTP or SMS verification challenge state.
  return {
    verified: true,
    uid: uid,
    device: deviceSignature,
    status: "APPROVED",
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  initFirebase,
  linkGoogleAndPhone,
  verifySessionHandshake2FA
};
