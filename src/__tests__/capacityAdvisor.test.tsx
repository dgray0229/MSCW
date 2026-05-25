import { getSmartCapacityRecommendation } from '../lib/aiPlanner';
import { useAppStore } from '../store';
import { Task, AppSettings } from '../types';

// Mock AsyncStorage using react-native-async-storage's standard Jest mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('MSCW Smart Capacity Advisor & Velocity Planner Tests', () => {
  const defaultSettings: AppSettings = {
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
    sprints: [], // Start with empty historical sprints
  };

  describe('Optimal Capacity Calculation', () => {
    it('should fallback to 65% capacity baseline when no sprints exist', () => {
      const recommendation = getSmartCapacityRecommendation([], defaultSettings);
      
      // Max capacity is dailyCapacity * sprintLengthDays = 8 * 7 = 56
      // Sustainable baseline is 56 * 0.65 = 36.4 -> Math.round(36.4) = 36
      expect(recommendation.optimalCapacity).toBe(36);
    });

    it('should compute mathematical average of historical completed sprints when they exist', () => {
      const settingsWithSprints: AppSettings = {
        ...defaultSettings,
        sprints: [
          {
            id: 'sprint-1',
            sprintNumber: 1,
            startDate: '',
            endDate: '',
            totalPoints: 45,
            completedPoints: 42,
            totalMusts: 5,
            completedMusts: 5,
            velocityScore: 93,
            notes: 'First sprint complete!',
          },
          {
            id: 'sprint-2',
            sprintNumber: 2,
            startDate: '',
            endDate: '',
            totalPoints: 35,
            completedPoints: 28,
            totalMusts: 4,
            completedMusts: 3,
            velocityScore: 80,
            notes: 'Second sprint complete.',
          },
          {
            id: 'sprint-3',
            sprintNumber: 3,
            startDate: '',
            endDate: '',
            totalPoints: 30,
            completedPoints: 0, // Ignored because completedPoints is 0 or less
            totalMusts: 0,
            completedMusts: 0,
            velocityScore: 0,
            notes: 'Sprint failed or not done.',
          }
        ]
      };

      const recommendation = getSmartCapacityRecommendation([], settingsWithSprints);
      
      // Averages of active completed sprints (sprints 1 and 2):
      // (42 + 28) / 2 = 70 / 2 = 35
      expect(recommendation.optimalCapacity).toBe(35);
    });
  });

  describe('Current Load & Story Point Estimation Fallbacks', () => {
    it('should sum up active uncompleted sprint/today tasks accurately', () => {
      const activeTasks: Task[] = [
        {
          id: '1',
          title: 'Must task',
          points: 5,
          priority: 'must',
          status: 'sprint',
          completed: false,
          createdAt: '',
        },
        {
          id: '2',
          title: 'Should task',
          points: 3,
          priority: 'should',
          status: 'today',
          completed: false,
          createdAt: '',
        },
        {
          id: '3',
          title: 'Completed task',
          points: 8,
          priority: 'must',
          status: 'sprint',
          completed: true, // Ignored because it is completed
          createdAt: '',
        },
        {
          id: '4',
          title: 'Backlog task',
          points: 13,
          priority: 'could',
          status: 'backlog', // Ignored because it is backlog (not sprint/today)
          completed: false,
          createdAt: '',
        }
      ];

      const recommendation = getSmartCapacityRecommendation(activeTasks, defaultSettings);
      
      // Expected sum: 5 + 3 = 8
      expect(recommendation.currentLoad).toBe(8);
    });

    it('should fallback to 2 story points when points is null or undefined for planning', () => {
      const tasksWithNullPoints: Task[] = [
        {
          id: '1',
          title: 'Unestimated active task',
          points: null, // Null points should fall back to 2 pts
          priority: 'must',
          status: 'sprint',
          completed: false,
          createdAt: '',
        },
        {
          id: '2',
          title: 'Another unestimated active task',
          points: undefined as any, // Undefined points should fall back to 2 pts
          priority: 'should',
          status: 'today',
          completed: false,
          createdAt: '',
        }
      ];

      const recommendation = getSmartCapacityRecommendation(tasksWithNullPoints, defaultSettings);
      
      // Expected fallback: 2 + 2 = 4
      expect(recommendation.currentLoad).toBe(4);
    });
  });

  describe('Advisory Capacity Threshold Levels & Messages', () => {
    it('should report success level when load is less than 80%', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task A', points: 10, priority: 'must', status: 'sprint', completed: false, createdAt: '' }
      ];
      // Optimal limit is 36. 10 pts is ~28%
      const recommendation = getSmartCapacityRecommendation(tasks, defaultSettings);
      
      expect(recommendation.level).toBe('success');
      expect(recommendation.title).toBe('Healthy Capacity');
      expect(recommendation.message).toContain('Excellent buffer');
    });

    it('should report warning level when load is between 80% and 100%', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task A', points: 30, priority: 'must', status: 'sprint', completed: false, createdAt: '' }
      ];
      // Optimal limit is 36. 30 pts is ~83%
      const recommendation = getSmartCapacityRecommendation(tasks, defaultSettings);
      
      expect(recommendation.level).toBe('warning');
      expect(recommendation.title).toBe('Near Target Capacity');
      expect(recommendation.message).toContain('Ideal capacity reached');
    });

    it('should report danger level when load is strictly above 100%', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task A', points: 40, priority: 'must', status: 'sprint', completed: false, createdAt: '' }
      ];
      // Optimal limit is 36. 40 pts is ~111%
      const recommendation = getSmartCapacityRecommendation(tasks, defaultSettings);
      
      expect(recommendation.level).toBe('danger');
      expect(recommendation.title).toBe('Velocity Overflow Warning');
      expect(recommendation.message).toContain('burnout');
    });

    it('should incorporate upcomingPoints preview displacement correctly', () => {
      const tasks: Task[] = [
        { id: '1', title: 'Task A', points: 25, priority: 'must', status: 'sprint', completed: false, createdAt: '' }
      ];
      // Current load: 25 pts (69%, success).
      // If we add a 15 pt upcoming task, preview load becomes 40 pts (111%, danger).
      const recommendation = getSmartCapacityRecommendation(tasks, defaultSettings, 15);
      
      expect(recommendation.currentLoad).toBe(25); // current load remains 25
      expect(recommendation.level).toBe('danger'); // but the preview causes danger warning!
      expect(recommendation.percentage).toBe(111);
    });
  });

  describe('Zustand Store Integration', () => {
    beforeEach(() => {
      useAppStore.setState({
        _hasHydrated: true,
        tasks: [],
        settings: defaultSettings,
      });
    });

    it('should reflect capacity updates when backlog items are triaged in the store', () => {
      const store = useAppStore.getState();
      
      // Let's add a backlog task with 15 story points
      store.addTask({
        title: 'Huge Backlog Item',
        points: 15,
        status: 'backlog',
        priority: 'unsorted',
      });

      let updatedStore = useAppStore.getState();
      let rec = getSmartCapacityRecommendation(updatedStore.tasks, updatedStore.settings);
      expect(rec.currentLoad).toBe(0); // Load is 0 since task is backlog
      
      // Triage task to MUST priority and move to sprint
      const task = updatedStore.tasks[0];
      updatedStore.updateTask(task.id, {
        priority: 'must',
        status: 'sprint',
      });

      updatedStore = useAppStore.getState();
      rec = getSmartCapacityRecommendation(updatedStore.tasks, updatedStore.settings);
      expect(rec.currentLoad).toBe(15); // Now load is 15
      expect(rec.percentage).toBe(Math.round((15 / 36) * 100)); // ~42%
    });
  });
});
