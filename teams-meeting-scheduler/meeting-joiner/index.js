const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!!';
const algorithm = 'aes-256-cbc';

function decrypt(encryptedText) {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedData = textParts.join(':');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Logging setup
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, `meeting-log-${new Date().toISOString().split('T')[0]}.txt`);

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Join Teams meeting using Puppeteer
async function joinTeamsMeeting(meeting) {
  log(`=== Starting Teams meeting join for meeting ${meeting.id} ===`);

  let browser = null;

  try {
    // Decrypt credentials
    const email = decrypt(meeting.teamsEmail);
    const password = decrypt(meeting.teamsPassword);

    log(`Launching browser for meeting ${meeting.id}`);
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1280,720'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to Teams meeting link
    log(`Navigating to meeting link for ${meeting.id}`);
    await page.goto(meeting.meetingLink, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Try to join via web browser option
    const joinWebButton = await page.$('button[data-tid="joinOnWeb"]');
    if (joinWebButton) {
      log(`Clicking "Join on the web instead" for meeting ${meeting.id}`);
      await joinWebButton.click();
      await page.waitForTimeout(2000);
    }

    // Check if we need to sign in
    const signInButton = await page.$('a[data-task="signin"], button[data-task="signin"], #i0116');
    if (signInButton || await page.$('#i0116')) {
      log(`Signing in for meeting ${meeting.id}`);

      // Enter email
      const emailInput = await page.$('#i0116');
      if (emailInput) {
        await emailInput.type(email);
        const nextButton = await page.$('#idSIButton9');
        if (nextButton) {
          await nextButton.click();
          await page.waitForTimeout(3000);
        }
      }

      // Enter password
      const passwordInput = await page.$('#i0118');
      if (passwordInput) {
        await passwordInput.type(password);
        const signInSubmit = await page.$('#idSIButton9');
        if (signInSubmit) {
          await signInSubmit.click();
          await page.waitForTimeout(5000);
        }
      }

      // Handle "Stay signed in?" prompt
      const staySignedInNo = await page.$('#idBtn_Back');
      if (staySignedInNo) {
        await staySignedInNo.click();
        await page.waitForTimeout(2000);
      }
    }

    // Wait for the meeting page to load
    await page.waitForTimeout(5000);

    // Look for join meeting button
    const joinButtons = [
      'button[data-tid="prejoin-join-button"]',
      'button[aria-label*="Join now"]',
      'button[title*="Join now"]',
      '.join-btn',
      '[data-tid="toggle-mute"]'
    ];

    let joined = false;
    for (const selector of joinButtons) {
      const button = await page.$(selector);
      if (button) {
        log(`Found join button: ${selector} for meeting ${meeting.id}`);
        await button.click();
        await page.waitForTimeout(5000);
        joined = true;
        break;
      }
    }

    // Verify we're in the meeting by looking for meeting controls
    const meetingControls = await page.$('[data-tid="toggle-mute"], [data-tid="toggle-video"], .calling-screen');
    if (meetingControls || joined) {
      log(`=== Successfully joined meeting ${meeting.id} ===`);

      // Keep the session active for 30 seconds to ensure proper join
      await page.waitForTimeout(30000);

      return { success: true };
    } else {
      throw new Error('Could not find meeting join button or verify meeting join');
    }

  } catch (error) {
    const errorMessage = error.message || String(error);
    log(`Error joining meeting ${meeting.id}: ${errorMessage}`);
    return { success: false, error: errorMessage };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Log meeting activity
async function logMeetingActivity(meetingId, userId, action, details, errorMessage) {
  const logData = {
    meetingId,
    userId,
    action,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };

  if (details !== undefined) {
    logData.details = details;
  }
  if (errorMessage !== undefined) {
    logData.errorMessage = errorMessage;
  }

  await db.collection('meetingLogs').add(logData);
}

// Main function to process meetings
async function processMeetings() {
  log('Checking for pending meetings to join...');

  const now = admin.firestore.Timestamp.now();
  const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 5 * 60 * 1000);
  const fiveMinutesFromNow = admin.firestore.Timestamp.fromMillis(now.toMillis() + 5 * 60 * 1000);

  // Check if specific meeting ID is provided via environment variable
  const specificMeetingId = process.env.MEETING_ID;

  let query;
  if (specificMeetingId) {
    log(`Processing specific meeting: ${specificMeetingId}`);
    const docRef = db.collection('meetings').doc(specificMeetingId);
    const doc = await docRef.get();
    if (!doc.exists) {
      log(`Meeting ${specificMeetingId} not found`);
      return;
    }
    const meetings = [{ id: doc.id, ref: docRef, ...doc.data() }];
    await processMeetingList(meetings);
  } else {
    // Query for meetings that should be joined (within 5 minutes window)
    const meetingsSnapshot = await db.collection('meetings')
      .where('status', 'in', ['pending', 'retrying'])
      .where('scheduledTime', '<=', fiveMinutesFromNow)
      .where('scheduledTime', '>=', fiveMinutesAgo)
      .get();

    log(`Found ${meetingsSnapshot.docs.length} meetings to process`);

    const meetings = meetingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ref: doc.ref,
      ...doc.data()
    }));

    await processMeetingList(meetings);
  }

  log('Finished processing pending meetings');
}

async function processMeetingList(meetings) {
  for (const meeting of meetings) {
    try {
      log(`Processing meeting ${meeting.id} for user ${meeting.userId}`);

      // Update status to retrying
      await meeting.ref.update({
        status: 'retrying',
        lastAttempt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Log retry attempt
      await logMeetingActivity(
        meeting.id,
        meeting.userId,
        'retry',
        `GitHub Actions attempting to join meeting (retry ${meeting.retryCount + 1}/${meeting.maxRetries})`
      );

      // Attempt to join the meeting
      const result = await joinTeamsMeeting(meeting);

      if (result.success) {
        // Successfully joined
        await meeting.ref.update({
          status: 'joined',
          lastAttempt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logMeetingActivity(
          meeting.id,
          meeting.userId,
          'joined',
          'Successfully joined Teams meeting via GitHub Actions'
        );

        log(`Successfully joined meeting ${meeting.id}`);
      } else {
        // Failed to join
        const newRetryCount = meeting.retryCount + 1;
        const shouldRetry = newRetryCount < meeting.maxRetries;

        await meeting.ref.update({
          status: shouldRetry ? 'retrying' : 'failed',
          retryCount: newRetryCount,
          errorMessage: result.error,
          lastAttempt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logMeetingActivity(
          meeting.id,
          meeting.userId,
          'failed',
          shouldRetry ? `Failed to join, will retry. Attempt ${newRetryCount}/${meeting.maxRetries}` : 'Failed to join after all retries',
          result.error
        );

        log(`Failed to join meeting ${meeting.id}: ${result.error}`);
      }

    } catch (error) {
      log(`Error processing meeting ${meeting.id}: ${error.message}`);

      await meeting.ref.update({
        status: 'failed',
        errorMessage: error.message,
        lastAttempt: admin.firestore.FieldValue.serverTimestamp()
      });

      await logMeetingActivity(
        meeting.id,
        meeting.userId,
        'failed',
        'Error during meeting processing via GitHub Actions',
        error.message
      );
    }
  }
}

// Run the main function
processMeetings()
  .then(() => {
    log('Meeting processing completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    log(`Fatal error: ${error.message}`);
    process.exit(1);
  });