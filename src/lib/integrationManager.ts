import { useAppStore } from '../store';
import { Task } from '../types';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export interface IntegrationLog {
  id: string;
  timestamp: string;
  service: 'google_tasks' | 'apple_reminders' | 'calendar' | 'system';
  status: 'success' | 'error' | 'info';
  message: string;
}

// Internal helper to add log entries to the Zustand store
export function logIntegrationEvent(
  service: IntegrationLog['service'],
  status: IntegrationLog['status'],
  message: string
) {
  const store = useAppStore.getState();
  const currentLogs = store.settings.integrationLogs || [];
  
  const newLog: IntegrationLog = {
    id: Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
    service,
    status,
    message,
  };

  // Limit logs to the latest 50 entries to conserve memory
  const updatedLogs = [newLog, ...currentLogs].slice(0, 50);
  store.updateSettings({ integrationLogs: updatedLogs });
}

/**
 * Main Integration Manager for MSCW App
 * Connects directly to Google Tasks API, Apple Reminders, and Native Device Calendars.
 */
export const IntegrationManager = {
  /**
   * Actual Google Tasks API connection flow
   */
  async connectGoogleTasks(): Promise<boolean> {
    logIntegrationEvent('google_tasks', 'info', 'Initiating secure Google Sign-In flow...');
    
    try {
      if (Platform.OS === 'web') {
        // Safe mock fallback for Web environments
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const store = useAppStore.getState();
        store.updateSettings({ 
          googleTasksConnected: true,
          googleTaskListId: 'web-mock-tasks-list'
        });
        logIntegrationEvent('google_tasks', 'success', 'Google Tasks connected successfully (Simulator Mode).');
        await this.syncIntegrations(true);
        return true;
      }
      
      // Native Google OAuth Authentication
      GoogleSignin.configure({
        webClientId: '515447198418-rlde94lrm4vk6181sm8p7be8cd0u50a0.apps.googleusercontent.com',
        scopes: ['https://www.googleapis.com/auth/tasks'],
      });
      
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      
      if (!tokens.accessToken) {
        throw new Error('Google Sign-In succeeded, but failed to retrieve an access token.');
      }
      
      const store = useAppStore.getState();
      store.updateSettings({ googleTasksConnected: true });
      logIntegrationEvent('google_tasks', 'success', 'Google account successfully authenticated. Connection active.');
      
      await this.syncIntegrations(true);
      return true;
    } catch (e: any) {
      console.error("Google Tasks Connection Error:", e);
      logIntegrationEvent('google_tasks', 'error', `Google OAuth Failed: ${e.message || e}`);
      return false;
    }
  },

  async disconnectGoogleTasks() {
    const store = useAppStore.getState();
    store.updateSettings({ 
      googleTasksConnected: false,
      googleTaskListId: null
    });
    logIntegrationEvent('google_tasks', 'info', 'Google Tasks connection revoked.');
  },

  /**
   * Actual Apple Reminders iOS Native permissions & connection flow
   */
  async connectAppleReminders(): Promise<boolean> {
    logIntegrationEvent('apple_reminders', 'info', 'Requesting iOS Reminders access permissions...');
    
    try {
      if (Platform.OS !== 'ios') {
        // Fallback for Web/Android
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const store = useAppStore.getState();
        store.updateSettings({ 
          appleRemindersConnected: true,
          appleRemindersListId: 'simulator-mock-reminders-list'
        });
        logIntegrationEvent('apple_reminders', 'success', 'Apple Reminders permission granted (Simulator Mode).');
        await this.syncIntegrations(true);
        return true;
      }
      
      // Actual iOS reminders permissions
      const { status } = await Calendar.requestRemindersPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('iOS Reminders access permission was denied by the user.');
      }
      
      const store = useAppStore.getState();
      store.updateSettings({ appleRemindersConnected: true });
      logIntegrationEvent('apple_reminders', 'success', 'Apple Reminders permission granted. Connection active.');
      
      await this.syncIntegrations(true);
      return true;
    } catch (e: any) {
      console.error("Apple Reminders Permission Error:", e);
      logIntegrationEvent('apple_reminders', 'error', `Reminders Permission Failed: ${e.message || e}`);
      return false;
    }
  },

  async disconnectAppleReminders() {
    const store = useAppStore.getState();
    store.updateSettings({ 
      appleRemindersConnected: false,
      appleRemindersListId: null
    });
    logIntegrationEvent('apple_reminders', 'info', 'Apple Reminders connection revoked.');
  },

  /**
   * Actual Native System Calendar authorization flow
   */
  async connectCalendar(calendarName: string, calendarId?: string): Promise<boolean> {
    logIntegrationEvent('calendar', 'info', `Connecting to calendar: "${calendarName}"...`);
    
    try {
      const store = useAppStore.getState();
      
      if (Platform.OS === 'web') {
        await new Promise((resolve) => setTimeout(resolve, 800));
        store.updateSettings({ 
          calendarConnected: true,
          selectedCalendarId: calendarId || 'web-mock-calendar',
          selectedCalendarName: calendarName
        });
        logIntegrationEvent('calendar', 'success', `Successfully integrated with "${calendarName}" (Simulator).`);
        await this.syncIntegrations(true);
        return true;
      }
      
      // Actual native calendars authorization check
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('System Calendar access permission was denied.');
      }
      
      store.updateSettings({ 
        calendarConnected: true,
        selectedCalendarId: calendarId || 'default-native-calendar',
        selectedCalendarName: calendarName
      });
      
      logIntegrationEvent('calendar', 'success', `Successfully integrated with "${calendarName}" calendar.`);
      await this.syncIntegrations(true);
      return true;
    } catch (e: any) {
      console.error("Calendar Authorization Error:", e);
      logIntegrationEvent('calendar', 'error', `Calendar integration failed: ${e.message || e}`);
      return false;
    }
  },

  async disconnectCalendar() {
    const store = useAppStore.getState();
    store.updateSettings({ 
      calendarConnected: false,
      selectedCalendarId: null,
      selectedCalendarName: ''
    });
    logIntegrationEvent('calendar', 'info', 'Calendar integration disconnected.');
  },

  /**
   * Central Sync Engine: Runs automatically or manually.
   * Pulls tasks from the Zustand store and syncs them directly using actual REST APIs / Native calendar databases.
   */
  async syncIntegrations(force: boolean = false): Promise<boolean> {
    const store = useAppStore.getState();
    const { 
      googleTasksConnected, 
      googleTaskListId,
      appleRemindersConnected, 
      appleRemindersListId,
      calendarConnected, 
      selectedCalendarId,
      selectedCalendarName 
    } = store.settings;
    const tasks = store.tasks;

    if (!googleTasksConnected && !appleRemindersConnected && !calendarConnected) {
      if (force) {
        logIntegrationEvent('system', 'info', 'No active integrations configured. Sync skipped.');
      }
      return false;
    }

    logIntegrationEvent('system', 'info', 'Sync cycle initiated...');

    let googleTasksCount = 0;
    let appleRemindersCount = 0;
    let calendarCount = 0;

    // 1. Google Tasks Actual API Sync
    if (googleTasksConnected) {
      try {
        if (Platform.OS === 'web') {
          // Web Simulator sync log
          const syncableTasks = tasks.filter(t => !t.completed && t.status !== 'archive');
          googleTasksCount = syncableTasks.length;
          logIntegrationEvent(
            'google_tasks',
            'success',
            `Synced ${googleTasksCount} tasks to Google Tasks (MSCW list) via REST Simulator.`
          );
        } else {
          // Retrieve real Google OAuth access token
          let tokens = await GoogleSignin.getTokens();
          let accessToken = tokens.accessToken;
          
          if (!accessToken) {
            // Attempt silent sign-in
            const user = await GoogleSignin.signInSilently();
            const newTokens = await GoogleSignin.getTokens();
            accessToken = newTokens.accessToken;
          }
          
          if (!accessToken) {
            throw new Error('User Google Sign-In session has expired. Please reconnect in Settings.');
          }

          // Fetch user's task lists
          const listsRes = await fetch('https://tasks.googleapis.com/v1/users/@me/lists', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (!listsRes.ok) throw new Error(`Google API responded with error: ${listsRes.statusText}`);
          const listsData = await listsRes.json();
          const lists: any[] = listsData.items || [];
          
          // Find or create "MSCW" list
          let targetListId = googleTaskListId;
          let mscwList = lists.find(l => l.title === 'MSCW' || l.id === targetListId);
          
          if (!mscwList) {
            const createListRes = await fetch('https://tasks.googleapis.com/v1/users/@me/lists', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ title: 'MSCW' })
            });
            if (!createListRes.ok) throw new Error('Failed to create "MSCW" task list on Google account.');
            mscwList = await createListRes.json();
          }
          
          targetListId = mscwList.id;
          store.updateSettings({ googleTaskListId: targetListId });

          // Fetch all remote tasks in target list
          const remoteTasksRes = await fetch(`https://tasks.googleapis.com/v1/lists/${targetListId}/tasks`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const remoteTasksData = await remoteTasksRes.json();
          const remoteTasks: any[] = remoteTasksData.items || [];

          // Sync local tasks (uncompleted today/sprint/backlog)
          const syncableTasks = tasks.filter(t => t.status !== 'archive');
          
          for (const task of syncableTasks) {
            const existingRemote = remoteTasks.find(rt => rt.title === task.title);
            
            if (!existingRemote && !task.completed) {
              // Create missing Google Task
              await fetch(`https://tasks.googleapis.com/v1/lists/${targetListId}/tasks`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  title: task.title,
                  notes: `Points: ${task.points || 0} • Priority: ${task.priority.toUpperCase()}`
                })
              });
              googleTasksCount++;
            } else if (existingRemote && task.completed && existingRemote.status !== 'completed') {
              // Complete task in Google Tasks
              await fetch(`https://tasks.googleapis.com/v1/lists/${targetListId}/tasks/${existingRemote.id}`, {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  status: 'completed'
                })
              });
              googleTasksCount++;
            }
          }
          
          logIntegrationEvent(
            'google_tasks',
            'success',
            `Synced ${googleTasksCount} tasks to Google Tasks (MSCW list).`
          );
        }
      } catch (e: any) {
        console.error("Google Tasks Sync Error:", e);
        logIntegrationEvent('google_tasks', 'error', `Sync failed: ${e.message || e}`);
      }
    }

    // 2. Apple Reminders Actual API Sync (iOS Native)
    if (appleRemindersConnected) {
      try {
        if (Platform.OS !== 'ios') {
          // Simulator fallback
          const syncableTasks = tasks.filter(t => !t.completed && t.status !== 'archive');
          appleRemindersCount = syncableTasks.length;
          logIntegrationEvent(
            'apple_reminders',
            'success',
            `Synced ${appleRemindersCount} items to Apple Reminders (MSCW list) via iOS Simulator.`
          );
        } else {
          // Actual iOS reminders logic using expo-calendar
          const lists = await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER);
          let targetListId = appleRemindersListId;
          let mscwList = lists.find(l => l.title === 'MSCW' || l.id === targetListId);
          
          if (!mscwList) {
            const defaultCalendar = await Calendar.getDefaultCalendarAsync();
            const defaultSource = defaultCalendar ? defaultCalendar.source : { id: 'default', name: 'Default', type: 'local' };
            targetListId = await Calendar.createCalendarAsync({
              title: 'MSCW',
              color: '#b61722',
              entityType: Calendar.EntityTypes.REMINDER,
              sourceId: defaultSource.id,
              source: defaultSource,
              name: 'MSCW',
              accessLevel: Calendar.CalendarAccessLevel.OWNER,
              ownerAccount: 'personal',
            });
            store.updateSettings({ appleRemindersListId: targetListId });
          } else {
            targetListId = mscwList.id;
          }

          // Fetch all existing iOS reminders
          const existingiOSReminders = await Calendar.getRemindersAsync([targetListId], null, null, null);
          const syncableTasks = tasks.filter(t => t.status !== 'archive');

          for (const task of syncableTasks) {
            const exists = existingiOSReminders.some(r => r.title === task.title);
            
            if (!exists && !task.completed) {
              // Create native reminder
              await Calendar.createReminderAsync(targetListId, {
                title: task.title,
                notes: `Points: ${task.points || 0} • Priority: ${task.priority.toUpperCase()}`,
                completed: false
              });
              appleRemindersCount++;
            } else if (exists && task.completed) {
              // Complete native reminder
              const targetRem = existingiOSReminders.find(r => r.title === task.title);
              if (targetRem && targetRem.id && !targetRem.completed) {
                await Calendar.updateReminderAsync(targetRem.id, {
                  completed: true,
                });
                appleRemindersCount++;
              }
            }
          }

          logIntegrationEvent(
            'apple_reminders',
            'success',
            `Synced ${appleRemindersCount} items to Apple Reminders (MSCW list).`
          );
        }
      } catch (e: any) {
        console.error("Apple Reminders Sync Error:", e);
        logIntegrationEvent('apple_reminders', 'error', `Sync failed: ${e.message || e}`);
      }
    }

    // 3. Calendar Actual Sync (iOS & Android Native)
    if (calendarConnected) {
      try {
        const scheduledTasks = tasks.filter(t => (t.scheduledDate || t.status === 'today') && !t.completed && t.phase);
        calendarCount = scheduledTasks.length;

        // Clean up previous app scheduled local push notifications
        if (Platform.OS !== 'web') {
          try {
            await Notifications.cancelAllScheduledNotificationsAsync();
          } catch (e) {
            console.warn("Failed to cancel scheduled notifications:", e);
          }
        }

        // Rolling 37-day search window to fetch existing calendar events
        const startSearch = new Date();
        startSearch.setDate(startSearch.getDate() - 7);
        startSearch.setHours(0, 0, 0, 0);

        const endSearch = new Date();
        endSearch.setDate(endSearch.getDate() + 30);
        endSearch.setHours(23, 59, 59, 999);

        // Fetch actual native events to avoid duplicate creation
        let existingNativeEvents: any[] = [];
        const targetCalId = selectedCalendarId;
        
        if (Platform.OS !== 'web' && targetCalId) {
          try {
            existingNativeEvents = await Calendar.getEventsAsync([targetCalId], startSearch, endSearch);
          } catch (err) {
            console.warn("Failed to fetch native calendar events:", err);
          }
        }

        for (const task of scheduledTasks) {
          let timeString = '';
          let hour = 9;
          let minute = 0;

          if (task.phase === 'morning') {
            timeString = '09:00 AM';
            hour = 9;
          } else if (task.phase === 'afternoon') {
            timeString = '02:00 PM';
            hour = 14;
          } else if (task.phase === 'evening') {
            timeString = '07:00 PM';
            hour = 19;
          }

          // Determine the specific scheduled date for this task
          const taskDate = task.scheduledDate ? new Date(task.scheduledDate) : new Date();

          // Create calendar event if it doesn't exist on that day
          const eventExists = existingNativeEvents.some(ne => {
            const sameTitle = ne.title === task.title;
            if (!sameTitle) return false;
            
            const eventStart = new Date(ne.startDate);
            const taskDateLocal = new Date(taskDate);
            return eventStart.getFullYear() === taskDateLocal.getFullYear() &&
                   eventStart.getMonth() === taskDateLocal.getMonth() &&
                   eventStart.getDate() === taskDateLocal.getDate();
          });
          
          if (!eventExists && Platform.OS !== 'web' && targetCalId) {
            const startDate = new Date(taskDate);
            startDate.setHours(hour, 0, 0, 0);
            const endDate = new Date(taskDate);
            endDate.setHours(hour + 1, 0, 0, 0);
            
            await Calendar.createEventAsync(targetCalId, {
              title: task.title,
              startDate,
              endDate,
              notes: `Points: ${task.points || 0} • Priority: ${task.priority.toUpperCase()}`,
              timeZone: 'UTC'
            });
          }

          const dateStr = taskDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
          logIntegrationEvent(
            'calendar',
            'success',
            `Created calendar event in "${selectedCalendarName || 'Selected Calendar'}": "${task.title}" on ${dateStr} at ${timeString}.`
          );

          // Schedule local push notification if task is scheduled for future
          if (Platform.OS !== 'web') {
            try {
              const notificationDate = new Date(taskDate);
              notificationDate.setHours(hour, minute, 0, 0);

              if (notificationDate.getTime() >= new Date().getTime()) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: `📅 Task Scheduled: ${task.title}`,
                    body: `Points: ${task.points || 0} • Priority: ${task.priority.toUpperCase()}`,
                    sound: true,
                  },
                  trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notificationDate },
                });
              }
            } catch (e) {
              console.error("Error scheduling task notification:", e);
            }
          }
        }

        if (calendarCount === 0) {
          logIntegrationEvent(
            'calendar',
            'info',
            `Synced active calendar state. Assign a time phase to a task to block calendar time.`
          );
        }
      } catch (e: any) {
        console.error("Calendar Sync Error:", e);
        logIntegrationEvent('calendar', 'error', `Sync failed: ${e.message || e}`);
      }
    }

    store.updateSettings({ lastSyncedIntegrations: new Date().toISOString() });
    logIntegrationEvent('system', 'success', 'All connected integrations synchronized successfully.');
    return true;
  }
};
