// Local version script - No Firebase required!
// All data is stored in localStorage

// Global variables
let meetings = [];
let localSettings = {};
let currentMeeting = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeLocal();
    loadLocalSettings();
    loadLocalMeetings();
    loadLocalStats();
    updateUI();

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    const meetingDateInput = document.getElementById('meetingDate');
    if (meetingDateInput) {
        meetingDateInput.value = today;
    }

    // Auto-refresh every 30 seconds
    setInterval(() => {
        loadLocalMeetings();
        loadLocalStats();
    }, 30000);

    logToTerminal('🚀 Local version initialized - No Firebase required!', 'success');
});

// Initialize local storage
function initializeLocal() {
    // Initialize localStorage if not exists
    if (!localStorage.getItem('teamsAutoLocal_settings')) {
        localStorage.setItem('teamsAutoLocal_settings', JSON.stringify({}));
    }
    if (!localStorage.getItem('teamsAutoLocal_meetings')) {
        localStorage.setItem('teamsAutoLocal_meetings', JSON.stringify([]));
    }
    if (!localStorage.getItem('teamsAutoLocal_logs')) {
        localStorage.setItem('teamsAutoLocal_logs', JSON.stringify([]));
    }
}

// Load local settings
function loadLocalSettings() {
    try {
        const stored = localStorage.getItem('teamsAutoLocal_settings');
        localSettings = stored ? JSON.parse(stored) : {};

        // Update form fields if settings exist
        if (localSettings.displayName) {
            const displayNameInput = document.getElementById('localDisplayName');
            if (displayNameInput) displayNameInput.value = localSettings.displayName;
        }
        if (localSettings.teamsEmail) {
            const teamsEmailInput = document.getElementById('localTeamsEmail');
            if (teamsEmailInput) teamsEmailInput.value = localSettings.teamsEmail;
        }
        if (localSettings.googleApiKey) {
            const apiKeyInput = document.getElementById('localGoogleApiKey');
            if (apiKeyInput) apiKeyInput.value = localSettings.googleApiKey;
        }

        logToTerminal('✅ Local settings loaded', 'success');
    } catch (error) {
        logToTerminal('❌ Error loading local settings: ' + error.message, 'error');
    }
}

