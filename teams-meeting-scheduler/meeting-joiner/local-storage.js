const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Local Storage Manager for Teams Automation
 * Provides Firebase-compatible API using local JSON files
 */
class LocalStorageManager {
    constructor() {
        this.dataDir = path.join(__dirname, 'data');
        this.meetingsFile = path.join(this.dataDir, 'meetings.json');
        this.usersFile = path.join(this.dataDir, 'users.json');
        this.logsFile = path.join(this.dataDir, 'logs.json');
        this.configFile = path.join(this.dataDir, 'config.json');

        this.ensureDataDirectory();
        this.ensureDataFiles();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
            console.log('📁 Created local data directory:', this.dataDir);
        }
    }

    ensureDataFiles() {
        const defaultFiles = {
            [this.meetingsFile]: [],
            [this.usersFile]: {},
            [this.logsFile]: [],
            [this.configFile]: {
                currentUser: null,
                encryptionKey: this.generateEncryptionKey(),
                createdAt: new Date().toISOString()
            }
        };

        Object.entries(defaultFiles).forEach(([filePath, defaultContent]) => {
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
                console.log('📄 Created:', path.basename(filePath));
            }
        });
    }

    generateEncryptionKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    readJsonFile(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading ${filePath}:`, error.message);
            return null;
        }
    }

    writeJsonFile(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Error writing ${filePath}:`, error.message);
            return false;
        }
    }

    // ===========================
    // USER MANAGEMENT
    // ===========================

    async createUser(userData) {
        const users = this.readJsonFile(this.usersFile);
        const userId = this.generateUserId();

        const user = {
            uid: userId,
            email: userData.email,
            displayName: userData.displayName || 'Local User',
            createdAt: new Date().toISOString(),
            teamsEmail: userData.teamsEmail || '',
            teamsPassword: userData.teamsPassword ? this.encrypt(userData.teamsPassword) : '',
            settings: {
                defaultMaxRetries: 3,
                autoJoinEnabled: true,
                notifications: true
            }
        };

        users[userId] = user;
        this.writeJsonFile(this.usersFile, users);

        // Set as current user
        const config = this.readJsonFile(this.configFile);
        config.currentUser = userId;
        this.writeJsonFile(this.configFile, config);

        console.log('👤 User created locally:', userData.email);
        return { uid: userId, ...user };
    }

    async getCurrentUser() {
        const config = this.readJsonFile(this.configFile);
        if (!config.currentUser) return null;

        const users = this.readJsonFile(this.usersFile);
        return users[config.currentUser] || null;
    }

    async updateUser(userId, updateData) {
        const users = this.readJsonFile(this.usersFile);
        if (!users[userId]) {
            throw new Error('User not found');
        }

        // Encrypt password if provided
        if (updateData.teamsPassword) {
            updateData.teamsPassword = this.encrypt(updateData.teamsPassword);
        }
        if (updateData.teamsEmail) {
            updateData.teamsEmail = this.encrypt(updateData.teamsEmail);
        }

        users[userId] = { ...users[userId], ...updateData, updatedAt: new Date().toISOString() };
        this.writeJsonFile(this.usersFile, users);

        console.log('👤 User updated locally:', userId);
        return users[userId];
    }

    generateUserId() {
        return 'local_' + crypto.randomBytes(8).toString('hex');
    }

    // ===========================
    // MEETING MANAGEMENT
    // ===========================

    async addMeeting(meetingData) {
        const meetings = this.readJsonFile(this.meetingsFile);
        const meetingId = this.generateMeetingId();

        const meeting = {
            id: meetingId,
            ...meetingData,
            createdAt: new Date().toISOString(),
            status: 'pending',
            retryCount: 0
        };

        meetings.push(meeting);
        this.writeJsonFile(this.meetingsFile, meetings);

        console.log('📅 Meeting added locally:', meetingId);
        return meeting;
    }

    async getMeetings(userId = null) {
        const meetings = this.readJsonFile(this.meetingsFile);

        if (userId) {
            return meetings.filter(meeting => meeting.userId === userId);
        }

        return meetings;
    }

    async updateMeeting(meetingId, updateData) {
        const meetings = this.readJsonFile(this.meetingsFile);
        const meetingIndex = meetings.findIndex(m => m.id === meetingId);

        if (meetingIndex === -1) {
            throw new Error('Meeting not found');
        }

        meetings[meetingIndex] = {
            ...meetings[meetingIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        this.writeJsonFile(this.meetingsFile, meetings);

        console.log('📅 Meeting updated locally:', meetingId);
        return meetings[meetingIndex];
    }

    async deleteMeeting(meetingId) {
        const meetings = this.readJsonFile(this.meetingsFile);
        const filteredMeetings = meetings.filter(m => m.id !== meetingId);

        if (meetings.length === filteredMeetings.length) {
            throw new Error('Meeting not found');
        }

        this.writeJsonFile(this.meetingsFile, filteredMeetings);
        console.log('🗑️ Meeting deleted locally:', meetingId);
        return true;
    }

    async getPendingMeetings() {
        const meetings = this.readJsonFile(this.meetingsFile);
        return meetings.filter(meeting =>
            meeting.status === 'pending' || meeting.status === 'retrying'
        );
    }

    generateMeetingId() {
        return 'meeting_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    }

    // ===========================
    // LOGGING
    // ===========================

    async addLog(logData) {
        const logs = this.readJsonFile(this.logsFile);

        const log = {
            id: this.generateLogId(),
            ...logData,
            timestamp: new Date().toISOString()
        };

        logs.push(log);

        // Keep only last 1000 logs to prevent file from growing too large
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }

        this.writeJsonFile(this.logsFile, logs);
        return log;
    }

    async getLogs(limit = 50) {
        const logs = this.readJsonFile(this.logsFile);
        return logs.slice(-limit).reverse(); // Get latest logs first
    }

    generateLogId() {
        return 'log_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    }

    // ===========================
    // ENCRYPTION/DECRYPTION
    // ===========================

    encrypt(text) {
        const config = this.readJsonFile(this.configFile);
        const key = config.encryptionKey;

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-cbc', key);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    }

    decrypt(encryptedText) {
        const config = this.readJsonFile(this.configFile);
        const key = config.encryptionKey;

        const textParts = encryptedText.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encrypted = textParts.join(':');

        const decipher = crypto.createDecipher('aes-256-cbc', key);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    // ===========================
    // STATISTICS
    // ===========================

    async getStats(userId = null) {
        const meetings = await this.getMeetings(userId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const stats = {
            total: meetings.length,
            pending: meetings.filter(m => m.status === 'pending' || m.status === 'retrying').length,
            completed: meetings.filter(m => m.status === 'joined').length,
            failed: meetings.filter(m => m.status === 'failed').length,
            today: meetings.filter(m => {
                const meetingDate = new Date(m.scheduledTime);
                return meetingDate >= today && meetingDate < tomorrow;
            }).length
        };

        return stats;
    }

    // ===========================
    // EXPORT/IMPORT
    // ===========================

    exportData() {
        const data = {
            meetings: this.readJsonFile(this.meetingsFile),
            users: this.readJsonFile(this.usersFile),
            logs: this.readJsonFile(this.logsFile),
            config: this.readJsonFile(this.configFile),
            exportedAt: new Date().toISOString()
        };

        const exportFile = path.join(this.dataDir, `backup_${Date.now()}.json`);
        this.writeJsonFile(exportFile, data);

        console.log('💾 Data exported to:', exportFile);
        return exportFile;
    }

    importData(importFile) {
        try {
            const importedData = this.readJsonFile(importFile);

            if (importedData.meetings) {
                this.writeJsonFile(this.meetingsFile, importedData.meetings);
            }
            if (importedData.users) {
                this.writeJsonFile(this.usersFile, importedData.users);
            }
            if (importedData.logs) {
                this.writeJsonFile(this.logsFile, importedData.logs);
            }

            console.log('📥 Data imported from:', importFile);
            return true;
        } catch (error) {
            console.error('Import failed:', error.message);
            return false;
        }
    }
}

module.exports = LocalStorageManager;