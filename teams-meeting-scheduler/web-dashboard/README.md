# Teams Meeting Automation Dashboard 🚀

A modern, responsive web interface for managing your Teams meeting automation system.

## ✨ Features

### 🎛️ **Dashboard Overview**
- **Real-time status monitoring** - See automation status at a glance
- **Quick action buttons** - Run local automation, trigger GitHub Actions
- **Meeting management** - Schedule, view, and delete meetings
- **Statistics dashboard** - Success rates, pending meetings, daily counts
- **Activity feed** - Real-time logs of automation activities

### 🖥️ **User Interface**
- **Modern gradient design** - Beautiful purple/blue gradient background
- **Responsive layout** - Works on desktop, tablet, and mobile
- **Dark terminal** - Built-in command terminal for debugging
- **Toast notifications** - Real-time feedback for all actions
- **Modal dialogs** - Clean interfaces for scheduling meetings

### 🔧 **Automation Control**
- **Local automation** - Run automation on your machine with visible browser
- **GitHub Actions** - Trigger cloud-based automation
- **Meeting scheduler** - Easy form to schedule new meetings
- **Real-time logs** - View automation logs and screenshots

## 🚀 Setup Instructions

### 1. **Open the Dashboard**
Simply open `index.html` in your web browser:
```bash
# Navigate to the dashboard folder
cd web-dashboard

# Open in your default browser (Windows)
start index.html

# Or open in your default browser (Mac)
open index.html

# Or open in your default browser (Linux)
xdg-open index.html
```

### 2. **Configure Firebase (Optional)**
To connect to your Firebase database, edit `config.js`:

```javascript
window.firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "student-e6421.firebaseapp.com",
    projectId: "student-e6421",
    storageBucket: "student-e6421.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

### 3. **Configure GitHub Actions (Optional)**
To trigger GitHub Actions from the dashboard, update `config.js`:

```javascript
window.githubConfig = {
    username: "your-github-username",
    repository: "your-repo-name",
    token: "your-github-personal-access-token"
};
```

### 4. **Demo Mode**
The dashboard works in demo mode by default with sample data. To disable demo mode after configuring Firebase:

```javascript
window.demoMode = {
    enabled: false // Set to false when Firebase is configured
};
```

## 🎯 How to Use

### **Quick Actions**
1. **Run Local Automation** - Executes automation on your machine with visible browser
2. **Trigger GitHub Action** - Starts cloud-based automation workflow
3. **Schedule Meeting** - Opens form to add new meeting to the queue
4. **View Logs** - Shows detailed automation logs and screenshots

### **Meeting Management**
- **View scheduled meetings** in the main dashboard
- **Schedule new meetings** using the form modal
- **Monitor meeting status** (pending, joined, failed, retrying)
- **Delete meetings** using the trash icon

### **Terminal**
- **Toggle terminal** with the floating action button (bottom right)
- **View real-time logs** and command output
- **Clear terminal** using the trash icon
- **Keyboard shortcut**: `Ctrl + \`` to toggle terminal

### **Statistics**
Monitor your automation performance:
- **Successful Joins** - Number of meetings successfully joined
- **Pending Meetings** - Meetings waiting to be processed
- **Failed Attempts** - Meetings that failed to join
- **Today's Meetings** - Meetings scheduled for today

## 🎨 UI/UX Features

### **Visual Design**
- **Gradient background** - Modern purple-to-blue gradient
- **Card-based layout** - Clean, organized sections
- **Animated elements** - Smooth transitions and hover effects
- **Status indicators** - Color-coded meeting statuses
- **Icon system** - FontAwesome icons throughout

### **Interaction Design**
- **Hover effects** - Interactive buttons and cards
- **Loading states** - Spinners for async operations
- **Modal overlays** - Clean popup interfaces
- **Toast notifications** - Non-intrusive feedback
- **Responsive grid** - Adapts to all screen sizes

### **Accessibility**
- **Keyboard shortcuts** - ESC to close modals, Ctrl+` for terminal
- **Focus management** - Proper tab navigation
- **Screen reader friendly** - Semantic HTML structure
- **High contrast** - Good color contrast ratios

## 🔧 Customization

### **Colors**
Edit CSS variables in `styles.css`:
```css
:root {
    --primary-color: #0078d4;    /* Main blue color */
    --success-color: #198754;    /* Success green */
    --warning-color: #ffc107;    /* Warning yellow */
    --danger-color: #dc3545;     /* Error red */
}
```

### **Layout**
- **Grid responsive** - Modify grid layouts in CSS
- **Card sizing** - Adjust card dimensions and spacing
- **Terminal size** - Resize terminal window dimensions

### **Functionality**
- **Refresh intervals** - Change auto-refresh timing in `config.js`
- **Toast duration** - Adjust notification display time
- **Demo data** - Modify sample meetings and stats

## 📱 Mobile Support

The dashboard is fully responsive and works on:
- **Desktop** - Full feature set with multi-column layout
- **Tablet** - Optimized two-column layout
- **Mobile** - Single-column stack layout
- **Terminal** - Adapts to screen width

## 🔒 Security Notes

- **Demo mode** by default - No real credentials exposed
- **Local configuration** - Sensitive data stored in config files
- **HTTPS recommended** - Use HTTPS for GitHub API calls
- **Token security** - Keep GitHub tokens secure and rotate regularly

## 🐛 Troubleshooting

### **Dashboard not loading**
- Check browser console for JavaScript errors
- Ensure all files are in the correct directories
- Verify internet connection for external CDN resources

### **Firebase not connecting**
- Verify Firebase configuration in `config.js`
- Check Firebase console for project settings
- Ensure Firestore security rules allow read/write

### **GitHub Actions not triggering**
- Verify GitHub token has `repo` and `workflow` permissions
- Check repository name and username in config
- Ensure Actions are enabled in repository settings

### **Responsive issues**
- Clear browser cache
- Check CSS media queries
- Test in different browsers

## 🎯 Next Steps

1. **Configure real Firebase connection**
2. **Set up GitHub personal access token**
3. **Customize colors and branding**
4. **Add custom automation workflows**
5. **Deploy to GitHub Pages or web server**

The dashboard provides a complete interface for managing your Teams meeting automation system with a modern, professional UI/UX design!