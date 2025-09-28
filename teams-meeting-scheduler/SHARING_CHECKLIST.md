# 🚀 Sharing Checklist

## Before Sharing Your Project

### ✅ Security Check
- [ ] Remove all personal credentials from `local-joiner.js`
- [ ] Check `.gitignore` is protecting sensitive files
- [ ] Remove or clear `user-credentials.json`
- [ ] Clear `meeting-joiner/logs/` directory
- [ ] Remove temporary Chrome profiles in `meeting-joiner/temp-chrome-*`

### ✅ Files to Check/Remove
```bash
# Remove these files before sharing:
meeting-joiner/user-credentials.json
meeting-joiner/logs/*.png
meeting-joiner/logs/*.txt
meeting-joiner/temp-chrome-profile-with-account/
meeting-joiner/chrome-profile-automation/

# Update these files with placeholder values:
meeting-joiner/local-joiner.js (CONFIG section)
web-dashboard/script.js (firebaseConfig)
```

### ✅ Quick Clean Command
```bash
# Run this to clean before sharing:
cd meeting-joiner
rm -rf logs temp-chrome-* chrome-profile-automation user-credentials.json
```

## How to Share

### Option 1: GitHub Repository (Recommended)
1. Create a new GitHub repository
2. Run the clean command above
3. Commit and push your code:
```bash
git add .
git commit -m "Teams Meeting Scheduler - Ready for sharing"
git push origin main
```
4. Share the repository URL with friends

### Option 2: ZIP File
1. Run the clean command above
2. Create ZIP of the entire project folder
3. Share the ZIP file

### Option 3: GitHub Fork
1. Fork this repository to your GitHub account
2. Customize and clean as needed
3. Share your fork URL

## What Friends Need to Do

### 1. Prerequisites
- Install Node.js 18+
- Install Chrome browser
- Create Firebase account
- (Optional) Create Google Cloud account for transcription

### 2. Setup Steps
1. Download/clone your shared project
2. Run `setup.bat` (Windows) or install dependencies manually
3. Configure Firebase project
4. Update CONFIG in `local-joiner.js`
5. Test with web dashboard

### 3. Configuration Help
- Provide `config.template.js` as reference
- Share your Firebase project settings (but NOT credentials)
- Help them set up their own Firebase project

## Support Your Friends

### Common Setup Issues
1. **Node.js version**: Ensure they have Node.js 18+
2. **Firebase setup**: Help them create Firebase project
3. **Chrome profiles**: Guide them through profile selection
4. **Meeting links**: Test with valid Teams meeting URLs

### What to Share
- ✅ Repository/project files
- ✅ Setup instructions (README.md)
- ✅ Configuration template
- ✅ Your experience and tips

### What NOT to Share
- ❌ Your Firebase credentials
- ❌ Your Google API keys
- ❌ Your user-credentials.json
- ❌ Your Chrome profile data
- ❌ Meeting logs or screenshots

## Example Sharing Message

```
Hey! I've created a Teams meeting automation tool that works great.

🎯 Features:
- Automatically joins Teams meetings
- Works with Polish interface
- Real-time transcription (optional)
- Web dashboard for scheduling

📥 Get it here: [your-repo-url]

📋 Setup:
1. Clone the repo
2. Run setup.bat
3. Follow README.md for Firebase setup
4. Configure your credentials in local-joiner.js

💡 Let me know if you need help setting it up!
```

## Ready to Share? ✅

Once you've completed this checklist, your project is ready to share safely with your friends!