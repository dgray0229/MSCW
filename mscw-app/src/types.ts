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
}

export interface AppSettings {
  dailyCapacity: number;
  zenModeNotifications: boolean;
  darkMode: boolean;
  autoArchiveWontTasks: boolean;
}
