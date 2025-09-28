const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to hide automation detection
puppeteer.use(StealthPlugin());
const DatabaseManager = require('./database-manager.js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const speech = require('@google-cloud/speech');
const http = require('http');
const url = require('url');
const querystring = require('querystring');

// Configuration - Update these with your credentials (all optional now!)
const CONFIG = {
  // Firebase credentials (OPTIONAL - if not provided, will use local storage)
  FIREBASE_PROJECT_ID: '', // Your Firebase project ID (leave empty for local storage)
  FIREBASE_PRIVATE_KEY: '', // Your Firebase private key (leave empty for local storage)
  FIREBASE_CLIENT_EMAIL: '', // Your Firebase client email (leave empty for local storage)

  // Encryption key for local storage (will be auto-generated if not provided)
  ENCRYPTION_KEY: 'Teams-Meeting-Scheduler-Key-2025',

  // Google Speech API (OPTIONAL - for transcription)
  GOOGLE_API_KEY: '' // Add your Google API key for transcription (optional)
};

// Load config from user-credentials.json if available
let userCredentials = null;
const credentialsPath = path.join(__dirname, 'user-credentials.json');
if (fs.existsSync(credentialsPath)) {
  try {
    userCredentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log('📄 Loaded user credentials from file');
  } catch (error) {
    console.log('⚠️  Error reading user-credentials.json:', error.message);
  }
}

// Initialize database manager with automatic Firebase/Local fallback
const dbManager = new DatabaseManager(CONFIG);

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

// Transcription Buffer Class for 1-minute intervals
class TranscriptionBuffer {
  constructor(meetingId, userDisplayName) {
    this.meetingId = meetingId;
    this.userDisplayName = userDisplayName;
    this.currentText = "";
    this.chunkNumber = 1;
    this.chunkStartTime = new Date();
    this.isActive = true;

    // Upload every 1 minute (60 seconds)
    this.uploadInterval = setInterval(() => this.uploadChunk(), 60 * 1000);

    log(`📝 Transcription buffer initialized for meeting ${meetingId}`);
  }

  addText(text) {
    if (!this.isActive) return;

    this.currentText += text + " ";

    // Show current transcription in console (live display)
    log(`🎙️ LIVE: ${text}`);
    console.log(`\n📄 Current transcription chunk:\n${this.currentText}\n`);
  }

  async uploadChunk() {
    if (!this.isActive || this.currentText.trim().length === 0) return;

    try {
      const chunkData = {
        meetingId: this.meetingId,
        chunkNumber: this.chunkNumber,
        startTime: this.chunkStartTime.toISOString(),
        endTime: new Date().toISOString(),
        transcript: this.currentText.trim(),
        wordCount: this.currentText.trim().split(' ').length,
        language: 'pl-PL',
        createdAt: new Date(),
        userName: this.userDisplayName
      };

      // Save transcription to database (Firebase or local)
      try {
        await dbManager.addLog({
          action: 'transcription',
          meetingId: chunkData.meetingId,
          details: `Transcription chunk ${this.chunkNumber}: ${chunkData.text}`,
          wordCount: chunkData.wordCount,
          chunkNumber: this.chunkNumber,
          transcriptionData: chunkData
        });
        log(`✅ Uploaded transcription chunk ${this.chunkNumber} to ${dbManager.getBackendType()} (${chunkData.wordCount} words)`);
      } catch (error) {
        log(`⚠️ Failed to save transcription: ${error.message}`);
      }

      // Reset for next chunk
      this.currentText = "";
      this.chunkNumber++;
      this.chunkStartTime = new Date();

    } catch (error) {
      log(`❌ Error uploading transcription chunk: ${error.message}`);
    }
  }

  stop() {
    this.isActive = false;
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      log(`📝 Transcription stopped for meeting ${this.meetingId}`);
    }

    // Upload final chunk if there's remaining text
    if (this.currentText.trim().length > 0) {
      this.uploadChunk();
    }
  }
}

// Global transcription buffer
let transcriptionBuffer = null;

