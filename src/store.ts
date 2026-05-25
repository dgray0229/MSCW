import { create } from 'zustand';
import { Task, Priority, AppSettings, FocusSession, DistractionRecord } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppState {
  _hasHydrated: boolean;
  isSyncing: boolean;
  tasks: Task[];
  settings: AppSettings;
  focusSessions: FocusSession[];
  distractions: DistractionRecord[];
  addTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  setUser: (user: AppSettings['user']) => void;
  setHasHydrated: (state: boolean) => void;
  setIsSyncing: (state: boolean) => void;
  archiveCompletedTasks: () => void;
  syncWithCloud: (tasks: Task[], settings: AppSettings) => void;
  endSprint: (notes?: string) => void;
  addFocusSession: (session: Omit<FocusSession, 'id' | 'timestamp'>) => void;
  logDistraction: (distraction: Omit<DistractionRecord, 'id' | 'timestamp'>) => void;
}

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Create your first task',
    description: 'Use the Triage or Backlog view to add a task',
    points: 1,
    priority: 'must',
    status: 'today',
    completed: false,
    createdAt: new Date().toISOString(),
    type: 'Feature'
  },
  {
    id: '2',
    title: 'Score your first task',
    description: 'Assign points to represent effort',
    points: 2,
    priority: 'must',
    status: 'today',
    completed: false,
    createdAt: new Date().toISOString(),
    type: 'Feature'
  },
  {
    id: '3',
    title: 'Complete your first task',
    description: 'Tap the checkbox when done!',
    points: 1,
    priority: 'should',
    status: 'sprint',
    completed: false,
    createdAt: new Date().toISOString(),
    type: 'Feature'
  },
  {
    id: '4',
    title: 'Triage your task list',
    description: 'Swipe tasks into priority buckets in the Triage view',
    points: null,
    priority: 'unsorted',
    status: 'backlog',
    completed: false,
    createdAt: new Date().toISOString(),
    type: 'Feature'
  }
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      isSyncing: false,
      tasks: mockTasks,
      focusSessions: [],
      distractions: [],
      settings: {
        isPremium: false,
        dailyCapacity: 8,
        zenDuration: 25,
        hapticsEnabled: true,
        dailyNotificationsEnabled: false,
        biometricsEnabled: false,
        user: null,
        zenModeNotifications: true,
        darkMode: false,
        autoArchiveWontTasks: true,
        hasSeenOnboarding: false,
        currentStreakDays: 0,
        longestStreakDays: 0,
        latestAiCoachMessage: null,
        lastCoachGeneratedDate: null,
        sprintNumber: 1,
        sprintStartDate: new Date().toISOString(),
        sprintLengthDays: 7,
        googleTasksConnected: false,
        googleTaskListId: null,
        appleRemindersConnected: false,
        appleRemindersListId: null,
        calendarConnected: false,
        selectedCalendarId: null,
        selectedCalendarName: '',
        lastSyncedIntegrations: null,
        integrationLogs: [],
        accentTheme: 'crimson',
        sprints: [],
        feedbackStatus: 'pending',
        feedbackPromptLastShown: null,
        feedbackSnoozeCount: 0,
      },
      addTask: (task) => set((state) => ({
        tasks: [
          ...state.tasks,
          {
            id: Math.random().toString(36).substring(2, 11),
            title: task.title || '',
            description: task.description,
            points: task.points !== undefined ? task.points : null,
            priority: task.priority || 'unsorted',
            status: task.status || 'backlog',
            completed: task.completed !== undefined ? task.completed : false,
            createdAt: new Date().toISOString(),
            type: task.type,
            subtasks: task.subtasks || [],
            phase: task.phase,
            scheduledDate: task.scheduledDate,
            completedAt: task.completedAt,
            tags: task.tags || [],
            rolloverCount: task.rolloverCount || 0,
          }
        ]
      })),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t)
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id)
      })),
      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates }
      })),
      setUser: (user) => set((state) => ({
        settings: { ...state.settings, user }
      })),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setIsSyncing: (state) => set({ isSyncing: state }),
      archiveCompletedTasks: () => set((state) => ({
        tasks: state.tasks.map((t) =>
          t.status === 'today' && t.completed
            ? { ...t, status: 'archive', completedAt: t.completedAt || new Date().toISOString() }
            : t
        )
      })),
      syncWithCloud: (tasks, settings) => set((state) => ({
        tasks: tasks || state.tasks,
        settings: settings ? { ...state.settings, ...settings } : state.settings
      })),
      endSprint: (notes) => set((state) => {
        const todayTasks = state.tasks.filter(t => t.status === 'today');
        const mustTasks = todayTasks.filter(t => t.priority === 'must');
        const completedMusts = mustTasks.filter(t => t.completed).length;
        const totalMusts = mustTasks.length;
        
        const completedPoints = todayTasks.reduce((sum, t) => sum + (t.completed ? (t.points || 0) : 0), 0);
        const totalPoints = todayTasks.reduce((sum, t) => sum + (t.points || 0), 0);
        
        const dailyCapacity = state.settings.dailyCapacity;
        const velocityScore = dailyCapacity > 0 ? Math.min(100, Math.round((completedPoints / dailyCapacity) * 100)) : 0;
        
        const newSprintHistory = {
          id: Math.random().toString(36).substring(2, 11),
          sprintNumber: state.settings.sprintNumber,
          startDate: state.settings.sprintStartDate || new Date().toISOString(),
          endDate: new Date().toISOString(),
          totalPoints,
          completedPoints,
          completedMusts,
          totalMusts,
          velocityScore,
          notes: notes || '',
        };

        const updatedTasks = state.tasks.map((t) => {
          if ((t.status === 'today' || t.status === 'sprint') && t.completed) {
            return { ...t, status: 'archive' as const, completedAt: t.completedAt || new Date().toISOString() };
          }
          if ((t.status === 'today' || t.status === 'sprint') && !t.completed) {
            return { ...t, rolloverCount: (t.rolloverCount || 0) + 1 };
          }
          return t;
        });

        return {
          tasks: updatedTasks,
          settings: {
            ...state.settings,
            sprints: [...(state.settings.sprints || []), newSprintHistory],
            sprintNumber: state.settings.sprintNumber + 1,
            sprintStartDate: new Date().toISOString(),
          }
        };
      }),
      addFocusSession: (session) => set((state) => ({
        focusSessions: [
          ...(state.focusSessions || []),
          {
            ...session,
            id: Math.random().toString(36).substring(2, 11),
            timestamp: new Date().toISOString()
          }
        ]
      })),
      logDistraction: (distraction) => set((state) => ({
        distractions: [
          ...(state.distractions || []),
          {
            ...distraction,
            id: Math.random().toString(36).substring(2, 11),
            timestamp: new Date().toISOString()
          }
        ]
      })),
    }),
    {
      name: 'mscw-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
