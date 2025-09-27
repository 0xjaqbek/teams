# Local Teams Meeting Automation 🖥️

This runs the Teams meeting automation on your local machine with a **visible browser window** so you can see exactly what's happening!

## 🚀 Quick Start

### 1. **Edit Credentials**
Open `local-joiner.js` and update these lines:

```javascript
const CONFIG = {
  FIREBASE_PROJECT_ID: 'student-e6421',
  FIREBASE_PRIVATE_KEY: 'YOUR_FIREBASE_PRIVATE_KEY_HERE',
  FIREBASE_CLIENT_EMAIL: 'YOUR_FIREBASE_CLIENT_EMAIL_HERE',
  ENCRYPTION_KEY: 'your-32-character-secret-key-here!!'
};
```

### 2. **Test with Demo Meeting**
For quick testing, scroll down in `local-joiner.js` and update:

```javascript
const demoMeeting = {
  id: 'demo-meeting',
  email: 'your-teams-email@example.com',        // Your actual Teams email
  password: 'your-teams-password',              // Your actual Teams password
  meetingLink: 'https://teams.microsoft.com/l/meetup-join/...' // Actual meeting link
};
```

### 3. **Run the Automation**

#### Option A: Demo Mode (with hardcoded meeting)
```bash
cd meeting-joiner
node local-joiner.js
```

#### Option B: Firebase Mode (lookup meeting by ID)
```bash
cd meeting-joiner
node local-joiner.js MEETING_ID_HERE
```

## 🎬 What You'll See

1. **Chrome browser opens** (visible, not headless!)
2. **Developer tools open** for debugging
3. **Actions happen slowly** so you can follow along
4. **Screenshots saved** to `logs/` folder for each step
5. **Detailed console output** showing each action
6. **Browser stays open 2 minutes** after joining so you can see the meeting

## 📁 Generated Files

- `logs/local-meeting-log-YYYY-MM-DD.txt` - Detailed text logs
- `logs/step1-initial-page.png` - Screenshot of initial page
- `logs/step2-after-web-join.png` - After clicking "Join on web"
- `logs/step3-email-entered.png` - After entering email
- `logs/step4-password-entered.png` - After entering password
- `logs/step5-meeting-page.png` - Meeting page loaded
- `logs/step6-after-join-click.png` - After clicking join
- `logs/step7-meeting-joined.png` - Successfully in meeting

## 🔧 Configuration Options

In `local-joiner.js`, you can modify:

```javascript
browser = await puppeteer.launch({
  headless: false,  // Set to true to hide browser
  devtools: true,   // Set to false to hide dev tools
  slowMo: 1000,     // Milliseconds between actions (0 = full speed)
  args: [
    '--start-maximized'  // Opens browser maximized
  ]
});
```

## 🐛 Troubleshooting

### Browser doesn't open
- Make sure Chrome is installed
- Try running: `npx puppeteer browsers install chrome`

### Authentication fails
- Check your Teams email/password are correct
- Try logging into Teams manually first
- Check if 2FA is enabled (may need app passwords)

### Meeting link doesn't work
- Make sure the meeting link is valid and active
- Try joining the meeting manually first
- Check if the meeting requires registration

## 💡 Tips

- **Run during an actual meeting** to see it join live
- **Check the screenshots** if something goes wrong
- **Modify the slowMo value** to speed up or slow down actions
- **Use developer tools** to inspect elements if selectors fail

## 🔒 Security Note

Never commit the file with real credentials! The credentials are only stored locally on your machine.