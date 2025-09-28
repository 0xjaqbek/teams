// Global variables
let db = null;
let auth = null;
let currentUser = null;
let userProfile = null;
let meetings = [];
let logs = [];

// Encryption key for Teams credentials (in production, this should be more secure)
const ENCRYPTION_KEY = 'teams-automation-key-32-chars!!!';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeFirebase();
    initializeUI();
    loadMeetings();
    loadStats();
    loadRecentActivity();

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('meetingDate').value = today;

    // Auto-refresh every 30 seconds
    setInterval(() => {
        loadMeetings();
        loadStats();
        loadRecentActivity();
    }, 30000);
});

// Firebase initialization
function initializeFirebase() {
    if (typeof firebase !== 'undefined' && window.firebaseConfig) {
        firebase.initializeApp(window.firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();

        // Set up auth state listener
        auth.onAuthStateChanged(handleAuthStateChange);

        logToTerminal('Firebase initialized successfully', 'success');
    } else {
        logToTerminal('Firebase not configured. Running in demo mode.', 'warning');
        showAuthPrompt();
    }
}

// Handle authentication state changes
function handleAuthStateChange(user) {
    if (user) {
        currentUser = user;
        logToTerminal(`User signed in: ${user.email}`, 'success');
        showAuthenticatedUI();
        loadUserProfile();
        loadMeetings();
        loadStats();
        loadRecentActivity();
    } else {
        currentUser = null;
        userProfile = null;
        logToTerminal('User signed out', 'info');
        showUnauthenticatedUI();
    }
}

// Show authenticated UI
function showAuthenticatedUI() {
    document.body.classList.remove('unauthenticated');

    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');
    const userDisplayName = document.getElementById('userDisplayName');
    const userAvatar = document.getElementById('userAvatar');

    if (userInfo) {
        userInfo.style.display = 'flex';
    }
    if (userEmail) {
        userEmail.textContent = currentUser.email;
    }
    if (userDisplayName) {
        userDisplayName.textContent = currentUser.displayName || 'User';
    }
    if (userAvatar) {
        userAvatar.src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.email)}&background=0078d4&color=fff`;
    }

    // Close auth modal if open
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.classList.remove('active');
    }

    // Remove auth overlay if present
    const authOverlay = document.querySelector('.auth-overlay');
    if (authOverlay) {
        authOverlay.remove();
    }

    // Clear auth form
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.reset();
    }

    // Hide any auth errors
    const authError = document.getElementById('authError');
    if (authError) {
        authError.style.display = 'none';
    }
}

// Show unauthenticated UI
function showUnauthenticatedUI() {
    document.body.classList.add('unauthenticated');
    document.getElementById('userInfo').style.display = 'none';
    showAuthPrompt();
}

// Show authentication prompt
function showAuthPrompt() {
    if (window.demoMode.enabled) {
        return; // Don't show auth prompt in demo mode
    }

    // Remove any existing auth overlay first
    const existingOverlay = document.querySelector('.auth-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    const authOverlay = document.createElement('div');
    authOverlay.className = 'auth-overlay';
    authOverlay.id = 'authOverlay';
    authOverlay.innerHTML = `
        <div class="auth-prompt">
            <h2><i class="fas fa-lock"></i> Wymagane uwierzytelnienie</h2>
            <p>Zaloguj się, aby uzyskać dostęp do panelu automatyzacji Teams.</p>
            <button class="btn primary" onclick="openAuthModalFromOverlay()">Zaloguj się</button>
        </div>
    `;
    document.body.appendChild(authOverlay);
}

// UI initialization
function initializeUI() {
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });

    // Handle form submission
    document.getElementById('meetingForm').addEventListener('submit', function(e) {
        e.preventDefault();
        scheduleMeeting();
    });

    // Handle auth form submission
    document.getElementById('authForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleAuthSubmit();
    });

    logToTerminal('UI initialized successfully', 'success');
}

// Authentication Functions
function openAuthModal() {
    document.getElementById('authModal').classList.add('active');
}

function openAuthModalFromOverlay() {
    // Hide the auth overlay first
    const authOverlay = document.getElementById('authOverlay');
    if (authOverlay) {
        authOverlay.style.display = 'none';
    }

    // Then open the auth modal
    document.getElementById('authModal').classList.add('active');
}

function switchAuthTab(tab) {
    const signInTab = document.querySelector('.auth-tab:first-child');
    const signUpTab = document.querySelector('.auth-tab:last-child');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authModalTitle = document.getElementById('authModalTitle');

    if (tab === 'signin') {
        signInTab.classList.add('active');
        signUpTab.classList.remove('active');
        confirmPasswordGroup.style.display = 'none';
        authSubmitBtn.textContent = 'Zaloguj się';
        authModalTitle.textContent = 'Zaloguj się';
    } else {
        signUpTab.classList.add('active');
        signInTab.classList.remove('active');
        confirmPasswordGroup.style.display = 'block';
        authSubmitBtn.textContent = 'Zarejestruj się';
        authModalTitle.textContent = 'Zarejestruj się';
    }
}

async function handleAuthSubmit() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const confirmPassword = document.getElementById('authConfirmPassword').value;
    const isSignUp = document.querySelector('.auth-tab.active').textContent === 'Zarejestruj się';
    const errorDiv = document.getElementById('authError');

    try {
        errorDiv.style.display = 'none';

        if (isSignUp) {
            if (password !== confirmPassword) {
                throw new Error('Hasła nie są zgodne');
            }
            if (password.length < 6) {
                throw new Error('Hasło musi mieć co najmniej 6 znaków');
            }

            const result = await auth.createUserWithEmailAndPassword(email, password);
            logToTerminal(`User account created: ${email}`, 'success');
            showToast('Konto utworzone pomyślnie!', 'success');

            // Create user profile
            await createUserProfile(result.user);

        } else {
            await auth.signInWithEmailAndPassword(email, password);
            logToTerminal(`User signed in: ${email}`, 'success');
            showToast('Zalogowano pomyślnie!', 'success');
        }

        // Small delay to ensure authentication state change completes
        setTimeout(() => {
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.classList.remove('active');
            }

            const authOverlay = document.querySelector('.auth-overlay');
            if (authOverlay) {
                authOverlay.remove();
            }
        }, 500);

    } catch (error) {
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error.message}`;
        errorDiv.style.display = 'block';
        logToTerminal(`Authentication error: ${error.message}`, 'error');
    }
}

