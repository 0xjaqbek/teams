const LocalStorageManager = require('./local-storage.js');

/**
 * Database Manager - Abstraction layer for Firebase or Local Storage
 * Automatically detects available configuration and uses appropriate backend
 */
class DatabaseManager {
    constructor(config = {}) {
        this.config = config;
        this.useFirebase = this.shouldUseFirebase();
        this.storage = null;

        this.initialize();
    }

    shouldUseFirebase() {
        // Check if Firebase credentials are provided and valid
        const hasFirebaseConfig = !!(
            this.config.FIREBASE_PROJECT_ID &&
            this.config.FIREBASE_PRIVATE_KEY &&
            this.config.FIREBASE_CLIENT_EMAIL
        );

        if (hasFirebaseConfig) {
            console.log('🔥 Firebase credentials detected - using Firebase backend');
            return true;
        } else {
            console.log('💾 No Firebase credentials - using local storage backend');
            return false;
        }
    }

    async initialize() {
        if (this.useFirebase) {
            await this.initializeFirebase();
        } else {
            this.initializeLocalStorage();
        }
    }

    async initializeFirebase() {
        try {
            const admin = require('firebase-admin');

            // Check if Firebase is already initialized
            if (admin.apps.length === 0) {
                const serviceAccount = {
                    type: "service_account",
                    project_id: this.config.FIREBASE_PROJECT_ID,
                    private_key: this.config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    client_email: this.config.FIREBASE_CLIENT_EMAIL,
                };

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: `https://${this.config.FIREBASE_PROJECT_ID}.firebaseio.com`
                });
            }

