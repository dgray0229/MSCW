import { useEffect } from 'react';
import { useAppStore } from '../store';

export function useCalendarGraduation() {
  const tasks = useAppStore(state => state.tasks);
  const updateTask = useAppStore(state => state.updateTask);
  const hasHydrated = useAppStore(state => state._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;

    const todayStr = getLocalDateString();
    
    // Find active tasks scheduled for today that aren't on the 'today' board yet
    const tasksToGraduate = tasks.filter(
      t => t.scheduledDate === todayStr && t.status !== 'today' && t.status !== 'archive' && !t.completed
    );

    if (tasksToGraduate.length > 0) {
      console.log(`Graduating ${tasksToGraduate.length} tasks scheduled for today:`, tasksToGraduate.map(t => t.title));
      tasksToGraduate.forEach(t => {
        updateTask(t.id, { status: 'today' });
      });
    }
  }, [tasks, hasHydrated]);
}

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}