async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        logToTerminal(`User signed in with Google: ${result.user.email}`, 'success');
        showToast('Zalogowano przez Google!', 'success');

        // Create user profile if new user
        await createUserProfile(result.user);

        // Close modal after successful sign-in
        setTimeout(() => {
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.classList.remove('active');
            }

            const authOverlay = document.querySelector('.auth-overlay');
            if (authOverlay) {
                authOverlay.remove();
            }
        }, 500);

    } catch (error) {
        const errorDiv = document.getElementById('authError');
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error.message}`;
        errorDiv.style.display = 'block';
        logToTerminal(`Google sign-in error: ${error.message}`, 'error');
    }
}

async function signOut() {
    try {
        await auth.signOut();
        showToast('Wylogowano pomyślnie', 'info');
    } catch (error) {
        showToast('Błąd podczas wylogowywania: ' + error.message, 'error');
    }
}

// User Profile Management
async function createUserProfile(user) {
    try {
        // Ensure we have a valid auth token
        await user.getIdToken(true);

        const userProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'User',
            photoURL: user.photoURL || '',
            role: 'admin', // Set new users as admin by default
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            teamsEmail: '',
            teamsPassword: '', // Will be encrypted
            settings: {
                defaultMaxRetries: 3,
                autoJoinEnabled: true,
                notifications: true
            }
        };

        await db.collection('users').doc(user.uid).set(userProfile, { merge: true });
        logToTerminal('User profile created/updated', 'success');

    } catch (error) {
        console.error('Profile creation error:', error);
        logToTerminal(`Error creating user profile: ${error.message}`, 'error');
    }
}

async function loadUserProfile() {
    if (!currentUser) return;

    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            userProfile = doc.data();
            populateProfileForm();
        } else {
            await createUserProfile(currentUser);
        }
    } catch (error) {
        logToTerminal(`Error loading user profile: ${error.message}`, 'error');
    }
}

function populateProfileForm() {
    if (!userProfile) return;

    document.getElementById('profileEmail').value = userProfile.email || '';
    document.getElementById('profileDisplayName').value = userProfile.displayName || '';
    document.getElementById('profileTeamsEmail').value = userProfile.teamsEmail ? decrypt(userProfile.teamsEmail) : '';
    // Don't populate password field for security
}

function openProfileSettings() {
    if (!currentUser) {
        showToast('Zaloguj się, aby uzyskać dostęp do ustawień profilu', 'warning');
        openAuthModal();
        return;
    }

    document.getElementById('profileModal').classList.add('active');
    populateProfileForm();
}

async function saveProfile() {
    if (!currentUser) {
        showToast('Zaloguj się, aby zapisać profil', 'error');
        return;
    }

    try {
        const teamsEmail = document.getElementById('profileTeamsEmail').value;
        const teamsPassword = document.getElementById('profileTeamsPassword').value;
        const displayName = document.getElementById('profileDisplayName').value;

        // Ensure we have a valid auth token
        await currentUser.getIdToken(true);

        const updateData = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: displayName,
            role: 'admin', // Set user as admin
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Only update Teams credentials if they're provided
        if (teamsEmail) {
            updateData.teamsEmail = encrypt(teamsEmail);
        }
        if (teamsPassword) {
            updateData.teamsPassword = encrypt(teamsPassword);
        }

        // Use set with merge instead of update to handle new profiles
        await db.collection('users').doc(currentUser.uid).set(updateData, { merge: true });

        // Update auth profile
        if (displayName !== currentUser.displayName) {
            await currentUser.updateProfile({ displayName: displayName });
        }

        showToast('Profil zaktualizowany pomyślnie!', 'success');
        logToTerminal('User profile saved', 'success');
        closeModal('profileModal');

        // Reload profile
        await loadUserProfile();

    } catch (error) {
        console.error('Profile save error:', error);
        showToast('Błąd podczas zapisywania profilu: ' + error.message, 'error');
        logToTerminal(`Error saving profile: ${error.message}`, 'error');
    }
}

// Encryption functions for Teams credentials
function encrypt(text) {
    // Simple encryption for demo - in production use proper encryption
    return btoa(text);
}

function decrypt(encryptedText) {
    // Simple decryption for demo - in production use proper decryption
    try {
        return atob(encryptedText);
    } catch {
        return encryptedText; // Return as-is if not encrypted
    }
}

// Quick Actions
async function runLocalAutomation() {
    if (!currentUser || !userProfile) {
        showToast('Zaloguj się i skonfiguruj najpierw swój profil', 'warning');
        return;
    }

    if (!userProfile.teamsEmail || !userProfile.teamsPassword) {
        showToast('Skonfiguruj dane logowania Teams w Ustawieniach profilu', 'warning');
        openProfileSettings();
        return;
    }

    logToTerminal('🚀 Local automation requested...', 'info');
    logToTerminal('📋 Preparing user credentials for local automation...', 'info');

    // Export user credentials for local automation
    await exportUserCredentialsForLocal();

    logToTerminal('⚠️  Note: Web browsers cannot directly execute local scripts for security reasons.', 'warning');
    logToTerminal('📋 Please follow the manual instructions to run the automation.', 'info');

    updateStatus('Awaiting Manual Execution', 'warning');

    // Show instructions for manual execution
    showLocalAutomationInstructions();
}

async function exportUserCredentialsForLocal() {
    try {
        // Get pending meetings for the user
        const meetings = await getMeetingsForLocal();

        const userCredentials = {
            teamsEmail: decrypt(userProfile.teamsEmail),
            teamsPassword: decrypt(userProfile.teamsPassword),
            userDisplayName: userProfile.displayName,
            userId: currentUser.uid,
            exportedAt: new Date().toISOString(),
            meetings: meetings
        };

        // Create downloadable files
        const credentialsBlob = new Blob([JSON.stringify(userCredentials, null, 2)], { type: 'application/json' });
        const credentialsUrl = URL.createObjectURL(credentialsBlob);

        // Create PowerShell script for Windows (more trusted than .bat)
        const powershellScript = `# Teams Meeting Automation Scheduler
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "🤖 Teams Meeting Automation Scheduler" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Starting background automation..." -ForegroundColor Yellow
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Check if credentials file exists
if (-not (Test-Path "user-credentials.json")) {
    Write-Host "❌ ERROR: user-credentials.json not found!" -ForegroundColor Red
    Write-Host "Please make sure you've downloaded and placed the credentials file in this folder." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "✅ Credentials file found" -ForegroundColor Green
Write-Host "⏰ Monitoring scheduled meetings every 30 seconds" -ForegroundColor Cyan
Write-Host "🎯 Will automatically join meetings at their scheduled time" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the automation" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan

# Start the automation
try {
    node local-joiner.js schedule
} catch {
    Write-Host "Error starting automation: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Automation stopped." -ForegroundColor Yellow
Read-Host "Press Enter to exit"`;

        const psBlob = new Blob([powershellScript], { type: 'text/plain' });
        const psUrl = URL.createObjectURL(psBlob);

        // Also create a simple batch file that calls PowerShell
        const batchScript = `@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0start-automation.ps1"
pause`;

        const batchBlob = new Blob([batchScript], { type: 'text/plain' });
        const batchUrl = URL.createObjectURL(batchBlob);

        // Download credentials file
        const credentialsLink = document.createElement('a');
        credentialsLink.href = credentialsUrl;
        credentialsLink.download = 'user-credentials.json';
        credentialsLink.style.display = 'none';
        document.body.appendChild(credentialsLink);
        credentialsLink.click();
        document.body.removeChild(credentialsLink);
        URL.revokeObjectURL(credentialsUrl);

        // Download PowerShell script
        const psLink = document.createElement('a');
        psLink.href = psUrl;
        psLink.download = 'start-automation.ps1';
        psLink.style.display = 'none';
        document.body.appendChild(psLink);
        psLink.click();
        document.body.removeChild(psLink);
        URL.revokeObjectURL(psUrl);

        // Download batch script (calls PowerShell)
        const batchLink = document.createElement('a');
        batchLink.href = batchUrl;
        batchLink.download = 'start-automation.bat';
        batchLink.style.display = 'none';
        document.body.appendChild(batchLink);
        batchLink.click();
        document.body.removeChild(batchLink);
        URL.revokeObjectURL(batchUrl);

        logToTerminal('✅ User credentials and automation starter exported', 'success');
        logToTerminal('📥 Downloaded: user-credentials.json + PowerShell + batch files', 'info');
        showToast('Pliki automatyzacji gotowe! Sprawdź folder Pobrane.', 'success');

    } catch (error) {
        logToTerminal(`❌ Error exporting credentials: ${error.message}`, 'error');
        showToast('Niepowodzenie eksportu danych: ' + error.message, 'error');
    }
}

async function getMeetingsForLocal() {
    try {
        // Get all user meetings first, then filter in code to avoid complex indexing
        const snapshot = await db.collection('meetings')
            .where('userId', '==', currentUser.uid)
            .orderBy('scheduledTime')
            .limit(20)
            .get();

        // Filter for pending/retrying meetings in code
        const meetings = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
                scheduledTime: doc.data().scheduledTime?.toDate()?.toISOString()
            }))
            .filter(meeting => ['pending', 'retrying'].includes(meeting.status))
            .slice(0, 10); // Take first 10 after filtering

        return meetings;
    } catch (error) {
        logToTerminal(`⚠️  Could not load meetings: ${error.message}`, 'warning');
        return [];
    }
}

function showLocalAutomationInstructions() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-desktop"></i> Run Local Automation</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="automation-steps">
                    <h4>🤖 Automated Meeting Scheduler - Set & Forget!</h4>

                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <strong>Files Downloaded ✅</strong>
                            <p>Check your Downloads folder for:</p>
                            <ul>
                                <li><code>user-credentials.json</code> - Your credentials & meetings</li>
                                <li><code>start-automation.ps1</code> - PowerShell automation script</li>
                                <li><code>start-automation.bat</code> - Batch file (calls PowerShell)</li>
                            </ul>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <strong>Move Files to Project</strong>
                            <p>Copy both files to your <code>meeting-joiner</code> folder</p>
                            <small>📁 Location: D:\\teams\\teams-meeting-scheduler\\meeting-joiner\\</small>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <strong>Start Background Automation</strong>
                            <p><strong>Option A:</strong> Double-click <code>start-automation.bat</code></p>
                            <p><strong>Option B (if Windows blocks):</strong> Right-click <code>start-automation.ps1</code> → "Run with PowerShell"</p>
                            <p><strong>Option C (manual):</strong> Open Command Prompt and run:</p>
                            <div class="code-block">
                                <code>cd meeting-joiner</code><br>
                                <code>node local-joiner.js schedule</code>
                            </div>
                            <div class="credentials-info">
                                <p><strong>Teams Email:</strong> ${userProfile.teamsEmail ? decrypt(userProfile.teamsEmail) : 'Not configured'}</p>
                                <p><strong>Pending Meetings:</strong> <span id="meetingCount">Loading...</span></p>
                            </div>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">4</div>
                        <div class="step-content">
                            <strong>Automated Meeting Joining! 🎯</strong>
                            <p>✅ Scheduler monitors every 30 seconds<br>
                            ✅ Joins meetings automatically at scheduled time<br>
                            ✅ Opens visible browser when meeting starts<br>
                            ✅ Uses your real Teams credentials</p>
                        </div>
                    </div>
                </div>

                <div class="automation-note">
                    <i class="fas fa-robot"></i>
                    <p><strong>Background Automation:</strong> Once started, the scheduler runs continuously and automatically joins meetings at their scheduled times. Keep the command window open to maintain automation.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn secondary" onclick="this.closest('.modal').remove()">Close</button>
                <button class="btn primary" onclick="openFileExplorer()">
                    <i class="fas fa-folder-open"></i> Open Project Folder
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    logToTerminal('Local automation instructions displayed', 'info');
    updateStatus('Awaiting Manual Execution', 'info');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Commands copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy to clipboard', 'error');
    });
}

function openFileExplorer() {
    // This won't work in browsers due to security restrictions
    showToast('Please manually navigate to your project folder', 'info');
    logToTerminal('File explorer cannot be opened from browser for security reasons', 'warning');
}

async function triggerGitHubAction() {
    showToast('Triggering GitHub Action...', 'info');
    logToTerminal('Triggering GitHub Action workflow...', 'info');

    try {
        // This would typically call GitHub API
        // For demo, we'll simulate the process
        updateStatus('GitHub Action Running', 'info');

        const response = await fetch('https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/dispatches', {
            method: 'POST',
            headers: {
                'Authorization': 'token YOUR_GITHUB_TOKEN',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event_type: 'manual-trigger'
            })
        });

        if (response.ok) {
            showToast('GitHub Action triggered successfully!', 'success');
            logToTerminal('GitHub Action workflow started', 'success');
        } else {
            throw new Error('Failed to trigger GitHub Action');
        }

    } catch (error) {
        showToast('Demo mode: GitHub Action would be triggered here', 'info');
        logToTerminal('Demo mode: GitHub Action trigger simulated', 'info');
    }

    updateStatus('Gotowy', 'success');
}

function openMeetingScheduler() {
    document.getElementById('scheduleMeetingModal').classList.add('active');
    logToTerminal('Meeting scheduler opened', 'info');
}

function viewLogs() {
    document.getElementById('logsModal').classList.add('active');
    loadLogs();
    logToTerminal('Logs viewer opened', 'info');
}

// Meeting Management
async function loadMeetings() {
    const container = document.getElementById('meetingsContainer');

    if (!db || !currentUser) {
        // Demo mode or not authenticated - show sample meetings
        const demoMeetings = [
            {
                id: 'demo-1',
                meetingLink: 'https://teams.microsoft.com/l/meetup-join/...',
                scheduledTime: new Date(Date.now() + 60000), // 1 minute from now
                status: 'pending',
                teamsEmail: 'user@example.com',
                retryCount: 0,
                maxRetries: 3
            },
            {
                id: 'demo-2',
                meetingLink: 'https://teams.microsoft.com/l/meetup-join/...',
                scheduledTime: new Date(Date.now() - 300000), // 5 minutes ago
                status: 'joined',
                teamsEmail: 'user@example.com',
                retryCount: 1,
                maxRetries: 3
            }
        ];

        displayMeetings(demoMeetings);
        return;
    }

    try {
        // Ensure we have a valid auth token
        const token = await currentUser.getIdToken(true);
        console.log('Auth token obtained for meetings query');
        console.log('User UID:', currentUser.uid);

        // Query only meetings for the current user (simplified query)
        const snapshot = await db.collection('meetings')
            .where('userId', '==', currentUser.uid)
            .limit(10)
            .get();

        meetings = [];
        snapshot.forEach(doc => {
            meetings.push({ id: doc.id, ...doc.data() });
        });

        displayMeetings(meetings);
        logToTerminal(`Loaded ${meetings.length} meetings for user ${currentUser.email}`, 'info');

    } catch (error) {
        console.error('Error loading meetings:', error);
        logToTerminal('Error loading meetings: ' + error.message, 'error');
        showToast('Failed to load meetings: ' + error.message, 'error');

        // Show empty state if no meetings can be loaded
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Nie można załadować spotkań. Sprawdź uprawnienia.</span>
            </div>
        `;
    }
}

