import { useAppStore } from '../store';

// Mock AsyncStorage using react-native-async-storage's standard Jest mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('MSCW Zustand Store Tests', () => {
  // Before each test, reset the store to a clean, predictable state
  beforeEach(() => {
    useAppStore.setState({
      _hasHydrated: true,
      tasks: [],
      settings: {
        dailyCapacity: 8,
        zenModeNotifications: true,
        darkMode: false,
        autoArchiveWontTasks: true,
        hasSeenOnboarding: false,
        currentStreakDays: 0,
        longestStreakDays: 0,
      },
    });
  });

  it('should initialize with default states', () => {
    const state = useAppStore.getState();
    expect(state.tasks).toEqual([]);
    expect(state.settings.dailyCapacity).toBe(8);
    expect(state.settings.autoArchiveWontTasks).toBe(true);
    expect(state._hasHydrated).toBe(true);
  });

  it('should add a task with unique ID and correct defaults', () => {
    const state = useAppStore.getState();
    
    state.addTask({
      title: 'New Feature task',
      description: 'Test description',
      points: 5,
      type: 'Feature',
      status: 'backlog',
      priority: 'unsorted',
    });

    const updatedState = useAppStore.getState();
    expect(updatedState.tasks.length).toBe(1);
    
    const task = updatedState.tasks[0];
    expect(task.title).toBe('New Feature task');
    expect(task.description).toBe('Test description');
    expect(task.points).toBe(5);
    expect(task.type).toBe('Feature');
    expect(task.status).toBe('backlog');
    expect(task.priority).toBe('unsorted');
    expect(task.completed).toBe(false);
    expect(task.id).toBeDefined();
    expect(typeof task.id).toBe('string');
  });

  it('should update task attributes successfully', () => {
    const state = useAppStore.getState();
    
    // First, add a task
    state.addTask({
      title: 'Task to update',
      points: 3,
      type: 'Bug',
    });

    const addedState = useAppStore.getState();
    const taskId = addedState.tasks[0].id;

    // Perform updates
    addedState.updateTask(taskId, {
      completed: true,
      priority: 'must',
      status: 'board',
    });

    const updatedState = useAppStore.getState();
    const task = updatedState.tasks[0];
    expect(task.completed).toBe(true);
    expect(task.priority).toBe('must');
    expect(task.status).toBe('board');
  });

  it('should delete a task by ID', () => {
    const state = useAppStore.getState();
    
    state.addTask({ title: 'Task to delete' });
    
    const addedState = useAppStore.getState();
    expect(addedState.tasks.length).toBe(1);
    const taskId = addedState.tasks[0].id;

    addedState.deleteTask(taskId);

    const deletedState = useAppStore.getState();
    expect(deletedState.tasks.length).toBe(0);
  });

  it('should update settings attributes', () => {
    const state = useAppStore.getState();
    expect(state.settings.dailyCapacity).toBe(8);

    state.updateSettings({
      dailyCapacity: 12,
      darkMode: true,
    });

    const updatedState = useAppStore.getState();
    expect(updatedState.settings.dailyCapacity).toBe(12);
    expect(updatedState.settings.darkMode).toBe(true);
    // Unchanged settings remain unchanged
    expect(updatedState.settings.zenModeNotifications).toBe(true);
  });
});
