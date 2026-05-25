import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { IntegrationManager } from '../lib/integrationManager';

export function useIntegrationSync() {
  const tasks = useAppStore(state => state.tasks);
  const settings = useAppStore(state => state.settings);
  const hasHydrated = useAppStore(state => state._hasHydrated);
  
  const lastState = useRef<string>('');

  useEffect(() => {
    if (!hasHydrated) return;

    // Build a compact, relevant string of task state to monitor changes
    const stateStr = JSON.stringify({
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        phase: t.phase,
        priority: t.priority,
        points: t.points,
        status: t.status
      })),
      googleConnected: settings.googleTasksConnected,
      appleConnected: settings.appleRemindersConnected,
      calendarConnected: settings.calendarConnected,
    });

    // Skip the very first run after hydration to prevent double-syncing on initial load
    if (lastState.current && lastState.current !== stateStr) {
      const timer = setTimeout(() => {
        IntegrationManager.syncIntegrations(false);
      }, 1000); // 1-second debounce
      
      lastState.current = stateStr;
      return () => clearTimeout(timer);
    } else {
      lastState.current = stateStr;
    }
  }, [
    tasks,
    settings.googleTasksConnected,
    settings.appleRemindersConnected,
    settings.calendarConnected,
    hasHydrated
  ]);
}
