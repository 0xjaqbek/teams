import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { chromium } from 'playwright';
import * as crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();

interface Meeting {
  id: string;
  userId: string;
  teamsEmail: string;
  teamsPassword: string;
  meetingLink: string;
  scheduledTime: admin.firestore.Timestamp;
  status: 'pending' | 'joined' | 'failed' | 'retrying';
  retryCount: number;
  maxRetries: number;
  createdAt: admin.firestore.Timestamp;
  lastAttempt?: admin.firestore.Timestamp;
  errorMessage?: string;
}

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!!';

function encrypt(text: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encryptedText: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Log meeting activity
async function logMeetingActivity(
  meetingId: string,
  userId: string,
  action: 'scheduled' | 'joined' | 'failed' | 'retry',
  details?: string,
  errorMessage?: string
) {
  await db.collection('meetingLogs').add({
    meetingId,
    userId,
    action,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    details,
    errorMessage
  });
}

// Join Teams meeting with Playwright
async function joinTeamsMeeting(meeting: Meeting): Promise<{ success: boolean; error?: string }> {
  let browser;
  try {
    console.log(`Starting Teams meeting join for meeting ${meeting.id}`);

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    const page = await context.newPage();

    // Navigate to Teams meeting
    await page.goto(meeting.meetingLink, { waitUntil: 'networkidle' });

    // Wait for login or meeting page
    await page.waitForTimeout(3000);

    // Check if we need to login
    if (page.url().includes('login.microsoftonline.com')) {
      console.log('Login required, entering credentials');

      // Enter email
      await page.fill('input[type="email"]', decrypt(meeting.teamsEmail));
      await page.click('input[type="submit"]');
      await page.waitForTimeout(2000);

      // Enter password
      await page.fill('input[type="password"]', decrypt(meeting.teamsPassword));
      await page.click('input[type="submit"]');
      await page.waitForTimeout(3000);

      // Handle "Stay signed in?" prompt
      try {
        await page.click('input[type="submit"]', { timeout: 5000 });
      } catch {
        // Ignore if not present
      }

      await page.waitForTimeout(3000);
    }

    // Wait for meeting page to load
    await page.waitForTimeout(5000);

    // Try to join the meeting
    // Look for various join buttons
    const joinSelectors = [
      'button[data-tid="joinOnWeb"]',
      'button[data-tid="prejoin-join-button"]',
      'button:has-text("Join now")',
      'button:has-text("Join on the web instead")',
      '[data-tid="toggle-mute-microphone"]' // If already in meeting
    ];

    let joined = false;
    for (const selector of joinSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          joined = true;
          console.log(`Joined meeting using selector: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`Selector ${selector} not found or failed: ${error}`);
      }
    }

    if (!joined) {
      // Try alternative approach - click any button containing "join"
      try {
        await page.click('button:has-text("join")', { timeout: 5000 });
        joined = true;
      } catch {
        console.log('No join button found with text "join"');
      }
    }

    if (joined) {
      // Wait a bit to ensure we're in the meeting
      await page.waitForTimeout(10000);
      console.log('Successfully joined Teams meeting');
      return { success: true };
    } else {
      console.log('Could not find join button');
      return { success: false, error: 'Could not find join button on meeting page' };
    }

  } catch (error) {
    console.error('Error joining Teams meeting:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Scheduled function to check for meetings to join
export const processPendingMeetings = functions.pubsub
  .schedule('every 1 minutes')
  .timeZone('Europe/Warsaw')
  .onRun(async (context) => {
    console.log('Checking for pending meetings to join...');

    const now = admin.firestore.Timestamp.now();
    const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 5 * 60 * 1000);

    // Query for meetings that should be joined (within the last 5 minutes)
    const meetingsSnapshot = await db.collection('meetings')
      .where('status', 'in', ['pending', 'retrying'])
      .where('scheduledTime', '<=', now)
      .where('scheduledTime', '>=', fiveMinutesAgo)
      .get();

    console.log(`Found ${meetingsSnapshot.docs.length} meetings to process`);

    for (const doc of meetingsSnapshot.docs) {
      const meeting = { id: doc.id, ...doc.data() } as Meeting;

      try {
        console.log(`Processing meeting ${meeting.id} for user ${meeting.userId}`);

        // Update status to retrying
        await doc.ref.update({
          status: 'retrying',
          lastAttempt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log retry attempt
        await logMeetingActivity(
          meeting.id,
          meeting.userId,
          'retry',
          `Attempting to join meeting (retry ${meeting.retryCount + 1}/${meeting.maxRetries})`
        );

        // Attempt to join the meeting
        const result = await joinTeamsMeeting(meeting);

        if (result.success) {
          // Successfully joined
          await doc.ref.update({
            status: 'joined',
            lastAttempt: admin.firestore.FieldValue.serverTimestamp()
          });

          await logMeetingActivity(
            meeting.id,
            meeting.userId,
            'joined',
            'Successfully joined Teams meeting'
          );

          console.log(`Successfully joined meeting ${meeting.id}`);
        } else {
          // Failed to join
          const newRetryCount = meeting.retryCount + 1;
          const shouldRetry = newRetryCount < meeting.maxRetries;

          await doc.ref.update({
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

          console.log(`Failed to join meeting ${meeting.id}: ${result.error}`);
        }

      } catch (error) {
        console.error(`Error processing meeting ${meeting.id}:`, error);

        await doc.ref.update({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
          lastAttempt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logMeetingActivity(
          meeting.id,
          meeting.userId,
          'failed',
          'Error during meeting processing',
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    console.log('Finished processing pending meetings');
  });

// HTTP function to manually trigger meeting processing (for testing)
export const triggerMeetingProcess = functions.https.onRequest(async (req, res) => {
  console.log('Manual trigger for meeting processing');

  // This would normally be handled by the scheduled function
  // For now, just return a success message
  res.json({ message: 'Meeting processing trigger received' });
});

// Function to encrypt passwords when storing meetings
export const encryptMeetingData = functions.firestore
  .document('meetings/{meetingId}')
  .onCreate(async (snap, context) => {
    const meeting = snap.data();

    // Encrypt sensitive data
    const encryptedEmail = encrypt(meeting.teamsEmail);
    const encryptedPassword = encrypt(meeting.teamsPassword);

    // Update the document with encrypted data
    await snap.ref.update({
      teamsEmail: encryptedEmail,
      teamsPassword: encryptedPassword
    });

    // Log the scheduling
    await logMeetingActivity(
      snap.id,
      meeting.userId,
      'scheduled',
      `Meeting scheduled for ${meeting.scheduledTime.toDate().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}`
    );

    console.log(`Encrypted meeting data for meeting ${snap.id}`);
  });