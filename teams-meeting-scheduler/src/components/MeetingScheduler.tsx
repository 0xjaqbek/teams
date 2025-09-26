import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { Meeting } from '../types/Meeting';
import { format } from 'date-fns';
import './MeetingScheduler.css';

const MeetingScheduler: React.FC = () => {
  const [user] = useAuthState(auth);
  const [formData, setFormData] = useState({
    teamsEmail: '',
    teamsPassword: '',
    meetingLink: '',
    scheduledDate: '',
    scheduledTime: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);

      const meeting: Omit<Meeting, 'id'> = {
        userId: user.uid,
        teamsEmail: formData.teamsEmail,
        teamsPassword: formData.teamsPassword,
        meetingLink: formData.meetingLink,
        scheduledTime: scheduledDateTime,
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'meetings'), meeting);

      // Reset form
      setFormData({
        teamsEmail: '',
        teamsPassword: '',
        meetingLink: '',
        scheduledDate: '',
        scheduledTime: ''
      });

      alert('Meeting scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      alert('Failed to schedule meeting. Please try again.');
    }
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!user) {
    return <div className="auth-required">Please sign in to schedule meetings</div>;
  }

  return (
    <div className="meeting-scheduler">
      <h2>Schedule Teams Meeting</h2>
      <form onSubmit={handleSubmit} className="scheduler-form">
        <div className="form-group">
          <label htmlFor="teamsEmail">Teams Email:</label>
          <input
            type="email"
            id="teamsEmail"
            name="teamsEmail"
            value={formData.teamsEmail}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="teamsPassword">Teams Password:</label>
          <input
            type="password"
            id="teamsPassword"
            name="teamsPassword"
            value={formData.teamsPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="meetingLink">Meeting Link:</label>
          <input
            type="url"
            id="meetingLink"
            name="meetingLink"
            value={formData.meetingLink}
            onChange={handleChange}
            placeholder="https://teams.microsoft.com/l/meetup-join/..."
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="scheduledDate">Date:</label>
            <input
              type="date"
              id="scheduledDate"
              name="scheduledDate"
              value={formData.scheduledDate}
              onChange={handleChange}
              min={format(new Date(), 'yyyy-MM-dd')}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="scheduledTime">Time (Poland):</label>
            <input
              type="time"
              id="scheduledTime"
              name="scheduledTime"
              value={formData.scheduledTime}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Scheduling...' : 'Schedule Meeting'}
        </button>
      </form>
    </div>
  );
};

export default MeetingScheduler;