function displayMeetings(meetingsList) {
    const container = document.getElementById('meetingsContainer');

    if (meetingsList.length === 0) {
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-calendar"></i>
                <span>Brak zaplanowanych spotkań</span>
            </div>
        `;
        return;
    }

    container.innerHTML = meetingsList.map(meeting => {
        const scheduledTime = meeting.scheduledTime?.toDate ?
            meeting.scheduledTime.toDate() :
            new Date(meeting.scheduledTime);

        return `
            <div class="meeting-card">
                <div class="meeting-info">
                    <h3>Spotkanie Teams</h3>
                    <p><i class="fas fa-clock"></i> ${scheduledTime.toLocaleString()}</p>
                    <p><i class="fas fa-user"></i> ${meeting.teamsEmail || 'Unknown'}</p>
                    <p><i class="fas fa-redo"></i> Próba ${meeting.retryCount || 0}/${meeting.maxRetries || 3}</p>
                </div>
                <div class="meeting-actions">
                    <span class="meeting-status status-${meeting.status}">${meeting.status}</span>
                    <button class="btn-icon" onclick="deleteMeeting('${meeting.id}')" title="Usuń spotkanie">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function scheduleMeeting() {
    if (!currentUser) {
        showToast('Zaloguj się, aby planować spotkania', 'warning');
        openAuthModal();
        return;
    }

    if (!userProfile || !userProfile.teamsEmail || !userProfile.teamsPassword) {
        showToast('Najpierw skonfiguruj dane logowania Teams w Ustawieniach profilu', 'warning');
        openProfileSettings();
        return;
    }

    const form = document.getElementById('meetingForm');

    const meetingData = {
        meetingLink: document.getElementById('meetingLink').value,
        teamsEmail: userProfile.teamsEmail, // Use encrypted credentials from profile
        teamsPassword: userProfile.teamsPassword, // Use encrypted credentials from profile
        scheduledTime: new Date(`${document.getElementById('meetingDate').value}T${document.getElementById('meetingTime').value}`),
        maxRetries: parseInt(document.getElementById('maxRetries').value),
        status: 'pending',
        retryCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        userId: currentUser.uid
    };

    if (!db) {
        // Demo mode
        showToast('Demo mode: Meeting would be scheduled in Firebase', 'info');
        logToTerminal('Demo meeting scheduled: ' + meetingData.meetingLink, 'info');
        closeModal('scheduleMeetingModal');
        form.reset();
        return;
    }

    try {
        // Data is already encrypted from user profile
        await db.collection('meetings').add(meetingData);

        showToast('Spotkanie zaplanowane pomyślnie!', 'success');
        logToTerminal('New meeting scheduled for ' + meetingData.scheduledTime.toLocaleString(), 'success');

        closeModal('scheduleMeetingModal');
        form.reset();
        loadMeetings();
        loadStats();

    } catch (error) {
        showToast('Nie udało się zaplanować spotkania: ' + error.message, 'error');
        logToTerminal('Error scheduling meeting: ' + error.message, 'error');
    }
}

async function deleteMeeting(meetingId) {
    if (!confirm('Czy na pewno chcesz usunąć to spotkanie?')) {
        return;
    }

    if (!db) {
        showToast('Demo mode: Meeting would be deleted from Firebase', 'info');
        return;
    }

    try {
        await db.collection('meetings').doc(meetingId).delete();
        showToast('Spotkanie usunięte pomyślnie', 'success');
        logToTerminal('Meeting deleted: ' + meetingId, 'info');
        loadMeetings();
        loadStats();
    } catch (error) {
        showToast('Nie udało się usunąć spotkania: ' + error.message, 'error');
        logToTerminal('Error deleting meeting: ' + error.message, 'error');
    }
}

// Statistics
async function loadStats() {
    if (!db || !currentUser) {
        // Demo mode or not authenticated
        document.getElementById('successCount').textContent = '5';
        document.getElementById('pendingCount').textContent = '2';
        document.getElementById('failedCount').textContent = '1';
        document.getElementById('todayCount').textContent = '3';
        return;
    }

    try {
        // Ensure we have a valid auth token
        await currentUser.getIdToken(true);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get all meetings for the current user (simplified to avoid index requirements)
        const allMeetings = await db.collection('meetings')
            .where('userId', '==', currentUser.uid)
            .get();

        // Count today's meetings in memory instead of with Firestore query
        let todayCount = 0;
        allMeetings.forEach(doc => {
            const data = doc.data();
            if (data.scheduledTime) {
                const meetingDate = data.scheduledTime.toDate ? data.scheduledTime.toDate() : new Date(data.scheduledTime);
                if (meetingDate >= today && meetingDate < tomorrow) {
                    todayCount++;
                }
            }
        });

        let successCount = 0;
        let pendingCount = 0;
        let failedCount = 0;

        allMeetings.forEach(doc => {
            const status = doc.data().status;
            switch(status) {
                case 'joined': successCount++; break;
                case 'pending':
                case 'retrying': pendingCount++; break;
                case 'failed': failedCount++; break;
            }
        });

        document.getElementById('successCount').textContent = successCount;
        document.getElementById('pendingCount').textContent = pendingCount;
        document.getElementById('failedCount').textContent = failedCount;
        document.getElementById('todayCount').textContent = todayCount;

    } catch (error) {
        console.error('Error loading stats:', error);
        logToTerminal('Error loading stats: ' + error.message, 'error');

        // Set default values on error
        document.getElementById('successCount').textContent = '0';
        document.getElementById('pendingCount').textContent = '0';
        document.getElementById('failedCount').textContent = '0';
        document.getElementById('todayCount').textContent = '0';
    }
}

// Activity Feed
async function loadRecentActivity() {
    const container = document.getElementById('activityFeed');

    if (!db || !currentUser) {
        // Demo mode or not authenticated
        const demoActivity = [
            {
                id: '1',
                action: 'joined',
                details: 'Successfully joined Teams meeting',
                timestamp: new Date(Date.now() - 300000),
                meetingId: 'demo-1'
            },
            {
                id: '2',
                action: 'scheduled',
                details: 'New meeting scheduled',
                timestamp: new Date(Date.now() - 600000),
                meetingId: 'demo-2'
            },
            {
                id: '3',
                action: 'failed',
                details: 'Failed to join meeting (retry 1/3)',
                timestamp: new Date(Date.now() - 900000),
                meetingId: 'demo-3'
            }
        ];

        displayActivity(demoActivity);
        return;
    }

    try {
        // Ensure we have a valid auth token
        await currentUser.getIdToken(true);

        // Query only meeting logs for the current user (simplified query)
        const snapshot = await db.collection('meetingLogs')
            .where('userId', '==', currentUser.uid)
            .limit(10)
            .get();

        const activities = [];
        snapshot.forEach(doc => {
            activities.push({ id: doc.id, ...doc.data() });
        });

        displayActivity(activities);

    } catch (error) {
        console.error('Error loading activity:', error);
        logToTerminal('Error loading activity: ' + error.message, 'error');

        // Show empty state on error
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-history"></i>
                <span>Brak ostatniej aktywności</span>
            </div>
        `;
    }
}

function displayActivity(activities) {
    const container = document.getElementById('activityFeed');

    if (activities.length === 0) {
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-history"></i>
                <span>Brak ostatniej aktywności</span>
            </div>
        `;
        return;
    }

    container.innerHTML = activities.map(activity => {
        const timestamp = activity.timestamp?.toDate ?
            activity.timestamp.toDate() :
            new Date(activity.timestamp);

        const iconMap = {
            'joined': 'fas fa-check-circle',
            'failed': 'fas fa-exclamation-circle',
            'scheduled': 'fas fa-calendar-plus',
            'retry': 'fas fa-redo'
        };

        const colorMap = {
            'joined': 'var(--success-color)',
            'failed': 'var(--danger-color)',
            'scheduled': 'var(--info-color)',
            'retry': 'var(--warning-color)'
        };

        return `
            <div class="activity-item">
                <div class="activity-icon" style="background: ${colorMap[activity.action] || 'var(--secondary-color)'}">
                    <i class="${iconMap[activity.action] || 'fas fa-circle'}"></i>
                </div>
                <div class="activity-content">
                    <h4>${activity.details || 'Unknown action'}</h4>
                    <p>Meeting ID: ${activity.meetingId || 'Unknown'}</p>
                </div>
                <div class="activity-time">
                    ${timeAgo(timestamp)}
                </div>
            </div>
        `;
    }).join('');
}

// Logs
async function loadLogs() {
    const container = document.getElementById('logsContainer');
    container.innerHTML = '<div class="log-loading"><i class="fas fa-spinner fa-spin"></i><span>Ładowanie logów...</span></div>';

    // Simulate loading logs (in real app, this would fetch from server/GitHub)
    setTimeout(() => {
        const demoLogs = [
            '[2024-01-15 10:30:00] === Starting Teams meeting join for meeting demo-1 ===',
            '[2024-01-15 10:30:01] Launching browser for meeting demo-1',
            '[2024-01-15 10:30:02] Navigating to meeting link',
            '[2024-01-15 10:30:05] Signing in with credentials',
            '[2024-01-15 10:30:08] Successfully clicked join button',
            '[2024-01-15 10:30:10] === Successfully joined meeting demo-1 ===',
            '[2024-01-15 10:25:00] Processing meeting demo-2 for user demo-user',
            '[2024-01-15 10:25:01] Meeting failed: Could not find join button',
            '[2024-01-15 10:20:00] GitHub Action workflow triggered',
            '[2024-01-15 10:20:01] Installing dependencies...',
            '[2024-01-15 10:20:30] Dependencies installed successfully'
        ];

        container.innerHTML = `
            <div style="background: #1e1e1e; color: #fff; padding: 20px; border-radius: 8px; font-family: 'Consolas', monospace; font-size: 0.9rem; max-height: 400px; overflow-y: auto;">
                ${demoLogs.map(log => `<div style="margin-bottom: 5px;">${log}</div>`).join('')}
            </div>
        `;
    }, 1000);
}

// Utility Functions
function refreshMeetings() {
    logToTerminal('Refreshing meetings...', 'info');
    loadMeetings();
    loadStats();
    loadRecentActivity();
    showToast('Dane odświeżone', 'success');
}

function updateStatus(status, type) {
    const badge = document.getElementById('statusBadge');
    const colorMap = {
        'success': 'var(--success-color)',
        'warning': 'var(--warning-color)',
        'error': 'var(--danger-color)',
        'info': 'var(--info-color)'
    };

    badge.innerHTML = `<i class="fas fa-circle"></i><span>${status}</span>`;
    badge.style.background = colorMap[type] || 'var(--secondary-color)';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    };

    toast.innerHTML = `
        <i class="${iconMap[type]}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function logToTerminal(message, type = 'info') {
    const terminal = document.getElementById('terminalBody');
    const line = document.createElement('div');
    line.className = 'terminal-line';

    const timestamp = new Date().toLocaleTimeString();
    line.innerHTML = `
        <span class="prompt">[${timestamp}]</span>
        <span class="${type}">${message}</span>
    `;

    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

function toggleTerminal() {
    const terminal = document.getElementById('terminal');
    terminal.classList.toggle('active');
}

function clearTerminal() {
    const terminal = document.getElementById('terminalBody');
    terminal.innerHTML = `
        <div class="terminal-line">
            <span class="prompt">teams-automation$</span>
            <span class="output">Terminal cleared...</span>
        </div>
    `;
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function timeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} dni temu`;
    if (hours > 0) return `${hours} godz temu`;
    if (minutes > 0) return `${minutes} min temu`;
    return 'Właśnie teraz';
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // ESC to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // Ctrl+` to toggle terminal
    if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        toggleTerminal();
    }
});

// Initialize status
updateStatus('Gotowy', 'success');

// Test function to verify authentication and permissions
async function testFirebaseConnection() {
    if (!currentUser || !db) {
        console.log('❌ User not authenticated or Firebase not initialized');
        return false;
    }

    try {
        console.log('🔍 Testing Firebase connection...');
        console.log('User ID:', currentUser.uid);
        console.log('User Email:', currentUser.email);

        // Test reading user profile
        const profileDoc = await db.collection('userProfiles').doc(currentUser.uid).get();
        console.log('✅ Profile read test:', profileDoc.exists ? 'SUCCESS' : 'NO PROFILE');

        // Test writing to user profile
        await db.collection('userProfiles').doc(currentUser.uid).set({
            lastTestAccess: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('✅ Profile write test: SUCCESS');

        // Test reading meetings collection
        const meetingsQuery = await db.collection('meetings')
            .where('userId', '==', currentUser.uid)
            .limit(1)
            .get();
        console.log('✅ Meetings read test: SUCCESS');

        return true;
    } catch (error) {
        console.error('❌ Firebase test failed:', error);
        return false;
    }
}

// Add to window for manual testing
window.testFirebaseConnection = testFirebaseConnection;