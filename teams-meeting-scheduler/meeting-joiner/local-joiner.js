const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration - Update these with your credentials
const CONFIG = {
  FIREBASE_PROJECT_ID: 'student-e6421', // Your Firebase project ID
  FIREBASE_PRIVATE_KEY: '', // Your Firebase private key - set this
  FIREBASE_CLIENT_EMAIL: '', // Your Firebase client email - set this
  ENCRYPTION_KEY: 'your-32-character-secret-key-here!!' // Your encryption key - set this
};

// Initialize Firebase Admin (if credentials are provided)
if (CONFIG.FIREBASE_PRIVATE_KEY && CONFIG.FIREBASE_CLIENT_EMAIL) {
  const serviceAccount = {
    type: "service_account",
    project_id: CONFIG.FIREBASE_PROJECT_ID,
    private_key: CONFIG.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: CONFIG.FIREBASE_CLIENT_EMAIL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  console.log('⚠️  Firebase credentials not configured - running in demo mode');
}

const db = admin.firestore ? admin.firestore() : null;

// Encryption helpers
const algorithm = 'aes-256-cbc';

function decrypt(encryptedText) {
  if (!encryptedText.includes(':')) {
    // Assume it's plain text for demo
    return encryptedText;
  }

  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedData = textParts.join(':');
  const key = crypto.scryptSync(CONFIG.ENCRYPTION_KEY, 'salt', 32);
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

const logFile = path.join(logsDir, `local-meeting-log-${new Date().toISOString().split('T')[0]}.txt`);

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Join Teams meeting using Puppeteer - LOCAL VERSION WITH VISIBLE BROWSER
async function joinTeamsMeeting(meeting) {
  log(`=== Starting LOCAL Teams meeting join for meeting ${meeting.id || 'demo'} ===`);

  let browser = null;

  try {
    // Decrypt credentials
    const email = meeting.teamsEmail ? decrypt(meeting.teamsEmail) : meeting.email;
    const password = meeting.teamsPassword ? decrypt(meeting.teamsPassword) : meeting.password;

    log(`Launching VISIBLE browser for meeting ${meeting.id || 'demo'}`);
    browser = await puppeteer.launch({
      headless: false, // 🎯 THIS IS THE KEY - VISIBLE BROWSER!
      devtools: true,  // Opens developer tools for debugging
      slowMo: 1000,    // Slow down actions so you can see them
      args: [
        '--start-maximized',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1280,720'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to Teams meeting link
    log(`Navigating to meeting link: ${meeting.meetingLink}`);
    await page.goto(meeting.meetingLink, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for page to load
    log('Waiting for page to load...');
    await page.waitForTimeout(3000);

    // Take screenshot for debugging
    await page.screenshot({ path: path.join(logsDir, `step1-initial-page.png`) });

    // Try to join via web browser option
    log('Looking for "Join on the web instead" button...');
    const joinWebButton = await page.$('button[data-tid="joinOnWeb"]');
    if (joinWebButton) {
      log(`✅ Clicking "Join on the web instead"`);
      await joinWebButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(logsDir, `step2-after-web-join.png`) });
    } else {
      log('ℹ️  No "Join on web" button found, continuing...');
    }

    // Check if we need to sign in
    log('Checking if sign-in is required...');
    const signInButton = await page.$('a[data-task="signin"], button[data-task="signin"], #i0116');
    if (signInButton || await page.$('#i0116')) {
      log(`🔐 Signing in with email: ${email.substring(0, 3)}***`);

      // Enter email
      const emailInput = await page.$('#i0116');
      if (emailInput) {
        await emailInput.type(email, { delay: 100 });
        await page.screenshot({ path: path.join(logsDir, `step3-email-entered.png`) });

        const nextButton = await page.$('#idSIButton9');
        if (nextButton) {
          await nextButton.click();
          log('✅ Clicked Next after email');
          await page.waitForTimeout(3000);
        }
      }

      // Enter password
      const passwordInput = await page.$('#i0118');
      if (passwordInput) {
        await passwordInput.type(password, { delay: 100 });
        await page.screenshot({ path: path.join(logsDir, `step4-password-entered.png`) });

        const signInSubmit = await page.$('#idSIButton9');
        if (signInSubmit) {
          await signInSubmit.click();
          log('✅ Clicked Sign In');
          await page.waitForTimeout(5000);
        }
      }

      // Handle "Stay signed in?" prompt
      const staySignedInNo = await page.$('#idBtn_Back');
      if (staySignedInNo) {
        await staySignedInNo.click();
        log('✅ Clicked "No" for stay signed in');
        await page.waitForTimeout(2000);
      }
    } else {
      log('ℹ️  No sign-in required');
    }

    // Wait for the meeting page to load
    log('Waiting for meeting page to load...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(logsDir, `step5-meeting-page.png`) });

    // Look for join meeting button
    log('Looking for join meeting buttons...');
    const joinButtons = [
      'button[data-tid="prejoin-join-button"]',
      'button[aria-label*="Join now"]',
      'button[title*="Join now"]',
      'button[title*="Join"]',
      '.join-btn',
      '[data-tid="toggle-mute"]' // Sometimes this appears when already in meeting
    ];

    let joined = false;
    for (const selector of joinButtons) {
      const button = await page.$(selector);
      if (button) {
        log(`🎯 Found join button: ${selector}`);
        await button.click();
        log('✅ Clicked join button!');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(logsDir, `step6-after-join-click.png`) });
        joined = true;
        break;
      }
    }

    if (!joined) {
      log('⚠️  No join button found, taking screenshot for debugging...');
      await page.screenshot({ path: path.join(logsDir, `debug-no-join-button.png`) });
    }

    // Verify we're in the meeting by looking for meeting controls
    log('Checking for meeting controls...');
    const meetingControls = await page.$('[data-tid="toggle-mute"], [data-tid="toggle-video"], .calling-screen');
    if (meetingControls || joined) {
      log(`🎉 Successfully joined meeting! Browser will stay open for 2 minutes...`);
      await page.screenshot({ path: path.join(logsDir, `step7-meeting-joined.png`) });

      // Keep the session active for 2 minutes to see the meeting
      log('⏰ Staying in meeting for 2 minutes...');
      await page.waitForTimeout(120000); // 2 minutes

      return { success: true };
    } else {
      throw new Error('Could not find meeting join button or verify meeting join');
    }

  } catch (error) {
    const errorMessage = error.message || String(error);
    log(`❌ Error joining meeting: ${errorMessage}`);
    await page.screenshot({ path: path.join(logsDir, `error-screenshot.png`) });
    return { success: false, error: errorMessage };
  } finally {
    if (browser) {
      log('🔒 Closing browser...');
      await browser.close();
    }
  }
}

// Demo function - you can modify this for testing
async function runDemo() {
  // Example meeting data - replace with your actual meeting details
  const demoMeeting = {
    id: 'demo-meeting',
    email: 'your-teams-email@example.com',        // Replace with your Teams email
    password: 'your-teams-password',              // Replace with your Teams password
    meetingLink: 'https://teams.microsoft.com/l/meetup-join/...' // Replace with actual meeting link
  };

  log('🚀 Starting LOCAL Teams meeting automation demo');
  log('📝 Make sure to update the credentials in this file!');

  const result = await joinTeamsMeeting(demoMeeting);

  if (result.success) {
    log('✅ Demo completed successfully!');
  } else {
    log(`❌ Demo failed: ${result.error}`);
  }

  log(`📁 Check the logs folder for screenshots: ${logsDir}`);
}

// Check if specific meeting ID is provided via command line
const meetingId = process.argv[2];

if (meetingId && db) {
  log(`🔍 Looking up meeting ID: ${meetingId}`);

  db.collection('meetings').doc(meetingId).get()
    .then(doc => {
      if (!doc.exists) {
        log(`❌ Meeting ${meetingId} not found in Firebase`);
        process.exit(1);
      }

      const meeting = { id: doc.id, ...doc.data() };
      return joinTeamsMeeting(meeting);
    })
    .then(result => {
      if (result.success) {
        log('✅ Meeting joined successfully!');
      } else {
        log(`❌ Failed to join meeting: ${result.error}`);
      }
      process.exit(0);
    })
    .catch(error => {
      log(`💥 Fatal error: ${error.message}`);
      process.exit(1);
    });
} else {
  // Run demo mode
  runDemo()
    .then(() => {
      log('Demo completed');
      process.exit(0);
    })
    .catch(error => {
      log(`Fatal error: ${error.message}`);
      process.exit(1);
    });
}