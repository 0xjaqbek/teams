export interface Meeting {
  id?: string;
  userId: string;
  teamsEmail: string;
  teamsPassword: string;
  meetingLink: string;
  scheduledTime: Date;
  status: 'pending' | 'joined' | 'failed' | 'retrying';
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  lastAttempt?: Date;
  errorMessage?: string;
}

export interface MeetingLog {
  id?: string;
  meetingId: string;
  userId: string;
  action: 'scheduled' | 'joined' | 'failed' | 'retry';
  timestamp: Date;
  details?: string;
  errorMessage?: string;
}