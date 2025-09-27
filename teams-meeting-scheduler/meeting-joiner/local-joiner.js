const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration - Update these with your credentials
const CONFIG = {
  FIREBASE_PROJECT_ID: 'student-e6421', // Your Firebase project ID
  FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCTy3D/D2sUeji4\nuQHrJdqtDxUD6TdTaL2ih6EQrquRUkdVSWO0+iA0cEvUk3Tygs1X0KOCTxlHSu5h\neu6ikIk+TRyH6OB+qWpSSOq3HsWbrBqdhMP78Yqe5RFAJ3HSZblibZl1XK0WtA3P\nvrKz9Ii3ppEpxC9TVycwLwSt1kLZPF6czbjeS0hU4MIUzxq4LW7WhJDINTfZdai2\nHjzfbKrin9anYNgMq8Rim52aF+dKF/ARIsdGANrmMFXDIuycMbnVRLHUDNhT62GC\nfmJCc0SMqZduktinx32fb666w2V+EtM9puj4shNlI8Squke+bpQMCvN03719CV+4\n+HtSzhN3AgMBAAECggEAI2xznO65H6NbzQqq5w2fqDMhOlq/pAJK0ZXoiPMUtDQg\nXNTGTS5WYbs4sa7WLPok9ZNQXX9P88KF+F9aqyQxgPlCiWDLzhAVJ7vKZjG9814A\n0xhrUQvHyeXliJbrtR4knO7gBT09T1/An7Z5ZqCJ1FrcGEKphTQydF4QpQnh4+cz\nCbfph0LFDxIQ6zJj7eFuHCecEXL2C8UwuHv35bMB4l5GtWOTKlsSvJ5KfRyEC8eM\ncMtjiRn0459GsxlJUpTFdQjhT2Rx2BfXyUewLkqG7cPXAHxACORlbRqveB3kuIMZ\nOeg7YHQRoWXCkcDXwzDaBfkHDmmo1Md886ztk+3BgQKBgQDJSxl06eMQ/9jbfVSc\nHNxY3WPilaqjRVuqHMh7A+eqmRtZoQ2PB9xXDttjMyWd5aKaICKfdctksTbqUQxn\nvo5t2Mz7E2TZPvTEp2+7yyKxceGV204ogr255EPFAymlSdrtaYZwGuhTyn4bJoC6\nvzq8rtubFmjF/y/tfXyRwhgdZwKBgQC79jHl9vHTj9ijbPxukMyOKDtW5CJI+qhL\nsOwkyc5H+TOBVSrse64IORJRCF9UiPify7cB3WsD51SlwHI7669KhcjFi9LvsDe9\nPJbwKdNCly7tnzXQ+09IwkaAQn9mh2dDKfU6/Xq0XhiG6KBlOwliCquUe6h1RJuN\nj3uhlPV/cQKBgQC5Avmm58H4Qe/D7XHy+uPcGcBQ5lcsMfeKZ2ItDu3Dc24b91dK\n+2Kd8d3bU4tjkUjeeGLaRZ5oMinTPCM2x4KJnBbrPmwW8TJv/aVI6fA9P/qjjipM\nOb7AOPnA/qMsdLFwPOl/6HtZaGh38++ltVX7TowyA2rRcTdQBWKVZdxcSQKBgB3L\nBFXDMsmp/1jIKasM4J+X2PAI8TZIJOz6ejPKmRvncDaL3WXmpMtA4JpfjVzE6UPK\n8pMlGZVg0ZYETxcYYIybcBt/8ktzzyH7vKEMwCPJ+vJHTix16TdLNAmYgMErrT6E\nJA7Zpt14HMMllGb3WKFlt5StlSIhYdaqa5pNFizBAoGALyc7b3zMkfBI/Oxbtmu/\noDNrnFpBHXXSeGRJeTaif1ikoA61AMRuN/0uWPndDM+6AjNHL2QEJ/45O9tCL0sg\n8DxyV+kHXGCVPiMvLx1n/U9K5NeR6Q0eKlSUHhchySfskvOF/c4BsrS9IiTVwWKd\npxPhDOk2jaXyRrDYAQBHIKs=\n-----END PRIVATE KEY-----\n', // Your Firebase private key - set this
  FIREBASE_CLIENT_EMAIL: 'jaqbek.eth@gmail.com', // Your Firebase client email - set this
  ENCRYPTION_KEY: 'Teams-Meeting-Scheduler-Key-2025' // Your encryption key - set this
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

let db = null;
try {
  db = admin.firestore ? admin.firestore() : null;
} catch (error) {
  console.log('⚠️  Firebase not initialized - running in demo mode');
  db = null;
}

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
  let page = null;

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
        '--window-size=1280,720',
        '--disable-features=ExternalProtocolInSandbox',
        '--disable-external-intent-requests',
        '--disable-protocol-handler-restrictions',
        '--allow-running-insecure-content',
        '--disable-popup-blocking'
      ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Block Teams app protocol handlers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Intercept and block msteams:// protocol requests
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('msteams://') || url.includes('ms-teams:')) {
        log(`🚫 Blocked Teams app protocol: ${url}`);
        request.abort();
      } else {
        request.continue();
      }
    });

    // Navigate to Teams meeting link
    log(`Navigating to meeting link: ${meeting.meetingLink}`);
    await page.goto(meeting.meetingLink, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for page to load
    log('Waiting for page to load...');
    await page.waitForTimeout(3000);

    // Take screenshot for debugging
    await page.screenshot({ path: path.join(logsDir, `step1-initial-page.png`) });

    // Try to join via web browser option (multiple selectors)
    log('Looking for "Join on the web instead" button...');

    const webJoinSelectors = [
      'button[data-tid="joinOnWeb"]',
      'a[data-tid="joinOnWeb"]',
      'button:contains("Join on the web instead")',
      'a:contains("Join on the web instead")',
      'button:contains("Continue on this browser")',
      'a:contains("Continue on this browser")',
      // Polish language support
      'button:contains("Kontynuuj w tej przegladarce")',
      'a:contains("Kontynuuj w tej przegladarce")',
      'button:contains("Dołącz przez przeglądarkę")',
      'a:contains("Dołącz przez przeglądarkę")',
      // Generic selectors
      '[data-track-action*="web"]',
      '.join-web-instead',
      // Try to find any button/link containing "przeglądarka" (browser in Polish)
      'button[title*="przeglądarka"]',
      'a[title*="przeglądarka"]'
    ];

    let webJoinFound = false;

    // First try data attributes and classes
    const attributeSelectors = [
      'button[data-tid="joinOnWeb"]',
      'a[data-tid="joinOnWeb"]',
      'button[aria-label*="Dołącz do spotkania z tej przeglądarki"]',
      'button[aria-label*="Join meeting from this browser"]',
      '[data-track-action*="web"]',
      '.join-web-instead'
    ];

    for (const selector of attributeSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          log(`✅ Found web join button with selector: ${selector}`);

          // Wait for navigation after clicking the web join button
          const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
          await button.click();
          log('🔄 Waiting for page navigation after clicking web join...');

          try {
            await navigationPromise;
            log('✅ Page navigation completed');
          } catch (navError) {
            log(`⚠️ Navigation timeout, but continuing: ${navError.message}`);
          }

          // Wait additional time for page to stabilize
          await page.waitForTimeout(5000);
          log('📄 Page stabilized, taking screenshot...');
          await page.screenshot({ path: path.join(logsDir, `step2-after-web-join.png`) });
          webJoinFound = true;
          break;
        }
      } catch (error) {
        // Continue trying other selectors
      }
    }

    // If not found, try text-based search (Polish and English)
    if (!webJoinFound) {
      const textPatterns = [
        'Kontynuuj w tej przeglądarce',
        'dołącz przez przeglądarkę',
        'join on the web instead',
        'continue on this browser',
        'przeglądark' // partial match for any Polish browser-related text
      ];

      for (const pattern of textPatterns) {
        try {
          log(`🔍 Searching for text pattern: "${pattern}"`);

          // Use XPath to find elements by text content
          const xpath = `//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZĘĆŁŃÓŚŹŻĄĆ', 'abcdefghijklmnopqrstuvwxyzęćłńóśźżąć'), '${pattern.toLowerCase()}')] | //a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZĘĆŁŃÓŚŹŻĄĆ', 'abcdefghijklmnopqrstuvwxyzęćłńóśźżąć'), '${pattern.toLowerCase()}')]`;

          const elements = await page.$x(xpath);
          if (elements.length > 0) {
            log(`✅ Found web join button with text pattern: "${pattern}"`);

            // Wait for navigation after clicking the web join button
            const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
            await elements[0].click();
            log('🔄 Waiting for page navigation after clicking web join...');

            try {
              await navigationPromise;
              log('✅ Page navigation completed');
            } catch (navError) {
              log(`⚠️ Navigation timeout, but continuing: ${navError.message}`);
            }

            // Wait additional time for page to stabilize
            await page.waitForTimeout(5000);
            log('📄 Page stabilized, taking screenshot...');
            await page.screenshot({ path: path.join(logsDir, `step2-after-web-join.png`) });
            webJoinFound = true;
            break;
          }
        } catch (error) {
          log(`⚠️ Error searching for pattern "${pattern}": ${error.message}`);
          // Continue trying other patterns
        }
      }
    }

    if (!webJoinFound) {
      log('ℹ️  No "Join on web" button found, checking for launcher page...');

      // Check if we're on a launcher page that needs to be bypassed
      const currentUrl = page.url();
      if (currentUrl.includes('/dl/launcher/') || currentUrl.includes('launcher.html')) {
        log('🔄 Detected launcher page, trying to force web version...');

        // Try to modify URL to force web version
        const meetingUrl = meeting.meetingLink;
        const webUrl = meetingUrl + (meetingUrl.includes('?') ? '&' : '?') + 'anon=true&forceWeb=true';
        log(`🌐 Redirecting to web-only URL: ${webUrl}`);
        await page.goto(webUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(3000);
      }
    }

    // Check if we need to sign in
    log('Checking if sign-in is required...');
    log('⏳ Waiting for page elements to load...');

    // Wait a bit more for the page to fully load
    await page.waitForTimeout(5000);

    // Try to wait for sign-in elements to appear
    try {
      await page.waitForSelector('#i0116, a[data-task="signin"], button[data-task="signin"]', { timeout: 10000 });
      log('📝 Sign-in elements found');
    } catch (e) {
      log('ℹ️  No sign-in elements found within timeout, checking current state...');
    }

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

    // Look for "Continue without audio or video" button first (Polish)
    log('Looking for "Continue without audio or video" button...');
    const continueButtons = [
      'button:contains("Kontynuuj bez audio lub wideo")',
      'button:contains("Continue without audio or video")',
      'button[data-focus-target="gum-continue"]',
      'button[aria-label*="Continue without"]',
      'button[aria-label*="Kontynuuj bez"]'
    ];

    let continueClicked = false;
    for (const selector of continueButtons) {
      try {
        // For text-based selectors, use XPath
        if (selector.includes(':contains(')) {
          const text = selector.match(/contains\("([^"]+)"\)/)[1];
          const xpath = `//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZĘĆŁŃÓŚŹŻĄĆ', 'abcdefghijklmnopqrstuvwxyzęćłńóśźżąć'), '${text.toLowerCase()}')]`;
          const elements = await page.$x(xpath);
          if (elements.length > 0) {
            log(`✅ Found continue button with text: "${text}"`);
            await elements[0].click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.join(logsDir, `step5a-after-continue.png`) });
            continueClicked = true;
            break;
          }
        } else {
          // For regular selectors
          const button = await page.$(selector);
          if (button) {
            log(`✅ Found continue button with selector: ${selector}`);
            await button.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.join(logsDir, `step5a-after-continue.png`) });
            continueClicked = true;
            break;
          }
        }
      } catch (error) {
        // Continue trying other selectors
      }
    }

    if (continueClicked) {
      log('📹 Clicked continue without audio/video, waiting for meeting interface...');
      await page.waitForTimeout(3000);
    }

    // Look for name input field (Polish Teams interface)
    log('Looking for display name input field...');
    const nameInputSelectors = [
      'input[data-tid="prejoin-display-name-input"]',
      'input[placeholder*="Wpisz imię i nazwisko"]',
      'input[placeholder*="Enter your name"]',
      'input[placeholder*="Display name"]'
    ];

    let nameEntered = false;
    for (const selector of nameInputSelectors) {
      try {
        const nameInput = await page.$(selector);
        if (nameInput) {
          const displayName = meeting.userDisplayName || 'Automation User';
          log(`📝 Found name input field, entering: ${displayName}`);

          // Clear existing value and type the name
          await nameInput.click({ clickCount: 3 }); // Select all text
          await nameInput.type(displayName, { delay: 100 });

          await page.waitForTimeout(1000);
          await page.screenshot({ path: path.join(logsDir, `step5b-name-entered.png`) });
          nameEntered = true;
          break;
        }
      } catch (error) {
        // Continue trying other selectors
      }
    }

    if (nameEntered) {
      log('✅ Display name entered successfully');
      await page.waitForTimeout(2000);
    } else {
      log('ℹ️  No name input field found, proceeding to join...');
    }

    // Look for join meeting button
    log('Looking for join meeting buttons...');
    const joinButtons = [
      'button[data-tid="prejoin-join-button"]',
      'button[aria-label*="Join now"]',
      'button[title*="Join now"]',
      'button[title*="Join"]',
      'button:contains("Dołącz teraz")', // Polish "Join now"
      'button:contains("Join now")', // English "Join now"
      '.join-btn',
      '[data-tid="toggle-mute"]' // Sometimes this appears when already in meeting
    ];

    let joined = false;
    for (const selector of joinButtons) {
      try {
        // For text-based selectors, use XPath
        if (selector.includes(':contains(')) {
          const text = selector.match(/contains\("([^"]+)"\)/)[1];
          const xpath = `//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZĘĆŁŃÓŚŹŻĄĆ', 'abcdefghijklmnopqrstuvwxyzęćłńóśźżąć'), '${text.toLowerCase()}')]`;
          const elements = await page.$x(xpath);
          if (elements.length > 0) {
            log(`🎯 Found join button with text: "${text}"`);
            await elements[0].click();
            log('✅ Clicked join button!');
            await page.waitForTimeout(5000);
            await page.screenshot({ path: path.join(logsDir, `step6-after-join-click.png`) });
            joined = true;
            break;
          }
        } else {
          // For regular selectors
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
      } catch (error) {
        // Continue trying other selectors
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

    // Try to take screenshot if page is still available
    try {
      if (page && !page.isClosed()) {
        await page.screenshot({ path: path.join(logsDir, `error-screenshot.png`) });
      }
    } catch (screenshotError) {
      log(`⚠️ Could not take error screenshot: ${screenshotError.message}`);
    }

    return { success: false, error: errorMessage };
  } finally {
    if (browser) {
      try {
        log('🔒 Closing browser...');
        await browser.close();
      } catch (closeError) {
        log(`⚠️ Error closing browser: ${closeError.message}`);
      }
    }
  }
}

// Demo function - you can modify this for testing
async function runDemo() {
  // Try to load user credentials from exported file
  let userCredentials = null;

  try {
    if (fs.existsSync('./user-credentials.json')) {
      const credentialsData = fs.readFileSync('./user-credentials.json', 'utf8');
      userCredentials = JSON.parse(credentialsData);
      log('✅ Loaded user credentials from user-credentials.json');
    }
  } catch (error) {
    log(`⚠️  Could not load user credentials file: ${error.message}`);
  }

  if (userCredentials && userCredentials.meetings && userCredentials.meetings.length > 0) {
    log('🎯 Found pending meetings from dashboard!');

    // Process the first pending meeting
    const meeting = userCredentials.meetings[0];
    const meetingData = {
      id: meeting.id,
      email: userCredentials.teamsEmail,
      password: userCredentials.teamsPassword,
      meetingLink: meeting.meetingLink,
      userDisplayName: userCredentials.userDisplayName
    };

    log(`🚀 Starting Teams meeting automation for meeting: ${meeting.id}`);
    log(`📅 Meeting scheduled for: ${meeting.scheduledTime}`);
    log(`👤 User: ${userCredentials.userDisplayName} (${userCredentials.teamsEmail})`);

    const result = await joinTeamsMeeting(meetingData);

    if (result.success) {
      log('✅ Meeting joined successfully!');
    } else {
      log(`❌ Failed to join meeting: ${result.error}`);
    }

    log(`📁 Check the logs folder for screenshots: ${logsDir}`);
    return result;
  } else {
    // Fall back to demo mode if no real meeting data
    const demoMeeting = {
      id: 'demo-meeting',
      email: 'your-teams-email@example.com',        // Replace with your Teams email
      password: 'your-teams-password',              // Replace with your Teams password
      meetingLink: 'https://teams.microsoft.com/l/meetup-join/...' // Replace with actual meeting link
    };

    log('🚀 Starting LOCAL Teams meeting automation demo');
    log('📝 No user-credentials.json found - running demo mode');
    log('💡 Use the web dashboard "Run Local Automation" to export your credentials');

    const result = await joinTeamsMeeting(demoMeeting);

    if (result.success) {
      log('✅ Demo completed successfully!');
    } else {
      log(`❌ Demo failed: ${result.error}`);
    }

    log(`📁 Check the logs folder for screenshots: ${logsDir}`);
    return result;
  }
}

// Global lock to prevent multiple meetings from joining simultaneously
const activeMeetings = new Set();

// Background automation scheduler
async function startAutomationScheduler() {
  log('🤖 Starting background automation scheduler...');
  log('⏰ Monitoring for scheduled meetings every 30 seconds');

  // Load user credentials
  let userCredentials = null;
  try {
    if (fs.existsSync('./user-credentials.json')) {
      const credentialsData = fs.readFileSync('./user-credentials.json', 'utf8');
      userCredentials = JSON.parse(credentialsData);
      log(`✅ Loaded credentials for ${userCredentials.userDisplayName}`);
    } else {
      log('❌ No user-credentials.json found. Please run "Run Local Automation" from the dashboard first.');
      process.exit(1);
    }
  } catch (error) {
    log(`❌ Error loading credentials: ${error.message}`);
    process.exit(1);
  }

  // Check for meetings every 30 seconds
  setInterval(async () => {
    try {
      await checkAndJoinScheduledMeetings(userCredentials);
    } catch (error) {
      log(`⚠️  Error in scheduler: ${error.message}`);
    }
  }, 30000); // Check every 30 seconds

  // Keep the process alive
  log('🚀 Automation scheduler is running. Press Ctrl+C to stop.');
  log('📱 Check the dashboard for meeting status updates.');
}

async function checkAndJoinScheduledMeetings(userCredentials) {
  const now = new Date();

  // Reload credentials to get latest meetings
  try {
    const credentialsData = fs.readFileSync('./user-credentials.json', 'utf8');
    const latestCredentials = JSON.parse(credentialsData);
    userCredentials.meetings = latestCredentials.meetings;
  } catch (error) {
    log(`⚠️  Could not reload meetings: ${error.message}`);
  }

  if (!userCredentials.meetings || userCredentials.meetings.length === 0) {
    log(`📅 No pending meetings found. Current time: ${now.toLocaleString()}`);
    return; // No meetings to check
  }

  log(`📋 Checking ${userCredentials.meetings.length} meetings...`);

  for (const meeting of userCredentials.meetings) {
    if (meeting.status !== 'pending') continue;

    // Check if this meeting is already being processed
    if (activeMeetings.has(meeting.id)) {
      log(`⏸️ Meeting ${meeting.id} is already being processed, skipping...`);
      continue;
    }

    const scheduledTime = new Date(meeting.scheduledTime);
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const minutesUntil = Math.round(timeDiff / (1000 * 60));

    // Join meeting if it's time (within 2 minutes of scheduled time)
    if (timeDiff <= 2 * 60 * 1000 && timeDiff >= -1 * 60 * 1000) {
      log(`🎯 Time to join meeting: ${meeting.id}`);
      log(`📅 Scheduled: ${scheduledTime.toLocaleString()}`);

      // Add to active meetings lock
      activeMeetings.add(meeting.id);

      const meetingData = {
        id: meeting.id,
        email: userCredentials.teamsEmail,
        password: userCredentials.teamsPassword,
        meetingLink: meeting.meetingLink,
        userDisplayName: userCredentials.userDisplayName
      };

      try {
        const result = await joinTeamsMeeting(meetingData);
        if (result.success) {
          log(`✅ Successfully joined meeting ${meeting.id}!`);
          // Update meeting status in credentials file
          meeting.status = 'joined';
          fs.writeFileSync('./user-credentials.json', JSON.stringify(userCredentials, null, 2));
        } else {
          log(`❌ Failed to join meeting ${meeting.id}: ${result.error}`);
        }
      } catch (error) {
        log(`💥 Error joining meeting ${meeting.id}: ${error.message}`);
      } finally {
        // Remove from active meetings lock
        activeMeetings.delete(meeting.id);
      }
    } else if (minutesUntil > 0 && minutesUntil <= 15) {
      // Log upcoming meetings
      log(`⏳ Meeting ${meeting.id} in ${minutesUntil} minutes`);
    }
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const command = args[0];
const meetingId = args[1];

if (command === 'schedule' || command === 'monitor') {
  // Start background scheduler
  startAutomationScheduler();
} else if (meetingId && db) {
  // Join specific meeting by ID
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