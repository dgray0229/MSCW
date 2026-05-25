import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useCalendarGraduation } from '../hooks/useCalendarGraduation';
import { useAppStore } from '../store';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

function TestComponent() {
  useCalendarGraduation();
  return null;
}

describe('useCalendarGraduation Hook Tests', () => {
  let renderer: any = null;

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  beforeEach(() => {
    act(() => {
      useAppStore.setState({
        _hasHydrated: true,
        tasks: [],
        settings: {
          isPremium: false,
          dailyCapacity: 8,
          zenDuration: 25,
          hapticsEnabled: true,
          dailyNotificationsEnabled: false,
          zenModeNotifications: true,
          darkMode: false,
          autoArchiveWontTasks: true,
          hasSeenOnboarding: false,
          currentStreakDays: 0,
          longestStreakDays: 0,
          sprintNumber: 1,
          sprintStartDate: new Date().toISOString(),
          sprintLengthDays: 7,
        },
      });
    });
  });

  afterEach(() => {
    if (renderer) {
      act(() => {
        renderer.unmount();
      });
      renderer = null;
    }
  });

  it('should graduate tasks scheduled for today from sprint/backlog to today status', async () => {
    const todayStr = getTodayString();
    
    // Add two tasks: one scheduled for today, one scheduled for tomorrow
    act(() => {
      useAppStore.getState().addTask({
        title: 'Graduate Today',
        scheduledDate: todayStr,
        status: 'sprint',
      });
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
      
      useAppStore.getState().addTask({
        title: 'Do Not Graduate Tomorrow',
        scheduledDate: tomorrowStr,
        status: 'sprint',
      });
    });

    const addedState = useAppStore.getState();
    expect(addedState.tasks.length).toBe(2);
    expect(addedState.tasks.find(t => t.title === 'Graduate Today')?.status).toBe('sprint');

    // Mount hook
    await act(async () => {
      renderer = TestRenderer.create(<TestComponent />);
    });

    const finalState = useAppStore.getState();
    const todayTask = finalState.tasks.find(t => t.title === 'Graduate Today');
    const tomorrowTask = finalState.tasks.find(t => t.title === 'Do Not Graduate Tomorrow');

    expect(todayTask?.status).toBe('today');
    expect(tomorrowTask?.status).toBe('sprint');
  });

  it('should not graduate completed tasks or archived tasks', async () => {
    const todayStr = getTodayString();
    
    act(() => {
      useAppStore.getState().addTask({
        title: 'Completed Task',
        scheduledDate: todayStr,
        status: 'sprint',
        completed: true,
      });
      useAppStore.getState().addTask({
        title: 'Archived Task',
        scheduledDate: todayStr,
        status: 'archive',
      });
    });

    await act(async () => {
      renderer = TestRenderer.create(<TestComponent />);
    });

    const finalState = useAppStore.getState();
    const completedTask = finalState.tasks.find(t => t.title === 'Completed Task');
    const archivedTask = finalState.tasks.find(t => t.title === 'Archived Task');

    expect(completedTask?.status).toBe('sprint');
    expect(archivedTask?.status).toBe('archive');
  });
});
