# Teams Meeting Automation - Local Version 🏠

**Simple, secure, and completely local Teams automation - no Firebase required!**

## ✨ What is the Local Version?

The Local Version is a simplified version of Teams Meeting Automation that:
- ✅ **Works completely offline** (except for joining meetings)
- ✅ **No Firebase setup required** - saves hours of configuration
- ✅ **All data stored locally** on your computer (encrypted)
- ✅ **Ready in 5 minutes** - fastest setup possible
- ✅ **100% free** - no external service costs

## 🚀 Quick Start (4 Steps)

### 1. Install Prerequisites
- **Node.js** (version 18+): [Download here](https://nodejs.org/)
- **Google Chrome** browser

### 2. Download & Install
```bash
# Download the project and install dependencies
cd teams-meeting-scheduler/meeting-joiner
npm install
```

### 3. Start the Local Dashboard
```bash
node local-joiner.js dashboard
```
This starts a local web server at `http://localhost:3000`

### 4. Configure & Use
1. Open `http://localhost:3000` in your browser
2. Go to **Settings** tab and enter your Teams credentials
3. Go to **Dashboard** tab and schedule your first meeting!

## 📱 Dashboard Features

The local dashboard provides:

- **📊 Dashboard**: Real-time statistics and quick meeting scheduling
- **📅 Meetings**: View, manage, and delete scheduled meetings
- **⚙️ Settings**: Configure your Teams credentials (encrypted storage)
- **📄 Logs**: View automation activity and troubleshooting info

## 🔧 Available Commands

```bash
# Start the web dashboard (recommended)
node local-joiner.js dashboard

# Start background monitoring (automatically joins scheduled meetings)
node local-joiner.js schedule

# Join a specific meeting by ID
node local-joiner.js [meeting-id]

# Run demo mode (if you have test meetings)
node local-joiner.js
```

## 🔒 Security & Privacy

- **Local encryption**: All credentials encrypted using AES-256-CBC
- **No cloud storage**: Everything stays on your computer
- **No external dependencies**: Works without Firebase, Google Cloud, or any external services
- **Offline management**: Schedule and manage meetings without internet

## 📁 Data Storage

All data is stored locally in `meeting-joiner/data/`:
- `meetings.json` - Your scheduled meetings
- `users.json` - Your encrypted credentials
- `logs.json` - Activity logs
- `config.json` - App configuration

## 💾 Backup & Export

The dashboard includes built-in backup features:
- **Export**: Download all your data as JSON
- **Import**: Restore from a backup file
- **Automatic**: Data is automatically saved locally

## 🆚 Local vs Firebase Version

| Feature | Local Version | Firebase Version |
|---------|---------------|------------------|
| Setup time | 5 minutes | 30+ minutes |
| External services | None | Firebase + Google Cloud |
| Data storage | Local encrypted | Cloud database |
| Cost | Free | Free (with limits) |
| Multi-device sync | ❌ | ✅ |
| Offline use | ✅ | ❌ |
| Team sharing | ❌ | ✅ |

## 🛠️ Troubleshooting

### Port 3000 already in use
```bash
# Find what's using port 3000
netstat -ano | findstr :3000

# Or use a different port (modify the script)
```

### Browser won't connect
- Make sure the server is running (`node local-joiner.js dashboard`)
- Try `http://127.0.0.1:3000` instead of `localhost`
- Check Windows Firewall settings

### Meetings not joining automatically
1. Make sure you're running the scheduler: `node local-joiner.js schedule`
2. Check that meeting times are correct (timezone)
3. Verify Teams credentials in Settings

### Lost data
- Check `meeting-joiner/data/` folder for backup files
- Use the Import feature in dashboard
- All exports are timestamped for easy recovery

## 🚀 Advanced Usage

### Auto-start with Windows
Create a batch file to start with Windows:

```batch
@echo off
cd /d "C:\path\to\teams-meeting-scheduler\meeting-joiner"
node local-joiner.js schedule
```

Save as `teams-automation.bat` and add to Windows startup folder.

### Running as Service
For production use, consider running as a Windows service using tools like `node-windows` or `PM2`.

## 🔄 Switching to Firebase Version

If you later want team collaboration features:
1. Keep your local data (export it first)
2. Follow the Firebase setup guide
3. Import your local data to Firebase

## 📞 Support

- **Issues**: Check `meeting-joiner/data/logs.json` for error details
- **GitHub**: Report bugs at the main repository
- **Local logs**: All activity is logged in the dashboard Logs tab

## 🎯 Perfect For

- **Individual users** who want quick setup
- **Privacy-conscious users** who prefer local data
- **Offline environments** with limited internet
- **Testing and development** without cloud dependencies
- **Users with firewall restrictions**

---

**Ready to automate your Teams meetings in 5 minutes? Run `node local-joiner.js dashboard` and get started!** 🚀