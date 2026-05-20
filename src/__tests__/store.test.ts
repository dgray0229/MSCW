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
        zenDuration: 25,
        hapticsEnabled: true,
        dailyNotificationsEnabled: false,
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

  it('should archive completed board tasks and assign completedAt timestamp', () => {
    const state = useAppStore.getState();
    
    // Add completed task on board
    state.addTask({ title: 'Task 1', status: 'board', priority: 'must' });
    // Add uncompleted task on board
    state.addTask({ title: 'Task 2', status: 'board', priority: 'should' });
    // Add completed task in backlog
    state.addTask({ title: 'Task 3', status: 'backlog', priority: 'could' });

    let updatedState = useAppStore.getState();
    const task1Id = updatedState.tasks[0].id;
    const task2Id = updatedState.tasks[1].id;
    const task3Id = updatedState.tasks[2].id;

    // Mark task 1 as completed
    updatedState.updateTask(task1Id, { completed: true });
    // Mark task 3 as completed (but it is backlog)
    updatedState.updateTask(task3Id, { completed: true });

    // Call archiveCompletedTasks
    updatedState = useAppStore.getState();
    updatedState.archiveCompletedTasks();

    const finalState = useAppStore.getState();
    const task1 = finalState.tasks.find(t => t.id === task1Id);
    const task2 = finalState.tasks.find(t => t.id === task2Id);
    const task3 = finalState.tasks.find(t => t.id === task3Id);

    expect(task1?.status).toBe('archive');
    expect(task1?.completedAt).toBeDefined();
    
    expect(task2?.status).toBe('board');
    expect(task2?.completedAt).toBeUndefined();

    expect(task3?.status).toBe('backlog'); // backlog completed tasks should not be archived by day end board finalizer
  });

  it('should merge cloud data successfully using syncWithCloud', () => {
    const state = useAppStore.getState();
    
    const cloudTasks = [
      {
        id: 'cloud-task-1',
        title: 'Task from Cloud',
        points: 2,
        priority: 'must' as const,
        status: 'board' as const,
        completed: false,
        createdAt: new Date().toISOString(),
      }
    ];

    const cloudSettings = {
      dailyCapacity: 15,
      zenDuration: 30,
      hapticsEnabled: false,
      dailyNotificationsEnabled: true,
      zenModeNotifications: false,
      darkMode: true,
      autoArchiveWontTasks: false,
      hasSeenOnboarding: true,
      currentStreakDays: 5,
      longestStreakDays: 10,
    };

    state.syncWithCloud(cloudTasks, cloudSettings);

    const updatedState = useAppStore.getState();
    expect(updatedState.tasks).toEqual(cloudTasks);
    expect(updatedState.settings.dailyCapacity).toBe(15);
    expect(updatedState.settings.zenDuration).toBe(30);
    expect(updatedState.settings.hapticsEnabled).toBe(false);
    expect(updatedState.settings.darkMode).toBe(true);
    expect(updatedState.settings.currentStreakDays).toBe(5);
  });
});
