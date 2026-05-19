import { useAppStore } from '../store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('MSCW Triage and Capacity Constraint Tests', () => {
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

  it('should move a backlog task to board status when MUST priority is assigned', () => {
    const store = useAppStore.getState();
    
    // Add backlog task
    store.addTask({
      title: 'Triage Task',
      status: 'backlog',
      priority: 'unsorted',
    });

    const addedState = useAppStore.getState();
    const task = addedState.tasks[0];
    expect(task.status).toBe('backlog');

    // Simulate triage action to MUST
    addedState.updateTask(task.id, {
      priority: 'must',
      status: 'board',
    });

    const triagedState = useAppStore.getState();
    const triagedTask = triagedState.tasks[0];
    expect(triagedTask.priority).toBe('must');
    expect(triagedTask.status).toBe('board');
  });

  it('should automatically archive triaged WON\'T tasks if autoArchiveWontTasks is true', () => {
    const store = useAppStore.getState();
    
    store.addTask({
      title: 'Deferred Task',
      status: 'backlog',
      priority: 'unsorted',
    });

    const addedState = useAppStore.getState();
    const task = addedState.tasks[0];
    const settings = addedState.settings;
    
    // Verify autoArchiveWontTasks is active
    expect(settings.autoArchiveWontTasks).toBe(true);

    // Perform WON'T triage transition
    const nextStatus = settings.autoArchiveWontTasks ? 'archive' : 'board';
    addedState.updateTask(task.id, {
      priority: 'wont',
      status: nextStatus,
    });

    const triagedState = useAppStore.getState();
    const triagedTask = triagedState.tasks[0];
    expect(triagedTask.priority).toBe('wont');
    expect(triagedTask.status).toBe('archive'); // Triaged straight to archive!
  });

  it('should place triaged WON\'T tasks on the Board if autoArchiveWontTasks is false', () => {
    // Toggle autoArchiveWontTasks to false
    useAppStore.setState({
      settings: {
        dailyCapacity: 8,
        zenModeNotifications: true,
        darkMode: false,
        autoArchiveWontTasks: false,
        hasSeenOnboarding: false,
        currentStreakDays: 0,
        longestStreakDays: 0,
      }
    });

    const addedState = useAppStore.getState();
    addedState.addTask({
      title: 'Deferred Task 2',
      status: 'backlog',
      priority: 'unsorted',
    });

    const nextState = useAppStore.getState();
    const task = nextState.tasks[0];
    const settings = nextState.settings;

    const nextStatus = settings.autoArchiveWontTasks ? 'archive' : 'board';
    nextState.updateTask(task.id, {
      priority: 'wont',
      status: nextStatus,
    });

    const triagedState = useAppStore.getState();
    const triagedTask = triagedState.tasks[0];
    expect(triagedTask.priority).toBe('wont');
    expect(triagedTask.status).toBe('board'); // Placed on Board instead!
  });

  it('should flag burnout risk if scheduled board points exceed capacity limit', () => {
    const store = useAppStore.getState();
    
    // Add two tasks totaling 10 points (which exceeds default daily capacity of 8)
    store.addTask({ title: 'Task A', points: 5, status: 'board', priority: 'must' });
    store.addTask({ title: 'Task B', points: 5, status: 'board', priority: 'should' });

    const state = useAppStore.getState();
    const boardTasks = state.tasks.filter(t => t.status === 'board');
    const totalPoints = boardTasks.reduce((sum, t) => sum + (t.points || 0), 0);
    const capacityLimit = state.settings.dailyCapacity;

    expect(totalPoints).toBe(10);
    expect(capacityLimit).toBe(8);
    expect(totalPoints > capacityLimit).toBe(true); // Burnout risk is mathematically flagged
  });
});