// Audio transcription function using Google Speech API
async function startTranscription(page, meetingId, userDisplayName) {
  try {
    log('🎙️ Starting transcription system...');

    // Initialize transcription buffer
    transcriptionBuffer = new TranscriptionBuffer(meetingId, userDisplayName);

    // Initialize Google Speech client
    const speechClient = new speech.SpeechClient({
      apiKey: CONFIG.GOOGLE_API_KEY
    });

    // Wait for page to be ready and inject audio capture script
    await page.waitForTimeout(2000);
    log('📝 Injecting audio capture script into page...');

    await page.evaluate(() => {
      let mediaRecorder = null;
      let audioStream = null;
      let captureInterval = null;

      window.startAudioCapture = async () => {
        try {
          console.log('🎙️ Requesting display media with system audio...');

          // Request screen sharing with system audio capture
          audioStream = await navigator.mediaDevices.getDisplayMedia({
            video: false,
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              sampleRate: 16000,
              channelCount: 1,
              sampleSize: 16
            }
          });

          // Verify audio tracks are available
          const audioTracks = audioStream.getAudioTracks();
          if (audioTracks.length === 0) {
            throw new Error('No audio tracks found. Please ensure "Share system audio" is selected.');
          }

          console.log(`✅ Audio stream acquired with ${audioTracks.length} track(s)`);

          // Create MediaRecorder for efficient audio processing
          mediaRecorder = new MediaRecorder(audioStream, {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 16000
          });

          const audioChunks = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              console.log(`📦 Audio chunk received: ${event.data.size} bytes`);
              audioChunks.push(event.data);
            }
          };

          mediaRecorder.onerror = (event) => {
            console.error('❌ MediaRecorder error:', event.error);
          };

          mediaRecorder.onstop = () => {
            console.log('🛑 MediaRecorder stopped');
          };

          // Process audio chunks every 5 seconds for real-time transcription
          captureInterval = setInterval(() => {
            if (audioChunks.length > 0) {
              console.log(`🔊 Processing ${audioChunks.length} audio chunks`);

              const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
              audioChunks.length = 0; // Clear array immediately (no storage)

              // Convert to base64 for API transmission
              const reader = new FileReader();
              reader.onload = () => {
                const base64Audio = reader.result.split(',')[1];
                console.log(`📡 Sending ${base64Audio.length} chars to transcription API`);
                window.sendAudioToTranscription(base64Audio);
              };
              reader.onerror = () => {
                console.error('❌ Failed to read audio blob');
              };
              reader.readAsDataURL(audioBlob);
            }
          }, 5000);

          // Start recording immediately
          mediaRecorder.start();
          console.log('🎙️ MediaRecorder started - capturing system audio from Teams');

          return true;
        } catch (error) {
          console.error('❌ Audio capture failed:', error);
          console.error('💡 Make sure to select "Share system audio" when prompted');
          return false;
        }
      };

      window.stopAudioCapture = () => {
        try {
          if (captureInterval) {
            clearInterval(captureInterval);
            captureInterval = null;
            console.log('🛑 Audio capture interval stopped');
          }

          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            console.log('🛑 MediaRecorder stopped');
          }

          if (audioStream) {
            audioStream.getTracks().forEach(track => {
              track.stop();
              console.log(`🛑 Audio track stopped: ${track.kind}`);
            });
            audioStream = null;
          }
        } catch (error) {
          console.error('❌ Error stopping audio capture:', error);
        }
      };

      // Function to send audio data (will be overridden)
      window.sendAudioToTranscription = (audioBase64) => {
        console.log('📡 Audio data ready for transcription');
      };
    });

    // Override the sendAudioToTranscription function to handle audio processing
    await page.exposeFunction('processAudioChunk', async (audioBase64) => {
      try {
        const audioBuffer = Buffer.from(audioBase64, 'base64');

        const request = {
          audio: { content: audioBuffer },
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 16000,
            languageCode: 'pl-PL',
            enableAutomaticPunctuation: true,
            model: 'latest_long'
          }
        };

        const [response] = await speechClient.recognize(request);
        const transcription = response.results
          .map(result => result.alternatives[0].transcript)
          .join(' ');

        if (transcription.trim()) {
          transcriptionBuffer.addText(transcription);
        }

      } catch (error) {
        log(`⚠️ Transcription error: ${error.message}`);
      }
    });

    // Override the sendAudioToTranscription function in the page
    await page.evaluate(() => {
      window.sendAudioToTranscription = (audioBase64) => {
        window.processAudioChunk(audioBase64);
      };
    });

    // Check if functions were injected properly
    const functionsReady = await page.evaluate(() => {
      return {
        startAudioCapture: typeof window.startAudioCapture === 'function',
        stopAudioCapture: typeof window.stopAudioCapture === 'function',
        sendAudioToTranscription: typeof window.sendAudioToTranscription === 'function'
      };
    });

    log(`🔍 Function injection status: ${JSON.stringify(functionsReady)}`);

    if (!functionsReady.startAudioCapture) {
      throw new Error('Audio capture functions were not injected properly');
    }

    // Start audio capture with user instructions
    log('🎤 Starting audio capture...');
    log('⚠️ BROWSER PROMPT: When prompted, please:');
    log('   1. Select "Entire screen" or "Chrome tab"');
    log('   2. ✅ CHECK "Share system audio" checkbox');
    log('   3. Click "Share"');

    const captureStarted = await page.evaluate(() => window.startAudioCapture());

    if (captureStarted) {
      log('✅ Transcription system started successfully');
      log('🎙️ Audio is being captured and transcribed in real-time');
      log('📝 Transcriptions will be uploaded to Firebase every 1 minute');
    } else {
      log('❌ Failed to start audio capture');
      log('💡 TIP: Refresh the page and try again, making sure to check "Share system audio"');
    }

  } catch (error) {
    log(`❌ Error starting transcription: ${error.message}`);
  }
}

