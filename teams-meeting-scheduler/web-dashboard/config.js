// Firebase Configuration
// Replace with your actual Firebase config
window.firebaseConfig = {
    apiKey: "AIzaSyAmdHR-7ThvXdO1Y-QCDcwDib29xa3asK4",
    authDomain: "student-e6421.firebaseapp.com",
    projectId: "student-e6421",
    storageBucket: "student-e6421.appspot.com",
    messagingSenderId: "105877561229",
    appId: "1:105877561229:web:94e16edbe02324469767c4"
};

// GitHub Configuration (for triggering actions)
window.githubConfig = {
    username: "0xjaqbek", // Your GitHub username
    repository: "teams",  // Your repository name
    token: "your-github-personal-access-token" // Personal access token for API calls
};

// Application Configuration
window.appConfig = {
    // Local automation settings
    localAutomationPath: "../meeting-joiner/local-joiner.js",

    // GitHub Actions settings
    githubActionsWorkflow: "teams-meeting-joiner.yml",

    // Auto-refresh intervals (in milliseconds)
    refreshInterval: 30000, // 30 seconds

    // Terminal settings
    terminalMaxLines: 100,

    // Toast notification duration
    toastDuration: 5000,

    // Meeting defaults
    defaultMaxRetries: 3,
    defaultTimezone: "Europe/Warsaw"
};

// Demo mode configuration
window.demoMode = {
    enabled: false, // Set to false when Firebase is properly configured
    sampleMeetings: [
        {
            id: 'demo-1',
            meetingLink: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_example1',
            scheduledTime: new Date(Date.now() + 300000), // 5 minutes from now
            status: 'pending',
            teamsEmail: 'demo@example.com',
            retryCount: 0,
            maxRetries: 3
        },
        {
            id: 'demo-2',
            meetingLink: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_example2',
            scheduledTime: new Date(Date.now() - 600000), // 10 minutes ago
            status: 'joined',
            teamsEmail: 'demo@example.com',
            retryCount: 1,
            maxRetries: 3
        },
        {
            id: 'demo-3',
            meetingLink: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_example3',
            scheduledTime: new Date(Date.now() + 1800000), // 30 minutes from now
            status: 'retrying',
            teamsEmail: 'demo@example.com',
            retryCount: 2,
            maxRetries: 3
        }
    ],
    sampleStats: {
        successCount: 12,
        pendingCount: 3,
        failedCount: 2,
        todayCount: 5
    }
};