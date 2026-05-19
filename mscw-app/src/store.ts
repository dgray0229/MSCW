import { create } from 'zustand';
import { Task, Priority, AppSettings } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppState {
  tasks: Task[];
  settings: AppSettings;
  addTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
}

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Design the Data Models',
    description: 'Ensure Zustand store and types are properly defined',
    points: 3,
    priority: 'must',
    status: 'board',
    completed: true,
    createdAt: new Date().toISOString(),
    type: 'Feature'
  },
  {
    id: '2',
    title: 'Implement Triage View',
    description: 'Build swipe interface for MoSCoW prioritization',
    points: 5,
    priority: 'must',
    status: 'board',
    completed: false,
    createdAt: new Date().toISOString(),
    type: 'Feature'
  },
  {
    id: '3',
    title: 'Investigate RevenueCat',
    points: null,
    priority: 'unsorted',
    status: 'backlog',
    completed: false,
    createdAt: new Date().toISOString(),
    type: 'Tech Debt'
  }
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      tasks: mockTasks,
      settings: {
        dailyCapacity: 8,
        zenModeNotifications: true,
        darkMode: false,
        autoArchiveWontTasks: true,
      },
      addTask: (task) => set((state) => ({
        tasks: [
          ...state.tasks,
          {
            id: Math.random().toString(36).substr(2, 9),
            title: task.title || '',
            description: task.description,
            points: task.points || null,
            priority: task.priority || 'unsorted',
            status: task.status || 'backlog',
            completed: false,
            createdAt: new Date().toISOString(),
            type: task.type,
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
      }))
    }),
    {
      name: 'mscw-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