            this.storage = admin.firestore();
            console.log('✅ Firebase initialized successfully');

        } catch (error) {
            console.error('❌ Firebase initialization failed:', error.message);
            console.log('📝 Falling back to local storage...');
            this.useFirebase = false;
            this.initializeLocalStorage();
        }
    }

    initializeLocalStorage() {
        this.storage = new LocalStorageManager();
        console.log('✅ Local storage initialized successfully');
    }

    // ===========================
    // USER MANAGEMENT
    // ===========================

    async createUser(userData) {
        if (this.useFirebase) {
            return await this.createUserFirebase(userData);
        } else {
            return await this.storage.createUser(userData);
        }
    }

    async createUserFirebase(userData) {
        const userRef = this.storage.collection('users').doc();
        const user = {
            uid: userRef.id,
            email: userData.email,
            displayName: userData.displayName || 'User',
            createdAt: new Date(),
            teamsEmail: userData.teamsEmail || '',
            teamsPassword: userData.teamsPassword || '',
            settings: {
                defaultMaxRetries: 3,
                autoJoinEnabled: true,
                notifications: true
            }
        };

        await userRef.set(user);
        return user;
    }

    async getCurrentUser() {
        if (this.useFirebase) {
            // Firebase would typically handle this through authentication
            // For this implementation, we'll use the same local approach
            return await this.storage.getCurrentUser();
        } else {
            return await this.storage.getCurrentUser();
        }
    }

    async updateUser(userId, updateData) {
        if (this.useFirebase) {
            const userRef = this.storage.collection('users').doc(userId);
            await userRef.update({
                ...updateData,
                updatedAt: new Date()
            });
            const doc = await userRef.get();
            return { uid: doc.id, ...doc.data() };
        } else {
            return await this.storage.updateUser(userId, updateData);
        }
    }

    // ===========================
    // MEETING MANAGEMENT
    // ===========================

    async addMeeting(meetingData) {
        if (this.useFirebase) {
            return await this.addMeetingFirebase(meetingData);
        } else {
            return await this.storage.addMeeting(meetingData);
        }
    }

    async addMeetingFirebase(meetingData) {
        const meetingRef = this.storage.collection('meetings').doc();
        const meeting = {
            id: meetingRef.id,
            ...meetingData,
            createdAt: new Date(),
            status: 'pending',
            retryCount: 0
        };

        await meetingRef.set(meeting);
        return meeting;
    }

    async getMeetings(userId = null) {
        if (this.useFirebase) {
            return await this.getMeetingsFirebase(userId);
        } else {
            return await this.storage.getMeetings(userId);
        }
    }

    async getMeetingsFirebase(userId = null) {
        let query = this.storage.collection('meetings');

        if (userId) {
            query = query.where('userId', '==', userId);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            scheduledTime: doc.data().scheduledTime?.toDate?.() || doc.data().scheduledTime
        }));
    }

    async updateMeeting(meetingId, updateData) {
        if (this.useFirebase) {
            const meetingRef = this.storage.collection('meetings').doc(meetingId);
            await meetingRef.update({
                ...updateData,
                updatedAt: new Date()
            });
            const doc = await meetingRef.get();
            return { id: doc.id, ...doc.data() };
        } else {
            return await this.storage.updateMeeting(meetingId, updateData);
        }
    }

    async deleteMeeting(meetingId) {
        if (this.useFirebase) {
            await this.storage.collection('meetings').doc(meetingId).delete();
            return true;
        } else {
            return await this.storage.deleteMeeting(meetingId);
        }
    }

    async getPendingMeetings() {
        if (this.useFirebase) {
            const snapshot = await this.storage.collection('meetings')
                .where('status', 'in', ['pending', 'retrying'])
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                scheduledTime: doc.data().scheduledTime?.toDate?.() || doc.data().scheduledTime
            }));
        } else {
            return await this.storage.getPendingMeetings();
        }
    }

    // ===========================
    // LOGGING
    // ===========================

    async addLog(logData) {
        if (this.useFirebase) {
            const logRef = this.storage.collection('meetingLogs').doc();
            const log = {
                id: logRef.id,
                ...logData,
                timestamp: new Date()
            };
            await logRef.set(log);
            return log;
        } else {
            return await this.storage.addLog(logData);
        }
    }

    async getLogs(limit = 50) {
        if (this.useFirebase) {
            const snapshot = await this.storage.collection('meetingLogs')
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } else {
            return await this.storage.getLogs(limit);
        }
    }

    // ===========================
    // STATISTICS
    // ===========================

    async getStats(userId = null) {
        if (this.useFirebase) {
            return await this.getStatsFirebase(userId);
        } else {
            return await this.storage.getStats(userId);
        }
    }

    async getStatsFirebase(userId = null) {
        let query = this.storage.collection('meetings');

        if (userId) {
            query = query.where('userId', '==', userId);
        }

        const snapshot = await query.get();
        const meetings = snapshot.docs.map(doc => doc.data());

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
                const meetingDate = m.scheduledTime?.toDate ? m.scheduledTime.toDate() : new Date(m.scheduledTime);
                return meetingDate >= today && meetingDate < tomorrow;
            }).length
        };

        return stats;
    }

    // ===========================
    // UTILITY METHODS
    // ===========================

    getBackendType() {
        return this.useFirebase ? 'firebase' : 'local';
    }

    async testConnection() {
        try {
            if (this.useFirebase) {
                // Test Firebase connection
                await this.storage.collection('test').limit(1).get();
                return { success: true, backend: 'firebase' };
            } else {
                // Test local storage
                const stats = await this.storage.getStats();
                return { success: true, backend: 'local', stats };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ===========================
    // BACKUP/EXPORT (Local only)
    // ===========================

    exportData() {
        if (!this.useFirebase && this.storage.exportData) {
            return this.storage.exportData();
        } else {
            console.log('⚠️ Export only available for local storage');
            return null;
        }
    }

    importData(filePath) {
        if (!this.useFirebase && this.storage.importData) {
            return this.storage.importData(filePath);
        } else {
            console.log('⚠️ Import only available for local storage');
            return false;
        }
    }
}

module.exports = DatabaseManager;