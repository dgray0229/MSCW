export type Priority = 'must' | 'should' | 'could' | 'wont' | 'unsorted';

export interface Task {
  id: string;
  title: string;
  description?: string;
  points: number | null;
  priority: Priority;
  status: 'backlog' | 'sprint' | 'today' | 'archive';
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  tags?: string[];
  type?: 'Feature' | 'Bug' | 'Tech Debt' | 'Hotfix' | 'Design' | 'Security';
  subtasks?: { id: string; title: string; completed: boolean }[];
  phase?: 'morning' | 'afternoon' | 'evening';
  scheduledDate?: string; // YYYY-MM-DD
  rolloverCount?: number; // persistent rollover tracker
}

export interface AppSettings {
  isPremium: boolean;
  dailyCapacity: number;
  zenDuration: number;
  hapticsEnabled: boolean;
  dailyNotificationsEnabled: boolean;
  biometricsEnabled?: boolean;
  user?: {
    uid: string;
    email: string | null;
    displayName: string | null;
  } | null;
  zenModeNotifications: boolean;
  darkMode: boolean;
  autoArchiveWontTasks: boolean;
  hasSeenOnboarding: boolean;
  currentStreakDays: number;
  longestStreakDays: number;
  latestAiCoachMessage?: string | null;
  lastCoachGeneratedDate?: string | null;
  sprintNumber: number;
  sprintStartDate: string | null;
  sprintLengthDays: number;
  googleTasksConnected?: boolean;
  googleTaskListId?: string | null;
  appleRemindersConnected?: boolean;
  appleRemindersListId?: string | null;
  calendarConnected?: boolean;
  selectedCalendarId?: string | null;
  selectedCalendarName?: string;
  lastSyncedIntegrations?: string | null;
  integrationLogs?: {
    id: string;
    timestamp: string;
    service: 'google_tasks' | 'apple_reminders' | 'calendar' | 'system';
    status: 'success' | 'error' | 'info';
    message: string;
  }[];
  accentTheme?: 'crimson' | 'forest' | 'cosmic' | 'amber';
  sprints?: SprintHistory[];
  feedbackStatus?: 'pending' | 'enjoying' | 'not_enjoying' | 'submitted' | 'snoozed';
  feedbackPromptLastShown?: string | null;
  feedbackSnoozeCount?: number;
}

export interface SprintHistory {
  id: string;
  sprintNumber: number;
  startDate: string;
  endDate: string;
  totalPoints: number;
  completedPoints: number;
  completedMusts: number;
  totalMusts: number;
  velocityScore: number;
  notes?: string;
}

export interface FocusSession {
  id: string;
  taskId: string;
  taskTitle: string;
  durationSeconds: number;
  targetSeconds: number;
  timestamp: string;
  completed: boolean;
  distractionsCount: number;
  focusScore: number;
}

export interface DistractionRecord {
  id: string;
  sessionId: string;
  timestamp: string;
  category: 'external' | 'digital' | 'fatigue';
}

