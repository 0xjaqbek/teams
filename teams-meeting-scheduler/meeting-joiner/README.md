# Teams Meeting Joiner with GitHub Actions

This application automatically joins Microsoft Teams meetings using GitHub Actions and Puppeteer for browser automation.

## Features

- ✅ **Real browser automation** - Uses Puppeteer with Chrome
- ✅ **Scheduled execution** - Runs every 5 minutes via GitHub Actions
- ✅ **Manual trigger** - Can be triggered manually for specific meetings
- ✅ **Secure credentials** - Uses GitHub Secrets for sensitive data
- ✅ **Full logging** - Comprehensive logs with artifacts
- ✅ **Firebase integration** - Syncs with your existing Firebase database

## Setup Instructions

### 1. GitHub Repository Secrets

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

```
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
ENCRYPTION_KEY=your-32-character-encryption-key
```

### 2. Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings > Service Accounts**
4. Click **Generate new private key**
5. Copy the values to GitHub Secrets above

### 3. Enable GitHub Actions

1. Go to your repository
2. Click **Actions** tab
3. Enable Actions if not already enabled
4. The workflow will run automatically every 5 minutes

### 4. Manual Testing

To test with a specific meeting:

1. Go to **Actions** tab in your repository
2. Select **Teams Meeting Joiner** workflow
3. Click **Run workflow**
4. Enter a meeting ID (optional)
5. Click **Run workflow**

## How It Works

1. **Scheduled Trigger**: GitHub Actions runs every 5 minutes
2. **Query Meetings**: Checks Firebase for pending meetings within a 5-minute window
3. **Browser Automation**:
   - Launches Chrome with Puppeteer
   - Navigates to Teams meeting link
   - Handles Microsoft authentication
   - Clicks join buttons
   - Verifies successful join
4. **Status Updates**: Updates meeting status in Firebase
5. **Logging**: Creates detailed logs available as artifacts

## Advantages over Cloud Functions

- ✅ **Full GUI support** - Can handle complex web interactions
- ✅ **No timeout limits** - Can stay in meetings longer
- ✅ **Better debugging** - Full logs and screenshots available
- ✅ **Cost effective** - Free for public repos, generous limits for private
- ✅ **Reliable Chrome** - Pre-installed browser environment

## Log Files

Logs are automatically uploaded as artifacts:
- View in **Actions > Workflow Run > Artifacts**
- Includes timestamps, meeting IDs, and detailed error messages
- Retained for 7 days

## Troubleshooting

### Workflow not running
- Check if Actions are enabled in repository settings
- Verify cron schedule syntax
- Check repository activity (GitHub may pause workflows on inactive repos)

### Authentication failures
- Verify Firebase service account credentials
- Check encryption key matches the one used to encrypt passwords
- Ensure service account has Firestore read/write permissions

### Meeting join failures
- Check if meeting link is valid and accessible
- Verify Teams credentials are correct
- Review logs for specific error messages

## Security Notes

- All credentials are stored as GitHub Secrets (encrypted)
- Browser runs in headless mode
- No sensitive data is logged
- Artifacts auto-expire after 7 days