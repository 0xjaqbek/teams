import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { Meeting, MeetingLog } from '../types/Meeting';
import { format } from 'date-fns';
import './MeetingDashboard.css';

const MeetingDashboard: React.FC = () => {
  const [user] = useAuthState(auth);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingLogs, setMeetingLogs] = useState<MeetingLog[]>([]);
  const [activeTab, setActiveTab] = useState<'meetings' | 'logs'>('meetings');

  useEffect(() => {
    if (!user) return;

    // Subscribe to user's meetings
    const meetingsQuery = query(
      collection(db, 'meetings'),
      where('userId', '==', user.uid),
      orderBy('scheduledTime', 'desc')
    );

    const unsubscribeMeetings = onSnapshot(meetingsQuery, (snapshot) => {
      const meetingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledTime: doc.data().scheduledTime.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        lastAttempt: doc.data().lastAttempt?.toDate()
      })) as Meeting[];
      setMeetings(meetingsData);
    });

    // Subscribe to user's meeting logs
    const logsQuery = query(
      collection(db, 'meetingLogs'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      })) as MeetingLog[];
      setMeetingLogs(logsData);
    });

    return () => {
      unsubscribeMeetings();
      unsubscribeLogs();
    };
  }, [user]);

  const deleteMeeting = async (meetingId: string) => {
    if (window.confirm('Are you sure you want to delete this meeting?')) {
      try {
        await deleteDoc(doc(db, 'meetings', meetingId));
      } catch (error) {
        console.error('Error deleting meeting:', error);
        alert('Failed to delete meeting');
      }
    }
  };

  const getStatusBadge = (status: Meeting['status']) => {
    const statusColors = {
      pending: 'status-pending',
      joined: 'status-joined',
      failed: 'status-failed',
      retrying: 'status-retrying'
    };
    return <span className={`status-badge ${statusColors[status]}`}>{status}</span>;
  };

  const formatDateTime = (date: Date) => {
    return format(date, 'dd/MM/yyyy HH:mm');
  };

  if (!user) {
    return <div className="auth-required">Please sign in to view your meetings</div>;
  }

  return (
    <div className="meeting-dashboard">
      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'meetings' ? 'active' : ''}`}
          onClick={() => setActiveTab('meetings')}
        >
          Meetings ({meetings.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Logs ({meetingLogs.length})
        </button>
      </div>

      {activeTab === 'meetings' && (
        <div className="meetings-tab">
          <h2>Your Scheduled Meetings</h2>
          {meetings.length === 0 ? (
            <div className="empty-state">No meetings scheduled yet</div>
          ) : (
            <div className="meetings-list">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="meeting-card">
                  <div className="meeting-header">
                    <div className="meeting-info">
                      <h3>Meeting - {formatDateTime(meeting.scheduledTime)}</h3>
                      <p className="meeting-email">Account: {meeting.teamsEmail}</p>
                    </div>
                    {getStatusBadge(meeting.status)}
                  </div>

                  <div className="meeting-details">
                    <p><strong>Link:</strong>
                      <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer">
                        {meeting.meetingLink}
                      </a>
                    </p>
                    <p><strong>Created:</strong> {formatDateTime(meeting.createdAt)}</p>
                    {meeting.lastAttempt && (
                      <p><strong>Last Attempt:</strong> {formatDateTime(meeting.lastAttempt)}</p>
                    )}
                    {meeting.status === 'failed' || meeting.status === 'retrying' ? (
                      <p><strong>Retry Count:</strong> {meeting.retryCount}/{meeting.maxRetries}</p>
                    ) : null}
                    {meeting.errorMessage && (
                      <p className="error-message"><strong>Error:</strong> {meeting.errorMessage}</p>
                    )}
                  </div>

                  <div className="meeting-actions">
                    <button
                      className="delete-button"
                      onClick={() => deleteMeeting(meeting.id!)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="logs-tab">
          <h2>Meeting Logs</h2>
          {meetingLogs.length === 0 ? (
            <div className="empty-state">No logs available</div>
          ) : (
            <div className="logs-list">
              {meetingLogs.map((log) => (
                <div key={log.id} className="log-entry">
                  <div className="log-header">
                    <span className={`log-action log-action-${log.action}`}>{log.action}</span>
                    <span className="log-timestamp">{formatDateTime(log.timestamp)}</span>
                  </div>
                  {log.details && <p className="log-details">{log.details}</p>}
                  {log.errorMessage && <p className="log-error">{log.errorMessage}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MeetingDashboard;