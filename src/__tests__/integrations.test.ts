import { useAppStore } from '../store';
import { IntegrationManager, logIntegrationEvent } from '../lib/integrationManager';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-notifications and Platform to run outside real device environment
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(null),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('test-notification-id'),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    DATE: 'date'
  }
}));

// Mock expo-calendar for native Calendar and iOS Reminders testing
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestRemindersPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCalendarsAsync: jest.fn().mockResolvedValue([
    { id: 'mock-calendar-id', title: 'Work Calendar', entityType: 'event' },
    { id: 'mock-reminders-id', title: 'MSCW', entityType: 'reminder' }
  ]),
  getRemindersAsync: jest.fn().mockResolvedValue([]),
  createReminderAsync: jest.fn().mockResolvedValue('test-reminder-id'),
  updateReminderAsync: jest.fn().mockResolvedValue(true),
  getEventsAsync: jest.fn().mockResolvedValue([]),
  createEventAsync: jest.fn().mockResolvedValue('test-event-id'),
  getDefaultCalendarSourceAsync: jest.fn().mockResolvedValue({ id: 'mock-source-id', name: 'Mock Source' }),
  createCalendarAsync: jest.fn().mockResolvedValue('new-list-id'),
  EntityTypes: {
    EVENT: 'event',
    REMINDER: 'reminder'
  },
  AccessLevel: {
    OWNER: 'owner'
  }
}));

// Mock Google Sign-In native APIs
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({ user: { email: 'test@google.com' } }),
    getTokens: jest.fn().mockResolvedValue({ accessToken: 'mock-access-token' }),
    signInSilently: jest.fn().mockResolvedValue({ user: { email: 'test@google.com' } })
  }
}));

// Mock global fetch for Google Tasks REST API endpoints
global.fetch = jest.fn().mockImplementation((url: string, options?: any) => {
  if (url.includes('/users/@me/lists')) {
    if (options?.method === 'POST') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'google-tasks-list-id', title: 'MSCW' })
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ items: [{ id: 'google-tasks-list-id', title: 'MSCW' }] })
    });
  }
  if (url.includes('/tasks')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ items: [] })
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  });
});

describe('MSCW Integration Engine Tests', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
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
        hasSeenOnboarding: true,
        currentStreakDays: 0,
        longestStreakDays: 0,
        sprintNumber: 1,
        sprintStartDate: new Date().toISOString(),
        sprintLengthDays: 7,
        googleTasksConnected: false,
        appleRemindersConnected: false,
        calendarConnected: false,
        selectedCalendarName: '',
        lastSyncedIntegrations: null,
        integrationLogs: [],
      },
    });
  });

  it('should initialize with integrations disabled', () => {
    const settings = useAppStore.getState().settings;
    expect(settings.googleTasksConnected).toBe(false);
    expect(settings.appleRemindersConnected).toBe(false);
    expect(settings.calendarConnected).toBe(false);
    expect(settings.integrationLogs).toEqual([]);
  });

  it('should connect and disconnect Google Tasks successfully', async () => {
    // Connect Google Tasks
    const success = await IntegrationManager.connectGoogleTasks();
    expect(success).toBe(true);
    
    let settings = useAppStore.getState().settings;
    expect(settings.googleTasksConnected).toBe(true);
    expect(settings.integrationLogs?.length).toBeGreaterThan(0);
    
    // Check if the success log event is recorded
    const successLog = settings.integrationLogs?.find(
      l => l.service === 'google_tasks' && l.status === 'success' && l.message.includes('authenticated')
    );
    expect(successLog).toBeDefined();
    expect(successLog?.message).toContain('authenticated');

    // Disconnect Google Tasks
    await IntegrationManager.disconnectGoogleTasks();
    settings = useAppStore.getState().settings;
    expect(settings.googleTasksConnected).toBe(false);
  });

  it('should connect and disconnect Apple Reminders successfully', async () => {
    // Connect Apple Reminders
    const success = await IntegrationManager.connectAppleReminders();
    expect(success).toBe(true);

    let settings = useAppStore.getState().settings;
    expect(settings.appleRemindersConnected).toBe(true);

    // Disconnect Apple Reminders
    await IntegrationManager.disconnectAppleReminders();
    settings = useAppStore.getState().settings;
    expect(settings.appleRemindersConnected).toBe(false);
  });

  it('should connect and disconnect Calendar successfully', async () => {
    // Connect Calendar
    const success = await IntegrationManager.connectCalendar('Work Calendar');
    expect(success).toBe(true);

    let settings = useAppStore.getState().settings;
    expect(settings.calendarConnected).toBe(true);
    expect(settings.selectedCalendarName).toBe('Work Calendar');

    // Disconnect Calendar
    await IntegrationManager.disconnectCalendar();
    settings = useAppStore.getState().settings;
    expect(settings.calendarConnected).toBe(false);
    expect(settings.selectedCalendarName).toBe('');
  });

  it('should cap the logs array to prevent memory leaks', () => {
    // Write 60 logs
    for (let i = 0; i < 60; i++) {
      logIntegrationEvent('system', 'info', `Log message index: ${i}`);
    }

    const settings = useAppStore.getState().settings;
    expect(settings.integrationLogs?.length).toBe(50); // Capped at 50
    expect(settings.integrationLogs?.[0].message).toBe('Log message index: 59'); // LIFO order
  });

  it('should execute sync cycle correctly and process active items', async () => {
    // Add tasks
    useAppStore.setState({
      tasks: [
        {
          id: 'task-1',
          title: 'Must-Have Task',
          points: 3,
          priority: 'must',
          status: 'today',
          completed: false,
          createdAt: new Date().toISOString(),
          phase: 'morning'
        },
        {
          id: 'task-2',
          title: 'Completed Task',
          points: 2,
          priority: 'should',
          status: 'today',
          completed: true,
          createdAt: new Date().toISOString(),
        }
      ]
    });

    // Connect integrations
    await IntegrationManager.connectCalendar('Personal Calendar');
    await IntegrationManager.connectGoogleTasks();

    // Trigger explicit sync
    const synced = await IntegrationManager.syncIntegrations(true);
    expect(synced).toBe(true);

    const settings = useAppStore.getState().settings;
    expect(settings.lastSyncedIntegrations).toBeDefined();

    // Verify logs contains calendar scheduled info
    const calendarLog = settings.integrationLogs?.find(
      l => l.service === 'calendar' && l.status === 'success' && l.message.includes('Must-Have Task')
    );
    expect(calendarLog).toBeDefined();
    expect(calendarLog?.message).toContain('09:00 AM');
  });
});