function stopTranscription() {
  if (transcriptionBuffer) {
    transcriptionBuffer.stop();
    transcriptionBuffer = null;
    log('🛑 Transcription system stopped');
  }
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

    log(`Launching REGULAR Chrome browser for meeting ${meeting.id || 'demo'}`);

    // Try to kill existing Chrome processes
    try {
      log('🔄 Checking for existing Chrome processes...');
      await new Promise((resolve) => {
        require('child_process').exec('tasklist /FI "IMAGENAME eq chrome.exe"', (error, stdout) => {
          if (stdout.includes('chrome.exe')) {
            log('⚠️ Chrome is running. Attempting to close gracefully...');
            require('child_process').exec('taskkill /IM chrome.exe /T /F', { windowsHide: true }, () => {
              setTimeout(resolve, 2000); // Wait 2 seconds after killing
            });
          } else {
            log('✅ No Chrome processes found');
            resolve();
          }
        });
      });
    } catch (error) {
      log(`⚠️ Could not check Chrome processes: ${error.message}`);
    }

    // Try different Chrome installation paths
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.CHROME_PATH, // Environment variable if set
    ].filter(Boolean);

    let executablePath;
    for (const path of chromePaths) {
      if (fs.existsSync(path)) {
        executablePath = path;
        log(`✅ Found Chrome at: ${path}`);
        break;
      }
    }

    if (!executablePath) {
      log('⚠️ Chrome not found at standard locations, using Puppeteer default');
    }

    // Chrome profiles configuration
    const chromeUserDataDir = 'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Google\\Chrome\\User Data';

    // PROFILE SELECTION: Choose which Chrome profile to use
    const profileName = 'Default'; // Your Mironikson account is in Profile 1
    // Common profile names: 'Default', 'Profile 1', 'Profile 2', 'Profile 3', 'Profile 4', etc.

    // Chrome profile directory naming logic
    let selectedProfileDir;
    let profileDirName;

    if (profileName === 'Default') {
      selectedProfileDir = `${chromeUserDataDir}\\Default`;
      profileDirName = 'Default';
    } else if (profileName.startsWith('Profile ')) {
      selectedProfileDir = `${chromeUserDataDir}\\${profileName}`;
      profileDirName = profileName;
    } else {
      // If it's a custom name like "Mironikson", we need to find the matching profile
      selectedProfileDir = `${chromeUserDataDir}\\Profile ${profileName}`;
      profileDirName = `Profile ${profileName}`;
    }

    // Check if profile directories exist
    log(`🔍 Checking Chrome profiles...`);
    log(`👤 Chrome User Data dir: ${chromeUserDataDir}`);
    log(`📁 User Data exists: ${fs.existsSync(chromeUserDataDir)}`);
    log(`🎯 Selected profile: ${profileName}`);
    log(`📂 Profile path: ${selectedProfileDir}`);
    log(`📁 Selected profile exists: ${fs.existsSync(selectedProfileDir)}`);

    // List available profiles for reference
    try {
      const profiles = fs.readdirSync(chromeUserDataDir).filter(item => {
        const fullPath = path.join(chromeUserDataDir, item);
        return fs.statSync(fullPath).isDirectory() && (item === 'Default' || item.startsWith('Profile'));
      });
      log(`📋 Available profiles: ${profiles.join(', ')}`);
    } catch (e) {
      log(`⚠️ Could not list profiles: ${e.message}`);
    }

    // Option 2: Use a separate automation profile
    const automationProfileDir = path.join(__dirname, 'chrome-profile-automation');

    // CONFIGURATION: Choose your profile option
    // Option 1: true = Use your Chrome profile (includes Microsoft login) - REQUIRES closing all Chrome windows first
    // Option 2: false = Use clean profile (you'll need to sign in manually)
    let useRealProfile = true; // Use normal Chrome without specific profile

    log(`📋 Profile mode: ${useRealProfile ? 'Real Chrome profile (with logins)' : 'Clean automation profile (manual sign-in required)'}`);

    if (useRealProfile) {
      log('⚠️ IMPORTANT: Make sure ALL Chrome windows are closed before this launches!');
      log('⏳ Waiting 3 seconds for you to close Chrome windows...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Try launching Chrome like your desktop shortcut
    try {
      log('🚀 Attempting to launch Chrome like desktop shortcut...');

      // Method 1: Try launching Chrome with remote debugging and connect to it
      log('🔗 Starting Chrome with remote debugging port...');

      const { spawn } = require('child_process');

      // Try a different port if 9222 is in use
      let debugPort = 9222;
      try {
        require('child_process').execSync(`netstat -ano | findstr :${debugPort}`, { stdio: 'ignore' });
        log(`🔴 Port ${debugPort} is in use, trying 9223...`);
        debugPort = 9223;
      } catch (e) {
        log(`✅ Port ${debugPort} is available`);
      }

      // Create a copy of your Chrome profile for debugging (this allows remote debugging)
      const tempUserDataDir = path.join(__dirname, 'temp-chrome-profile-with-account');

      // Remove old temp profile and create fresh one
      if (fs.existsSync(tempUserDataDir)) {
        fs.rmSync(tempUserDataDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempUserDataDir, { recursive: true });

      // Copy your Default profile to the temp directory
      const sourceProfile = selectedProfileDir;
      const targetProfile = path.join(tempUserDataDir, 'Default');

      if (fs.existsSync(sourceProfile)) {
        log('📋 Copying your Chrome profile for debugging (this preserves your logins)...');
        // Copy profile files (this might take a moment)
        try {
          fs.cpSync(sourceProfile, targetProfile, { recursive: true });
          log('✅ Profile copied successfully');
        } catch (copyError) {
          log(`⚠️ Profile copy failed: ${copyError.message}, using clean profile`);
        }
      }

      log(`🚀 Starting Chrome with: ${executablePath}`);
      const chromeArgs = [
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${tempUserDataDir}`,
        '--no-first-run',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--start-maximized',
        '--disable-features=ExternalProtocolInSandbox',
        '--disable-external-intent-requests',
        '--disable-protocol-handler-restrictions',
        meeting.meetingLink
      ];

      log(`🔧 Chrome args: ${chromeArgs.join(' ')}`);

      const chromeProcess = spawn(executablePath, chromeArgs, {
        detached: false, // Keep attached to see if it starts properly
        stdio: ['ignore', 'pipe', 'pipe'] // Capture output for debugging
      });

      chromeProcess.stdout.on('data', (data) => {
        log(`Chrome stdout: ${data.toString().trim()}`);
      });

      chromeProcess.stderr.on('data', (data) => {
        log(`Chrome stderr: ${data.toString().trim()}`);
      });

      chromeProcess.on('error', (error) => {
        log(`Chrome process error: ${error.message}`);
      });

      // Wait for Chrome to start and check if debugging port is ready
      log('⏳ Waiting for Chrome to start...');

      let debuggingReady = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          const http = require('http');
          await new Promise((resolve, reject) => {
            const req = http.get(`http://localhost:${debugPort}/json/version`, (res) => {
              if (res.statusCode === 200) {
                debuggingReady = true;
                log(`✅ Chrome debugging port ${debugPort} is ready`);
                resolve();
              } else {
                reject(new Error(`Status: ${res.statusCode}`));
              }
            });
            req.on('error', reject);
            req.setTimeout(2000, () => reject(new Error('Timeout')));
          });
          break;
        } catch (e) {
          log(`⏳ Waiting for debugging port... (attempt ${i + 1}/10)`);
        }
      }

      if (!debuggingReady) {
        throw new Error('Chrome debugging port never became available');
      }

      // Connect to the running Chrome instance
      log(`🔗 Attempting to connect to Chrome on port ${debugPort}...`);
      browser = await puppeteer.connect({
        browserURL: `http://localhost:${debugPort}`,
        slowMo: 50
      });

      log('✅ Connected to running Chrome instance (should be like your normal Chrome)');

      // Get the page with our meeting link
      log('📄 Getting pages from Chrome instance...');
      const pages = await browser.pages();
      log(`📊 Found ${pages.length} pages in Chrome`);

      page = pages.find(p => p.url().includes('teams.microsoft.com')) || pages[pages.length - 1];

      if (!page) {
        log('📝 Creating new page for meeting...');
        page = await browser.newPage();
        await page.goto(meeting.meetingLink);
      } else {
        log('✅ Found existing page, using it for automation');
      }

    } catch (profileError) {
      log(`❌ Failed to connect to Chrome: ${profileError.message}`);
      log('💡 Make sure Chrome isn\'t already running on port 9222');
      throw new Error(`Chrome connection failed: ${profileError.message}`);
    }

    // Set realistic user agent and remove automation markers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Minimal stealth measures - remove obvious automation markers only
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver property if it exists
      if (navigator.webdriver) {
        delete navigator.webdriver;
      }
    });

    // Add page disconnect protection
    page.on('close', () => {
      log('⚠️ Page was closed unexpectedly');
    });

    page.on('error', (error) => {
      log(`⚠️ Page error: ${error.message}`);
    });

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

    // Check if we already have the meeting page loaded
    const currentUrl = await page.url();
    if (!currentUrl.includes('teams.microsoft.com')) {
      log(`Navigating to meeting link: ${meeting.meetingLink}`);
      try {
        await page.goto(meeting.meetingLink, {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
        log('✅ Initial navigation completed');
      } catch (navError) {
        log(`⚠️ Navigation warning: ${navError.message}`);
        await page.waitForTimeout(5000);
      }
    } else {
      log('✅ Meeting page already loaded from Chrome launch');
    }

    // Wait for page to stabilize
    log('Waiting for page to stabilize...');
    await page.waitForTimeout(5000);

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
      log(`🎉 Successfully joined meeting!`);
      await page.screenshot({ path: path.join(logsDir, `step7-meeting-joined.png`) });

      // Start transcription system
      log('🎙️ Starting transcription system...');
      await startTranscription(page, meeting.id || 'demo', meeting.userDisplayName || 'User');

      // Keep the browser open - user will manually close
      log('✅ Meeting joined successfully! Browser will stay open until manually closed.');
      log('🎙️ Transcription is running - close the browser when you want to end the session.');

      // Wait indefinitely until browser is closed manually
      try {
        await new Promise(() => {}); // Never resolves - waits until browser is closed
      } catch (error) {
        // Browser was closed or other interruption
        log('🛑 Session ended');
      }

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
    // Ensure transcription is always stopped
    if (page) {
      try {
        await page.evaluate(() => {
          if (window.stopAudioCapture) {
            window.stopAudioCapture();
          }
        });
      } catch (e) {
        // Ignore page evaluation errors during cleanup
      }
    }
    stopTranscription();

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
  log(`🔍 Running demo mode using ${dbManager.getBackendType()} storage`);

  // Get pending meetings from database
  let pendingMeetings = [];
  try {
    pendingMeetings = await dbManager.getPendingMeetings();
    log(`📋 Found ${pendingMeetings.length} pending meetings`);
  } catch (error) {
    log(`⚠️ Could not load meetings from ${dbManager.getBackendType()}: ${error.message}`);
    return;
  }

  if (pendingMeetings.length > 0) {
    log('🎯 Found pending meetings!');

    // Process the first pending meeting
    const meeting = pendingMeetings[0];

    // Get current user for credentials
    const currentUser = await dbManager.getCurrentUser();
    if (!currentUser) {
      log('❌ No current user found in database. Please create a user first.');
      return;
    }

    const meetingData = {
      id: meeting.id,
      email: currentUser.teamsEmail,
      password: currentUser.teamsPassword,
      meetingLink: meeting.meetingLink,
      userDisplayName: currentUser.displayName
    };

    log(`🚀 Starting Teams meeting automation for meeting: ${meeting.id}`);
    log(`📅 Meeting scheduled for: ${meeting.scheduledTime}`);
    log(`👤 User: ${currentUser.displayName} (${currentUser.email})`);

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
  log(`📊 Using ${dbManager.getBackendType()} storage backend`);
  log('⏰ Monitoring for scheduled meetings every 30 seconds');

  // Check if we have a current user
  try {
    const currentUser = await dbManager.getCurrentUser();
    if (!currentUser) {
      log('❌ No current user found in database. Please create a user first.');
      process.exit(1);
    }
    log(`✅ Loaded credentials for ${currentUser.displayName} (${currentUser.email})`);
  } catch (error) {
    log(`❌ Error accessing ${dbManager.getBackendType()} database: ${error.message}`);
    process.exit(1);
  }

  // Check for meetings every 30 seconds
  setInterval(async () => {
    try {
      await checkAndJoinScheduledMeetings();
    } catch (error) {
      log(`⚠️  Error in scheduler: ${error.message}`);
    }
  }, 30000); // Check every 30 seconds

  // Keep the process alive
  log('🚀 Automation scheduler is running. Press Ctrl+C to stop.');
  log('📱 Check the dashboard for meeting status updates.');
}

async function checkAndJoinScheduledMeetings() {
  const now = new Date();

  // Get pending meetings from database (Firebase or local)
  let pendingMeetings = [];
  try {
    pendingMeetings = await dbManager.getPendingMeetings();
    log(`📋 Found ${pendingMeetings.length} pending meetings in ${dbManager.getBackendType()}`);
  } catch (error) {
    log(`⚠️ Could not load meetings from ${dbManager.getBackendType()}: ${error.message}`);
    return;
  }

  if (pendingMeetings.length === 0) {
    log(`📅 No pending meetings found. Current time: ${now.toLocaleString()}`);
    return; // No meetings to check
  }

  log(`📋 Checking ${pendingMeetings.length} meetings...`);

  for (const meeting of pendingMeetings) {

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

      // Get current user to get credentials
      const currentUser = await dbManager.getCurrentUser();
      if (!currentUser) {
        log(`❌ No current user found for meeting ${meeting.id}`);
        activeMeetings.delete(meeting.id);
        continue;
      }

      const meetingData = {
        id: meeting.id,
        email: currentUser.teamsEmail,
        password: currentUser.teamsPassword,
        meetingLink: meeting.meetingLink,
        userDisplayName: currentUser.displayName
      };

      try {
        const result = await joinTeamsMeeting(meetingData);
        if (result.success) {
          log(`✅ Successfully joined meeting ${meeting.id}!`);
          // Update meeting status in database
          await dbManager.updateMeeting(meeting.id, {
            status: 'joined',
            joinedAt: new Date()
          });
        } else {
          log(`❌ Failed to join meeting ${meeting.id}: ${result.error}`);
          // Update meeting status to failed and increment retry count
          await dbManager.updateMeeting(meeting.id, {
            status: 'failed',
            failureReason: result.error,
            retryCount: (meeting.retryCount || 0) + 1
          });
        }
      } catch (error) {
        log(`💥 Error joining meeting ${meeting.id}: ${error.message}`);
        // Update meeting status to failed
        await dbManager.updateMeeting(meeting.id, {
          status: 'failed',
          failureReason: error.message,
          retryCount: (meeting.retryCount || 0) + 1
        });
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
} else if (meetingId) {
  // Join specific meeting by ID
  log(`🔍 Looking up meeting ID: ${meetingId}`);

  (async () => {
    try {
      const meetings = await dbManager.getMeetings();
      const meeting = meetings.find(m => m.id === meetingId);

      if (!meeting) {
        log(`❌ Meeting ${meetingId} not found in ${dbManager.getBackendType()}`);
        process.exit(1);
      }

      // Get current user for credentials
      const currentUser = await dbManager.getCurrentUser();
      if (!currentUser) {
        log('❌ No current user found in database. Please create a user first.');
        process.exit(1);
      }

      const meetingData = {
        id: meeting.id,
        email: currentUser.teamsEmail,
        password: currentUser.teamsPassword,
        meetingLink: meeting.meetingLink,
        userDisplayName: currentUser.displayName
      };

      const result = await joinTeamsMeeting(meetingData);

      if (result.success) {
        log('✅ Meeting joined successfully!');
      } else {
        log(`❌ Failed to join meeting: ${result.error}`);
      }
      process.exit(0);
    } catch (error) {
      log(`💥 Fatal error: ${error.message}`);
      process.exit(1);
    }
  })();
} else if (command === 'server' || command === 'dashboard') {
  // Start HTTP server for dashboard
  startDashboardServer();
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

// ===========================
// HTTP SERVER FOR DASHBOARD
// ===========================

function startDashboardServer() {
  const PORT = 3000;

  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    try {
      if (pathname === '/api/status') {
        // Health check endpoint
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          backend: dbManager.getBackendType(),
          timestamp: new Date().toISOString()
        }));

      } else if (pathname === '/api/user' && method === 'GET') {
        // Get current user
        const user = await dbManager.getCurrentUser();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(user));

      } else if (pathname === '/api/user' && method === 'POST') {
        // Create new user
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const userData = JSON.parse(body);
            const user = await dbManager.createUser(userData);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(user));
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });

      } else if (pathname.startsWith('/api/user/') && method === 'PUT') {
        // Update user
        const userId = pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const updateData = JSON.parse(body);
            const user = await dbManager.updateUser(userId, updateData);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(user));
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });

      } else if (pathname === '/api/meetings' && method === 'GET') {
        // Get all meetings
        const meetings = await dbManager.getMeetings();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(meetings));

      } else if (pathname === '/api/meetings' && method === 'POST') {
        // Create new meeting
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const meetingData = JSON.parse(body);
            const meeting = await dbManager.addMeeting(meetingData);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(meeting));
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });

      } else if (pathname.startsWith('/api/meetings/') && method === 'DELETE') {
        // Delete meeting
        const meetingId = pathname.split('/')[3];
        try {
          await dbManager.deleteMeeting(meetingId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }

      } else if (pathname === '/api/logs' && method === 'GET') {
        // Get logs
        const logs = await dbManager.getLogs(100);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(logs));

      } else if (pathname === '/api/stats' && method === 'GET') {
        // Get statistics
        const stats = await dbManager.getStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));

      } else if (pathname === '/api/export' && method === 'GET') {
        // Export data
        if (dbManager.getBackendType() === 'local') {
          const exportPath = dbManager.storage.exportData();
          if (exportPath) {
            const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Export failed' }));
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Export only available for local storage' }));
        }

      } else if (pathname === '/api/import' && method === 'POST') {
        // Import data
        if (dbManager.getBackendType() === 'local') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', async () => {
            try {
              const importData = JSON.parse(body);
              const tempFile = path.join(__dirname, 'temp-import.json');
              fs.writeFileSync(tempFile, JSON.stringify(importData, null, 2));
              const success = dbManager.storage.importData(tempFile);
              fs.unlinkSync(tempFile);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success }));
            } catch (error) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
          });
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Import only available for local storage' }));
        }

      } else if (pathname === '/dashboard' || pathname === '/') {
        // Serve dashboard HTML
        const dashboardPath = path.join(__dirname, '..', 'local-dashboard.html');
        if (fs.existsSync(dashboardPath)) {
          const html = fs.readFileSync(dashboardPath, 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Dashboard file not found');
        }

      } else {
        // 404 Not Found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
      }

    } catch (error) {
      log(`❌ Server error: ${error.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  server.listen(PORT, () => {
    log(`🌐 Dashboard server started at http://localhost:${PORT}`);
    log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    log(`🔗 API Base: http://localhost:${PORT}/api`);
    log(`💾 Using ${dbManager.getBackendType()} storage backend`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      log(`❌ Port ${PORT} is already in use. Stop any other processes using this port.`);
    } else {
      log(`❌ Server error: ${error.message}`);
    }
    process.exit(1);
  });
}