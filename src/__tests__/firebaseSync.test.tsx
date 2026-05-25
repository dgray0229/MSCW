import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useFirebaseSync } from '../hooks/useFirebaseSync';
import { useAppStore } from '../store';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Declare mock functions on global
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockGet = jest.fn();
const mockOnSnapshot = jest.fn().mockImplementation((onNext) => {
  // By default do nothing or return a dummy unsubscribe function
  return () => {};
});
(global as any).mockSet = mockSet;
(global as any).mockGet = mockGet;
(global as any).mockOnSnapshot = mockOnSnapshot;

jest.mock('../lib/firebase', () => {
  return {
    db: {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          set: jest.fn((...args: any[]) => (global as any).mockSet(...args)),
          get: jest.fn((...args: any[]) => (global as any).mockGet(...args)),
          onSnapshot: jest.fn((...args: any[]) => (global as any).mockOnSnapshot(...args)),
        })),
      })),
    },
  };
});

function TestComponent() {
  useFirebaseSync();
  return null;
}

describe('useFirebaseSync Hook Tests', () => {
  let renderer: any = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockReset();
    mockGet.mockReset();
    mockOnSnapshot.mockReset();
    mockSet.mockResolvedValue(undefined);
    
    // Reset store to a clean state wrapped in act
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
          user: {
            uid: 'test-user-123',
            email: 'test@example.com',
            displayName: 'Test User',
          },
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

  it('should not push to cloud on first load (hydration)', async () => {
    mockOnSnapshot.mockImplementation((onNext) => {
      onNext({
        exists: true,
        data: () => ({
          tasks: [],
          settings: { dailyCapacity: 10 },
          lastSyncedAt: new Date().toISOString(),
        }),
      });
      return () => {};
    });

    await act(async () => {
      renderer = TestRenderer.create(<TestComponent />);
    });

    // On first load, it shouldn't push to cloud
    expect(mockSet).not.toHaveBeenCalled();
    // It should have subscribed to cloud updates
    expect(mockOnSnapshot).toHaveBeenCalled();
  });

  it('should push to cloud when tasks or settings change', async () => {
    mockOnSnapshot.mockImplementation((onNext) => {
      onNext({
        exists: false,
      });
      return () => {};
    });

    await act(async () => {
      renderer = TestRenderer.create(<TestComponent />);
    });

    expect(mockSet).not.toHaveBeenCalled();

    // Modify a task (should trigger PUSH)
    await act(async () => {
      useAppStore.getState().addTask({ title: 'New Task' });
    });

    expect(mockSet).toHaveBeenCalledTimes(1);
    const setCallArgs = mockSet.mock.calls[0][0];
    expect(setCallArgs.tasks.length).toBe(1);
    expect(setCallArgs.tasks[0].title).toBe('New Task');
  });

  it('should pull from cloud and merge state, gating the loop via justPulled ref', async () => {
    const cloudTasks = [
      {
        id: 'cloud-task-1',
        title: 'Task from Cloud',
        points: 3,
        priority: 'must' as const,
        status: 'board' as const,
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ];

    mockOnSnapshot.mockImplementation((onNext) => {
      onNext({
        exists: true,
        data: () => ({
          tasks: cloudTasks,
          settings: { dailyCapacity: 12 },
          lastSyncedAt: new Date().toISOString(),
        }),
      });
      return () => {};
    });

    await act(async () => {
      renderer = TestRenderer.create(<TestComponent />);
    });

    // Pull from cloud should update the store state
    const state = useAppStore.getState();
    expect(state.tasks).toEqual(cloudTasks);
    expect(state.settings.dailyCapacity).toBe(12);

    // Importantly, because of the echo filter, this merge MUST NOT trigger a push to cloud!
    expect(mockSet).not.toHaveBeenCalled();
  });
});

