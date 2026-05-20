export type Priority = 'must' | 'should' | 'could' | 'wont' | 'unsorted';

export interface Task {
  id: string;
  title: string;
  description?: string;
  points: number | null;
  priority: Priority;
  status: 'backlog' | 'board' | 'archive';
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  tags?: string[];
  type?: 'Feature' | 'Bug' | 'Tech Debt' | 'Hotfix' | 'Design' | 'Security';
  subtasks?: { id: string; title: string; completed: boolean }[];
  phase?: 'morning' | 'afternoon' | 'evening';
}

export interface AppSettings {
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
}