// Save local settings
function saveLocalSettings() {
    try {
        const displayName = document.getElementById('localDisplayName').value;
        const teamsEmail = document.getElementById('localTeamsEmail').value;
        const teamsPassword = document.getElementById('localTeamsPassword').value;
        const googleApiKey = document.getElementById('localGoogleApiKey').value;

        if (!displayName || !teamsEmail || !teamsPassword) {
            showToast('Wypełnij wszystkie wymagane pola', 'error');
            return;
        }

        // Simple encryption (in production use proper encryption)
        const encryptedPassword = btoa(teamsPassword);

        localSettings = {
            displayName: displayName,
            teamsEmail: teamsEmail,
            teamsPassword: encryptedPassword,
            googleApiKey: googleApiKey,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem('teamsAutoLocal_settings', JSON.stringify(localSettings));

        showToast('Dane zapisane pomyślnie!', 'success');
        logToTerminal('✅ Local settings saved', 'success');
        closeModal('simpleSettingsModal');
        updateUI();

        // Clear password field for security
        document.getElementById('localTeamsPassword').value = '';

    } catch (error) {
        showToast('Błąd podczas zapisywania: ' + error.message, 'error');
        logToTerminal('❌ Error saving local settings: ' + error.message, 'error');
    }
}

// Load local meetings
function loadLocalMeetings() {
    try {
        const stored = localStorage.getItem('teamsAutoLocal_meetings');
        meetings = stored ? JSON.parse(stored) : [];
        updateMeetingsUI();
        logToTerminal(`📅 Loaded ${meetings.length} meetings from local storage`, 'info');
    } catch (error) {
        logToTerminal('❌ Error loading meetings: ' + error.message, 'error');
    }
}

// Save meeting to local storage
function saveLocalMeeting(meeting) {
    try {
        meetings.push(meeting);
        localStorage.setItem('teamsAutoLocal_meetings', JSON.stringify(meetings));
        updateMeetingsUI();
        loadLocalStats();
        logToTerminal(`✅ Meeting saved: ${meeting.title || meeting.meetingLink}`, 'success');
    } catch (error) {
        logToTerminal('❌ Error saving meeting: ' + error.message, 'error');
    }
}

// Delete meeting from local storage
function deleteLocalMeeting(meetingId) {
    try {
        meetings = meetings.filter(m => m.id !== meetingId);
        localStorage.setItem('teamsAutoLocal_meetings', JSON.stringify(meetings));
        updateMeetingsUI();
        loadLocalStats();
        showToast('Spotkanie usunięte', 'success');
        logToTerminal(`🗑️ Meeting deleted: ${meetingId}`, 'info');
    } catch (error) {
        logToTerminal('❌ Error deleting meeting: ' + error.message, 'error');
    }
}

// Load local stats
function loadLocalStats() {
    try {
        const now = new Date();
        const today = now.toDateString();

        const pendingCount = meetings.filter(m => m.status === 'pending').length;
        const completedCount = meetings.filter(m => m.status === 'completed').length;
        const failedCount = meetings.filter(m => m.status === 'failed').length;
        const todayCount = meetings.filter(m => {
            const meetingDate = new Date(m.scheduledTime);
            return meetingDate.toDateString() === today;
        }).length;

        // Update UI
        updateStatCard('pendingCount', pendingCount);
        updateStatCard('successCount', completedCount);
        updateStatCard('failedCount', failedCount);
        updateStatCard('todayCount', todayCount);

    } catch (error) {
        logToTerminal('❌ Error loading stats: ' + error.message, 'error');
    }
}

// Update stat card
function updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// Update meetings UI
function updateMeetingsUI() {
    const container = document.getElementById('meetingsContainer');
    if (!container) return;

    if (meetings.length === 0) {
        container.innerHTML = `
            <div class="no-meetings">
                <i class="fas fa-calendar-plus"></i>
                <h3>Brak zaplanowanych spotkań</h3>
                <p>Kliknij "Zaplanuj spotkanie" aby dodać nowe spotkanie</p>
                <button class="btn primary" onclick="openMeetingScheduler()">
                    <i class="fas fa-plus"></i>
                    Dodaj pierwsze spotkanie
                </button>
            </div>
        `;
        return;
    }

    const meetingsHtml = meetings.map(meeting => `
        <div class="meeting-card ${meeting.status}" data-meeting-id="${meeting.id}">
            <div class="meeting-header">
                <div class="meeting-info">
                    <h4>${meeting.title || 'Spotkanie Teams'}</h4>
                    <span class="meeting-time">
                        <i class="fas fa-clock"></i>
                        ${formatDateTime(meeting.scheduledTime)}
                    </span>
                </div>
                <div class="meeting-status ${meeting.status}">
                    <i class="fas ${getStatusIcon(meeting.status)}"></i>
                    <span>${getStatusText(meeting.status)}</span>
                </div>
            </div>
            <div class="meeting-details">
                <div class="meeting-link">
                    <i class="fas fa-link"></i>
                    <span>${meeting.meetingLink.substring(0, 50)}...</span>
                </div>
                <div class="meeting-actions">
                    <button class="btn-small secondary" onclick="editMeeting('${meeting.id}')">
                        <i class="fas fa-edit"></i>
                        Edytuj
                    </button>
                    <button class="btn-small danger" onclick="deleteLocalMeeting('${meeting.id}')">
                        <i class="fas fa-trash"></i>
                        Usuń
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = meetingsHtml;
}

// Helper functions
function formatDateTime(dateTime) {
    const date = new Date(dateTime);
    return date.toLocaleString('pl-PL');
}

function getStatusIcon(status) {
    switch (status) {
        case 'pending': return 'fa-clock';
        case 'completed': return 'fa-check-circle';
        case 'failed': return 'fa-exclamation-triangle';
        case 'in-progress': return 'fa-spinner fa-spin';
        default: return 'fa-question-circle';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return 'Oczekujące';
        case 'completed': return 'Zakończone';
        case 'failed': return 'Nieudane';
        case 'in-progress': return 'W trakcie';
        default: return 'Nieznany';
    }
}

// Schedule new meeting
function scheduleMeeting() {
    try {
        const meetingLink = document.getElementById('meetingLink').value;
        const meetingDate = document.getElementById('meetingDate').value;
        const meetingTime = document.getElementById('meetingTime').value;
        const maxRetries = document.getElementById('maxRetries').value;
        const autoJoin = document.getElementById('autoJoin').value === 'true';

        if (!meetingLink || !meetingDate || !meetingTime) {
            showToast('Wypełnij wszystkie wymagane pola', 'error');
            return;
        }

        const scheduledTime = new Date(`${meetingDate}T${meetingTime}`);
        const now = new Date();

        if (scheduledTime <= now) {
            showToast('Data i czas spotkania musi być w przyszłości', 'error');
            return;
        }

        const meeting = {
            id: 'meeting_' + Date.now(),
            meetingLink: meetingLink,
            scheduledTime: scheduledTime.toISOString(),
            maxRetries: parseInt(maxRetries),
            autoJoin: autoJoin,
            status: 'pending',
            createdAt: new Date().toISOString(),
            title: `Spotkanie ${scheduledTime.toLocaleDateString('pl-PL')}`
        };

        saveLocalMeeting(meeting);
        closeModal('scheduleMeetingModal');
        clearMeetingForm();
        showToast('Spotkanie zaplanowane pomyślnie!', 'success');

    } catch (error) {
        showToast('Błąd podczas planowania spotkania: ' + error.message, 'error');
        logToTerminal('❌ Error scheduling meeting: ' + error.message, 'error');
    }
}

// Download configuration file
function downloadConfigFile() {
    try {
        if (!localSettings.teamsEmail || !localSettings.teamsPassword) {
            showToast('Najpierw skonfiguruj dane logowania Teams', 'warning');
            openSimpleSettings();
            return;
        }

        if (meetings.length === 0) {
            showToast('Dodaj przynajmniej jedno spotkanie przed pobraniem konfiguracji', 'warning');
            openMeetingScheduler();
            return;
        }

        const configData = {
            userSettings: {
                displayName: localSettings.displayName,
                teamsEmail: localSettings.teamsEmail,
                teamsPassword: localSettings.teamsPassword, // Already encrypted
                googleApiKey: localSettings.googleApiKey || '',
                exportedAt: new Date().toISOString(),
                version: 'local'
            },
            meetings: meetings.filter(m => m.status === 'pending'),
            metadata: {
                totalMeetings: meetings.length,
                pendingMeetings: meetings.filter(m => m.status === 'pending').length,
                exportSource: 'local-web-dashboard',
                instructions: 'Skopiuj ten plik do folderu meeting-joiner i uruchom: node local-joiner.js schedule'
            }
        };

        // Create downloadable file
        const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'user-credentials.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Plik konfiguracyjny pobrany pomyślnie!', 'success');
        logToTerminal('📄 Configuration file downloaded', 'success');

        // Show next steps
        showConfigDownloadedInfo();

    } catch (error) {
        showToast('Błąd podczas pobierania pliku: ' + error.message, 'error');
        logToTerminal('❌ Error downloading config: ' + error.message, 'error');
    }
}

// Show info after config download
function showConfigDownloadedInfo() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-check-circle text-success"></i> Plik pobrany pomyślnie!</h3>
            </div>
            <div class="modal-body">
                <div class="next-steps">
                    <h4>Co teraz?</h4>
                    <ol>
                        <li><strong>Znajdź plik:</strong> Plik "user-credentials.json" został pobrany do folderu Pobrane</li>
                        <li><strong>Skopiuj plik:</strong> Przenieś go do folderu "meeting-joiner" w projekcie</li>
                        <li><strong>Uruchom automatyzację:</strong> Otwórz terminal w folderze meeting-joiner</li>
                        <li><strong>Wpisz komendę:</strong> <code>node local-joiner.js schedule</code></li>
                    </ol>
                    <div class="help-box">
                        <p><strong>Potrzebujesz pomocy z terminalem?</strong></p>
                        <button class="btn secondary" onclick="openModal('instructionsModal'); closeModal()">
                            <i class="fas fa-question-circle"></i>
                            Zobacz szczegółową instrukcję
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn primary" onclick="closeModal()">Rozumiem</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Auto-close modal function
    modal.querySelector('.btn.primary').addEventListener('click', () => {
        modal.remove();
    });
}

// Update UI based on settings
function updateUI() {
    const hasSettings = localSettings.teamsEmail && localSettings.teamsPassword;

    // Update status
    if (hasSettings) {
        updateStatus('Gotowy', 'success');
    } else {
        updateStatus('Wymagana konfiguracja', 'warning');
    }
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    } else {
        // Close all modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
}

function openSimpleSettings() {
    openModal('simpleSettingsModal');
}

function openMeetingScheduler() {
    openModal('scheduleMeetingModal');
}

function clearMeetingForm() {
    document.getElementById('meetingLink').value = '';
    document.getElementById('meetingTime').value = '';
    document.getElementById('maxRetries').value = '3';
    document.getElementById('autoJoin').value = 'true';
}

// Status update
function updateStatus(text, type) {
    const statusBadge = document.getElementById('statusBadge');
    if (statusBadge) {
        statusBadge.className = `status-badge ${type}`;
        statusBadge.querySelector('span').textContent = text;
    }
}

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-triangle';
        case 'warning': return 'fa-exclamation-circle';
        default: return 'fa-info-circle';
    }
}

// Terminal logging
function logToTerminal(message, type = 'info') {
    const terminal = document.getElementById('terminalBody');
    if (!terminal) return;

    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = `
        <span class="prompt">local$</span>
        <span class="output ${type}">${message}</span>
        <span class="timestamp">[${new Date().toLocaleTimeString('pl-PL')}]</span>
    `;

    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;

    // Keep only last 50 lines
    const lines = terminal.querySelectorAll('.terminal-line');
    if (lines.length > 50) {
        lines[0].remove();
    }
}

function clearTerminal() {
    const terminal = document.getElementById('terminalBody');
    if (terminal) {
        terminal.innerHTML = `
            <div class="terminal-line">
                <span class="prompt">local$</span>
                <span class="output">Terminal cleared</span>
            </div>
        `;
    }
}

function toggleTerminal() {
    const terminal = document.getElementById('terminal');
    if (terminal) {
        terminal.classList.toggle('active');
    }
}

// Refresh functions
function refreshMeetings() {
    loadLocalMeetings();
    loadLocalStats();
    showToast('Lista spotkań odświeżona', 'success');
}

// Initialize forms when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Add form submit handlers
    const settingsForm = document.getElementById('localSettingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveLocalSettings();
        });
    }

    const meetingForm = document.getElementById('meetingForm');
    if (meetingForm) {
        meetingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            scheduleMeeting();
        });
    }
});