# Teams Meeting Scheduler & Automation

🤖 **Automated Teams meeting scheduler with Polish transcription support**

This project provides a complete solution for automatically joining Microsoft Teams meetings and recording Polish transcriptions in real-time.

## ✨ Features

- 🎯 **Automated Meeting Join** - Automatically joins Teams meetings at scheduled times
- 🔐 **Web Dashboard** - User-friendly interface for scheduling meetings
- 🎙️ **Polish Transcription** - Real-time transcription using Google Speech API
- 🔄 **Background Scheduler** - Monitors and joins meetings automatically
- 🌐 **Multi-User Support** - Firebase authentication and user management
- 📱 **Manual Override** - Browser stays open for manual control

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Chrome Browser** - Latest version recommended
- **Firebase Account** - For database and authentication
- **Google Cloud Account** - For Speech-to-Text API (optional, for transcription)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd teams-meeting-scheduler
```

### 2. Install Dependencies

```bash
# Install meeting joiner dependencies
cd meeting-joiner
npm install
cd ..

# Install Firebase functions dependencies
cd functions
npm install
cd ..
```

### 3. Firebase Setup

1. Create a new Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** with Email/Password and Google providers
3. Enable **Firestore Database**
4. Get your Firebase config and update `web-dashboard/script.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... rest of config
};
```

### 4. Deploy Firebase Functions

```bash
# Login to Firebase
firebase login

# Initialize project (if not done)
firebase init

# Deploy functions
firebase deploy --only functions
```

### 5. Configure Meeting Joiner

Edit `meeting-joiner/local-joiner.js` and update the CONFIG section:

```javascript
const CONFIG = {
  FIREBASE_PROJECT_ID: 'your-project-id',
  FIREBASE_PRIVATE_KEY: 'your-firebase-private-key',
  FIREBASE_CLIENT_EMAIL: 'your-firebase-client-email',
  ENCRYPTION_KEY: 'your-encryption-key',
  GOOGLE_API_KEY: 'your-google-api-key' // Optional, for transcription
};
```

## 📖 Usage

### Using the Web Dashboard

1. Open `web-dashboard/index.html` in your browser
2. **Sign up** or **Sign in** with your email
3. **Schedule a meeting** with Teams link and time
4. **Export credentials** using "Run Local Automation" button

### Running Local Automation

```bash
cd meeting-joiner

# Run background scheduler (monitors for scheduled meetings)
node local-joiner.js schedule

# Run single meeting test
node local-joiner.js
```

## 🎙️ Transcription Setup (Optional)

### Enable Google Speech API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable **Speech-to-Text API**
4. Create **API Key**
5. Add the API key to CONFIG in `local-joiner.js`

### Transcription Features

- **Real-time Polish transcription** during meetings
- **1-minute upload intervals** to Firebase
- **Live console display** of transcription
- **No audio storage** (privacy-focused)

## 🔧 Configuration Options

### Chrome Profile Settings

In `local-joiner.js`, you can configure which Chrome profile to use:

```javascript
// Use your real Chrome profile (with existing logins)
let useRealProfile = true;

// Select specific profile (Default, Profile 1, Profile 2, etc.)
const profileName = 'Default';
```

## 📁 Project Structure

```
teams-meeting-scheduler/
├── web-dashboard/          # Web interface for scheduling
│   ├── index.html         # Main dashboard page
│   ├── script.js          # Frontend logic
│   └── style.css          # Dashboard styling
├── meeting-joiner/         # Local automation scripts
│   ├── local-joiner.js    # Main automation script
│   ├── index.js           # GitHub Actions version
│   └── package.json       # Dependencies
├── functions/              # Firebase Cloud Functions
│   ├── src/index.ts       # Backend API
│   └── package.json       # Function dependencies
├── firestore.rules        # Database security rules
├── firestore.indexes.json # Database indexes
└── README.md              # This file
```

## 🚀 Advanced Usage

### Background Automation

The scheduler runs continuously and:
- Monitors for scheduled meetings every 30 seconds
- Automatically joins meetings at the right time
- Prevents duplicate joins with collision detection
- Updates meeting status in real-time

### Polish Language Support

The automation handles Polish Teams interface:
- "Kontynuuj w tej przeglądarce" (Continue in this browser)
- "Kontynuuj bez audio lub wideo" (Continue without audio or video)
- "Dołącz teraz" (Join now)

## 🐛 Troubleshooting

### Common Issues

**Chrome doesn't open with my account:**
- Set `useRealProfile = true` in `local-joiner.js`
- Make sure to close all Chrome windows before running
- Check the `profileName` matches your Chrome profile

**Meeting join fails:**
- Verify Teams meeting link is valid
- Check if Teams requires sign-in
- Ensure Chrome can access the meeting URL

**Transcription not working:**
- Verify Google API key is valid
- Check Speech-to-Text API is enabled
- Grant microphone/screen sharing permissions

### Debug Logs

Check the logs directory for screenshots and debug info:
```
meeting-joiner/logs/
├── local-meeting-log-YYYY-MM-DD.txt
├── step1-initial-page.png
├── step2-sign-in.png
└── ...
```

## 📄 License

This project is for educational purposes. Please ensure compliance with your organization's policies when using automated meeting tools.

## ⚠️ Important Notes

- **Respect Privacy**: Only use transcription with proper permissions
- **Meeting Policies**: Ensure automated joining complies with your organization's rules
- **Rate Limits**: Google Speech API has usage limits
- **Security**: Never commit credentials or API keys to version control

---

**Happy Automating!** 🎉
