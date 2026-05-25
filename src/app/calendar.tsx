import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, Platform, useWindowDimensions } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useAppStore } from '../store';
import { SafeScreen } from '../components/SafeScreen';
import { AdaptiveGlass } from '../components/ui/AdaptiveGlass';
import { Priority, Task } from '../types';
import { useAccentTheme } from '../hooks/useAccentTheme';
import * as Haptics from 'expo-haptics';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  CalendarDays,
  Sparkles,
  CheckSquare,
  AlertTriangle,
  Square
} from 'lucide-react-native';

const PRIORITY_COLORS = {
  must: { text: 'text-primary', bg: 'bg-red-500/10 dark:bg-red-950/40', border: 'border-l-4 border-l-primary' },
  should: { text: 'text-secondary', bg: 'bg-amber-600/10 dark:bg-amber-950/40', border: 'border-l-4 border-l-secondary' },
  could: { text: 'text-tertiary', bg: 'bg-teal-600/10 dark:bg-teal-950/40', border: 'border-l-4 border-l-tertiary' },
  wont: { text: 'text-slate-650 dark:text-slate-300', bg: 'bg-surface-container-high/40', border: 'border-l-4 border-l-outline' },
  unsorted: { text: 'text-slate-700/80 dark:text-slate-200/80', bg: 'bg-surface-container', border: 'border-l-4 border-l-outline-variant/60' }
};

export default function CalendarPage() {
  const tasks = useAppStore(state => state.tasks);
  const settings = useAppStore(state => state.settings);
  const addTask = useAppStore(state => state.addTask);
  const updateTask = useAppStore(state => state.updateTask);

  const [currentDate, setCurrentDate] = useState(new Date());
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = useAccentTheme();
  
  // Initialize to local today formatted as YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDateStr, setSelectedDateStr] = useState(getTodayString());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('must');
  const [newTaskPoints, setNewTaskPoints] = useState<number>(1);
  const [searchBacklogText, setSearchBacklogText] = useState('');
  const [selectedQuickTags, setSelectedQuickTags] = useState<string[]>([]);

  // 1. Calendar grid logic (month/year layout)
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays = useMemo(() => {
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNum, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: true });
    }

    // Next month padding
    const totalSlots = 42; // 6 rows
    const remainingSlots = totalSlots - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth, daysInMonth, firstDayIndex]);

  // Aggregate points by scheduledDate to compute capacity metrics
  const datePointsMap = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach(task => {
      if (task.scheduledDate && !task.completed && task.status !== 'archive') {
        map[task.scheduledDate] = (map[task.scheduledDate] || 0) + (task.points || 0);
      }
    });
    return map;
  }, [tasks]);

  // Unscheduled backlog tasks (sprint or backlog)
  const unscheduledTasks = useMemo(() => {
    return tasks.filter(t => !t.scheduledDate && !t.completed && (t.status === 'sprint' || t.status === 'backlog'));
  }, [tasks]);

  const filteredUnscheduledTasks = useMemo(() => {
    return unscheduledTasks.filter(t => 
      t.title.toLowerCase().includes(searchBacklogText.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchBacklogText.toLowerCase()))
    );
  }, [unscheduledTasks, searchBacklogText]);

  // Tasks scheduled for the currently selected date
  const scheduledTasksForSelectedDate = useMemo(() => {
    return tasks.filter(t => t.scheduledDate === selectedDateStr && t.status !== 'archive');
  }, [tasks, selectedDateStr]);

  const tasksByPhase = useMemo(() => {
    return {
      morning: scheduledTasksForSelectedDate.filter(t => t.phase === 'morning'),
      afternoon: scheduledTasksForSelectedDate.filter(t => t.phase === 'afternoon'),
      evening: scheduledTasksForSelectedDate.filter(t => t.phase === 'evening'),
      unscheduled: scheduledTasksForSelectedDate.filter(t => !t.phase)
    };
  }, [scheduledTasksForSelectedDate]);

  const selectedDateTotalPoints = useMemo(() => {
    return scheduledTasksForSelectedDate.reduce((sum, t) => sum + (t.completed ? 0 : (t.points || 0)), 0);
  }, [scheduledTasksForSelectedDate]);

  const handlePrevMonth = () => {
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDayPress = (dateStr: string) => {
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDateStr(dateStr);
  };

  const scheduleTaskToSelectedDate = (taskId: string) => {
    if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const todayStr = getTodayString();
    const newStatus = selectedDateStr === todayStr ? 'today' : 'sprint';

    updateTask(taskId, { 
      scheduledDate: selectedDateStr,
      status: newStatus
    });
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (settings.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const todayStr = getTodayString();
    const newStatus = selectedDateStr === todayStr ? 'today' : 'sprint';

    addTask({
      title: newTaskTitle.trim(),
      points: newTaskPoints,
      priority: newTaskPriority,
      scheduledDate: selectedDateStr,
      status: newStatus,
      type: 'Feature',
      tags: selectedQuickTags
    });

    setNewTaskTitle('');
    setSelectedQuickTags([]);
  };

  const handleRemoveFromSchedule = (taskId: string) => {
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateTask(taskId, { 
      scheduledDate: undefined,
      phase: undefined,
      status: 'sprint'
    });
  };

  const cycleTaskPhase = (taskId: string, currentPhase?: string) => {
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextPhase = !currentPhase ? 'morning' : currentPhase === 'morning' ? 'afternoon' : currentPhase === 'afternoon' ? 'evening' : undefined;
    updateTask(taskId, { phase: nextPhase });
  };

  const getCapacityColorClass = (points: number) => {
    if (points === 0) return 'bg-slate-200/30 dark:bg-slate-800/30';
    if (points <= settings.dailyCapacity / 2) return 'bg-green-500';
    if (points <= settings.dailyCapacity) return 'bg-secondary';
    return 'bg-primary animate-pulse';
  };

  // Reusable component render functions inside main component context
  const renderCalendarCard = () => {
    return (
      <AdaptiveGlass className="rounded-3xl p-5 shadow-sm">
        {/* Month Controller */}
        <View className="flex-row items-center justify-between mb-6 px-1">
          <Text className="text-xl font-black text-on-surface">
            {monthNames[currentMonth]} {currentYear}
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentDate(new Date());
                setSelectedDateStr(getTodayString());
              }}
              className="px-3 py-2 rounded-2xl bg-surface-container border border-outline-variant items-center justify-center active:scale-95"
            >
              <Text className="text-xs font-black text-primary uppercase tracking-wider">Today</Text>
            </Pressable>
            
            <Pressable 
              onPress={handlePrevMonth}
              className="w-10 h-10 rounded-2xl bg-surface-container border border-outline-variant items-center justify-center active:scale-95"
            >
              <ChevronLeft size={20} color={theme.primary} />
            </Pressable>
            <Pressable 
              onPress={handleNextMonth}
              className="w-10 h-10 rounded-2xl bg-surface-container border border-outline-variant items-center justify-center active:scale-95"
            >
              <ChevronRight size={20} color={theme.primary} />
            </Pressable>
          </View>
        </View>

        {/* Weekday Labels */}
        <View className="flex-row mb-3">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <Text key={idx} className="text-xs font-black text-slate-650 dark:text-slate-300 w-[14.28%] text-center uppercase tracking-widest">
              {day}
            </Text>
          ))}
        </View>

        {/* Days Grid - Pixel Perfect 7-column layout */}
        <View className="flex-row flex-wrap justify-start">
          {calendarDays.map((day, idx) => {
            const isSelected = day.dateStr === selectedDateStr;
            const isToday = day.dateStr === getTodayString();
            const scheduledPoints = datePointsMap[day.dateStr] || 0;
            const isOverCapacity = scheduledPoints > settings.dailyCapacity;

            // Fetch tasks for this day to show heat-map dots
            const dayTasks = tasks.filter(t => t.scheduledDate === day.dateStr && t.status !== 'archive');
            const mustCount = dayTasks.filter(t => t.priority === 'must').length;
            const shouldCount = dayTasks.filter(t => t.priority === 'should').length;
            const couldCount = dayTasks.filter(t => t.priority === 'could').length;

            return (
              <Pressable
                key={idx}
                onPress={() => handleDayPress(day.dateStr)}
                className={`w-[14.28%] h-14 items-center justify-center relative active:scale-95 my-0.5 rounded-2xl ${
                  isSelected ? 'bg-primary shadow-md border border-primary/20' :
                  isToday ? 'border-2 border-outline-variant/60 bg-surface-container/30' :
                  isOverCapacity ? 'border-2 border-primary/40 bg-primary/5' : 'bg-transparent'
                }`}
              >
                <Text 
                  className={`text-sm font-bold ${
                    isSelected ? 'text-on-primary font-black' :
                    day.isCurrentMonth ? 'text-on-surface' : 'text-slate-400/40 dark:text-slate-500/40'
                  }`}
                >
                  {day.dayNum}
                </Text>

                {/* Priority dots heat-map under date number */}
                {dayTasks.length > 0 && (
                  <View className="flex-row gap-0.5 justify-center mt-1 w-full max-w-[80%] overflow-hidden">
                    {Array.from({ length: Math.min(mustCount, 3) }).map((_, i) => (
                      <View key={`must-${i}`} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                    ))}
                    {Array.from({ length: Math.min(shouldCount, 3 - Math.min(mustCount, 3)) }).map((_, i) => (
                      <View key={`should-${i}`} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : 'bg-secondary'}`} />
                    ))}
                    {Array.from({ length: Math.min(couldCount, 3 - Math.min(mustCount, 3) - Math.min(shouldCount, 3 - Math.min(mustCount, 3))) }).map((_, i) => (
                      <View key={`could-${i}`} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/60' : 'bg-tertiary'}`} />
                    ))}
                  </View>
                )}

                {/* Over Capacity ring warning dot if not selected */}
                {isOverCapacity && !isSelected && (
                  <View className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </Pressable>
            );
          })}
        </View>
      </AdaptiveGlass>
    );
  };

  const renderTaskRow = (task: Task, phase: 'morning' | 'afternoon' | 'evening' | undefined) => {
    return (
      <View key={task.id} className={`p-3.5 rounded-xl border border-outline-variant flex-row justify-between items-center bg-surface-container/20 active:opacity-90 ${PRIORITY_COLORS[task.priority].border}`}>
        <View className="flex-row items-center flex-1 mr-4">
          <Pressable 
            onPress={() => {
              if (settings.hapticsEnabled) {
                Haptics.notificationAsync(task.completed ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success);
              }
              updateTask(task.id, { 
                completed: !task.completed, 
                completedAt: !task.completed ? new Date().toISOString() : undefined 
              });
            }}
            className="mr-3 p-1 rounded-lg hover:bg-surface-container-high"
          >
            {task.completed ? (
              <CheckSquare size={20} color={theme.primary} />
            ) : (
              <Square size={20} color="#79747e" />
            )}
          </Pressable>
          <View className="flex-1">
            <Text className={`font-bold text-on-surface text-sm ${task.completed ? 'line-through opacity-65 text-slate-650 dark:text-slate-300 dark:opacity-75' : ''}`}>{task.title}</Text>
            <View className="flex-row items-center gap-2 mt-1">
              <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest">{task.points || 0} pts</Text>
              <View className="w-1 h-1 rounded-full bg-outline-variant" />
              <Pressable onPress={() => cycleTaskPhase(task.id, phase)}>
                <Text className="text-xs font-bold text-secondary uppercase tracking-widest">Reschedule Phase</Text>
              </Pressable>
            </View>
          </View>
        </View>
        <Pressable 
          onPress={() => handleRemoveFromSchedule(task.id)}
          className="bg-surface-container-high px-2.5 py-1.5 rounded-xl border border-outline-variant/60 active:scale-95"
        >
          <Text className="text-xs font-black text-primary uppercase tracking-widest">Remove</Text>
        </Pressable>
      </View>
    );
  };

  const renderScheduleList = () => {
    return (
      <AdaptiveGlass className="rounded-3xl p-5 shadow-sm mb-6 gap-6">
        {/* Phase: Morning */}
        <View className="gap-3">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs font-black uppercase text-slate-650 dark:text-slate-300 tracking-wider">Morning (☀️ AM)</Text>
            <View className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
            <Text className="text-xs text-slate-650 dark:text-slate-300 font-semibold">{tasksByPhase.morning.length} scheduled</Text>
          </View>
          
          {tasksByPhase.morning.map(t => renderTaskRow(t, 'morning'))}
          {tasksByPhase.morning.length === 0 && (
            <View className="py-4 items-center justify-center border border-dashed border-outline-variant/60 rounded-xl bg-surface-container/20">
              <Text className="text-xs font-bold text-slate-650 dark:text-slate-300 uppercase tracking-widest">No morning tasks</Text>
            </View>
          )}
        </View>

        <View className="h-[1px] bg-outline-variant/40" />

        {/* Phase: Afternoon */}
        <View className="gap-3">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs font-black uppercase text-slate-650 dark:text-slate-300 tracking-wider">Afternoon (☕️ PM)</Text>
            <View className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
            <Text className="text-xs text-slate-650 dark:text-slate-300 font-semibold">{tasksByPhase.afternoon.length} scheduled</Text>
          </View>
          
          {tasksByPhase.afternoon.map(t => renderTaskRow(t, 'afternoon'))}
          {tasksByPhase.afternoon.length === 0 && (
            <View className="py-4 items-center justify-center border border-dashed border-outline-variant/60 rounded-xl bg-surface-container/20">
              <Text className="text-xs font-bold text-slate-650 dark:text-slate-300 uppercase tracking-widest">No afternoon tasks</Text>
            </View>
          )}
        </View>

        <View className="h-[1px] bg-outline-variant/40" />

        {/* Phase: Evening */}
        <View className="gap-3">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs font-black uppercase text-slate-650 dark:text-slate-300 tracking-wider">Evening (🌙 EVE)</Text>
            <View className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
            <Text className="text-xs text-slate-650 dark:text-slate-300 font-semibold">{tasksByPhase.evening.length} scheduled</Text>
          </View>
          
          {tasksByPhase.evening.map(t => renderTaskRow(t, 'evening'))}
          {tasksByPhase.evening.length === 0 && (
            <View className="py-4 items-center justify-center border border-dashed border-outline-variant/60 rounded-xl bg-surface-container/20">
              <Text className="text-xs font-bold text-slate-650 dark:text-slate-300 uppercase tracking-widest">No evening tasks</Text>
            </View>
          )}
        </View>

        <View className="h-[1px] bg-outline-variant/40" />

        {/* Untimed Scheduled Tasks */}
        <View className="gap-3">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs font-black uppercase text-slate-650 dark:text-slate-300 tracking-wider">Unscheduled Hours (⏱️ Untimed)</Text>
            <View className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
            <Text className="text-xs text-slate-650 dark:text-slate-300 font-semibold">{tasksByPhase.unscheduled.length} scheduled</Text>
          </View>
          
          {tasksByPhase.unscheduled.map(t => renderTaskRow(t, undefined))}
          {tasksByPhase.unscheduled.length === 0 && (
            <View className="py-4 items-center justify-center border border-dashed border-outline-variant/60 rounded-xl bg-surface-container/20">
              <Text className="text-xs font-bold text-slate-650 dark:text-slate-300 uppercase tracking-widest">No untimed tasks</Text>
            </View>
          )}
        </View>
      </AdaptiveGlass>
    );
  };

  const renderQuickAddTask = () => {
    return (
      <AdaptiveGlass className="rounded-3xl p-5 shadow-sm mb-6 gap-4">
        <Text className="text-primary font-bold uppercase tracking-widest text-xs ml-1">Quick Add Task to Day</Text>
        <TextInput
          accessibilityLabel="Add Task Title"
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
          placeholder="Type task title..."
          placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
          className="bg-surface-container-high px-4 py-3 rounded-2xl text-on-surface text-sm font-semibold border border-outline-variant focus:border-primary"
        />

        <View className="w-full">
          <Text className="text-xs font-black text-slate-600 dark:text-slate-350 uppercase tracking-widest mb-2 ml-1">Complexity (Fibonacci Points)</Text>
          <View className="flex-row gap-1.5 flex-wrap">
            {[1, 2, 3, 5, 8].map(p => {
              const isPointSelected = newTaskPoints === p;
              const effortLabel = p === 1 ? 'Tiny' : p === 2 ? 'Small' : p === 3 ? 'Medium' : p === 5 ? 'Large' : 'Epic';
              return (
                <Pressable
                  key={p}
                  onPress={() => {
                    if (settings.hapticsEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setNewTaskPoints(p);
                  }}
                  style={isPointSelected ? { backgroundColor: theme.primary + '15', borderColor: theme.primary } : undefined}
                  className={`flex-1 min-w-[55px] py-2.5 rounded-2xl border active:scale-95 flex-col justify-center items-center ${isPointSelected ? 'border-primary' : 'bg-surface-container-high border-outline-variant'}`}
                >
                  <Text style={isPointSelected ? { color: theme.primary } : undefined} className={`font-black text-sm ${isPointSelected ? '' : 'text-slate-650 dark:text-slate-300'}`}>
                    {p}pt
                  </Text>
                  <Text style={isPointSelected ? { color: theme.primary } : undefined} className={`text-[8px] font-black uppercase tracking-wider ${isPointSelected ? 'opacity-80' : 'text-slate-550'}`}>
                    {effortLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

          <View className="flex-1 min-w-[160px] flex-row gap-1">
            {(['must', 'should', 'could'] as Priority[]).map(p => (
              <Pressable
                key={p}
                onPress={() => setNewTaskPriority(p)}
                className={`flex-1 py-2.5 rounded-2xl items-center border capitalize ${
                  newTaskPriority === p 
                    ? (p === 'must' ? 'bg-primary border-primary' : p === 'should' ? 'bg-secondary border-secondary' : 'bg-tertiary border-tertiary')
                    : 'bg-surface-container-high border-outline-variant'
                }`}
              >
                <Text className={`text-xs font-black uppercase tracking-widest ${
                  newTaskPriority === p 
                    ? (p === 'must' ? 'text-on-primary' : p === 'should' ? 'text-on-secondary' : 'text-on-tertiary')
                    : 'text-slate-650 dark:text-slate-300'
                }`}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Quick Tag Picker */}
        <View className="gap-2">
          <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest ml-1">Suggested Tags</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {['Work', 'Life', 'Refactor', 'Design', 'Urgent'].map(tag => {
              const isSelected = selectedQuickTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => {
                    if (settings.hapticsEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setSelectedQuickTags(prev => 
                      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                    );
                  }}
                  style={isSelected ? { backgroundColor: theme.primary + '15', borderColor: theme.primary } : undefined}
                  className={`px-3 py-1.5 rounded-full border active:scale-95 ${
                    isSelected ? 'border-primary' : 'bg-surface-container border-outline-variant/40'
                  }`}
                >
                  <Text style={isSelected ? { color: theme.primary } : undefined} className={`text-xs font-black ${isSelected ? '' : 'text-slate-605 dark:text-slate-300'}`}>
                    #{tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable 
          onPress={handleCreateTask}
          className="bg-primary py-4 rounded-2xl items-center active:opacity-90 shadow-md flex-row justify-center gap-2"
        >
          <Plus size={16} color="white" />
          <Text className="text-on-primary font-black uppercase tracking-wider text-sm">Schedule Task</Text>
        </Pressable>
      </AdaptiveGlass>
    );
  };

  const renderBacklogImporter = () => {
    return (
      <AdaptiveGlass className="rounded-3xl p-5 shadow-sm mb-12 gap-4">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-primary font-bold uppercase tracking-widest text-xs">Schedule from Sprint Backlog</Text>
          <View className="bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
            <Text className="text-xs font-black text-primary uppercase tracking-widest">{unscheduledTasks.length} left</Text>
          </View>
        </View>
        <TextInput
          accessibilityLabel="Search Backlog"
          value={searchBacklogText}
          onChangeText={setSearchBacklogText}
          placeholder="Search unscheduled sprint tasks..."
          placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
          className="bg-surface-container-high px-4 py-2.5 rounded-2xl text-on-surface text-xs font-semibold border border-outline-variant"
        />

        <ScrollView className="max-h-60 mt-1" nestedScrollEnabled={true}>
          {filteredUnscheduledTasks.map(task => (
            <Pressable
              key={task.id}
              onPress={() => scheduleTaskToSelectedDate(task.id)}
              className={`p-3.5 rounded-xl border border-outline-variant flex-row justify-between items-center mb-2 bg-surface-container/20 active:opacity-75 ${PRIORITY_COLORS[task.priority].border}`}
            >
              <View className="flex-1 mr-4">
                <Text className="font-bold text-on-surface text-sm">{task.title}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest">{task.points || 0} pts</Text>
                  <View className="w-1 h-1 rounded-full bg-outline-variant" />
                  <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest">{task.priority}</Text>
                </View>
              </View>
              <View className="bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-xl flex-row items-center gap-1">
                <Plus size={10} color={theme.primary} />
                <Text className="text-xs font-black text-primary uppercase tracking-widest">Add</Text>
              </View>
            </Pressable>
          ))}
          {filteredUnscheduledTasks.length === 0 && (
            <View className="py-8 items-center justify-center border border-dashed border-outline-variant/60 rounded-2xl bg-surface-container/20">
              <Text className="text-xs font-bold text-slate-650 dark:text-slate-300">No unscheduled tasks found</Text>
            </View>
          )}
        </ScrollView>
      </AdaptiveGlass>
    );
  };

  const formattedSelectedDate = useMemo(() => {
    try {
      // Safe local date formatting that is highly cross-platform
      const [year, month, day] = selectedDateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    } catch {
      return selectedDateStr;
    }
  }, [selectedDateStr]);

  return (
    <SafeScreen className="flex-1 bg-background" scrollable={false}>
      {isLargeScreen ? (
        /* ==================== DESKTOP / WIDE SCREEN SPLIT LAYOUT ==================== */
        <View className="flex-1 flex-row px-6 gap-6 pt-4 pb-4">
          
          {/* LEFT SIDEBAR: Calendar Month picker & stats dashboard */}
          <View className="w-[42%] max-w-[460px] min-w-[340px] gap-5">
            {/* Header section */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <CalendarDays size={30} color={theme.primary} />
                <Text className="text-3xl font-black text-on-surface tracking-tight">Calendar</Text>
              </View>
              {settings.calendarConnected && (
                <View className="bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20 flex-row items-center gap-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <Text className="text-xs font-black text-green-600 uppercase tracking-widest">Live Synced</Text>
                </View>
              )}
            </View>

            <Text className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed -mt-2">
              Timebox your sprint deliverables into a structured grid schedule. Keep daily commitments balanced within your points capacity.
            </Text>

            {renderCalendarCard()}

            {/* Premium Stats Dashboard card */}
            <AdaptiveGlass className="rounded-3xl p-5 shadow-sm flex-row justify-around">
              <View className="items-center flex-1">
                <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest">Load</Text>
                <Text className="text-xl font-black text-primary mt-1">{selectedDateTotalPoints} pts</Text>
              </View>
              <View className="w-[1px] bg-outline-variant/40" />
              <View className="items-center flex-1">
                <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest">Daily Limit</Text>
                <Text className="text-xl font-black text-on-surface mt-1">{settings.dailyCapacity} pts</Text>
              </View>
              <View className="w-[1px] bg-outline-variant/40" />
              <View className="items-center flex-1">
                <Text className="text-xs font-black text-slate-650 dark:text-slate-300 uppercase tracking-widest">Status</Text>
                <Text className={`text-xs font-black mt-2 uppercase tracking-widest ${selectedDateTotalPoints > settings.dailyCapacity ? 'text-primary' : 'text-green-600'}`}>
                  {selectedDateTotalPoints > settings.dailyCapacity ? 'Overload' : 'Healthy'}
                </Text>
              </View>
            </AdaptiveGlass>
          </View>

          {/* RIGHT VIEW: Day Schedule detail & task adders */}
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="pl-2 gap-4 pb-12">
              {/* Selected date header details */}
              <View className="flex-row items-center justify-between px-1">
                <View>
                  <Text className="text-2xl font-black text-on-surface tracking-tight">
                    {selectedDateStr === getTodayString() ? 'Today’s Schedule' : 'Daily Schedule'}
                  </Text>
                  <Text className="text-xs text-primary font-bold mt-0.5 uppercase tracking-widest">
                    {formattedSelectedDate}
                  </Text>
                </View>

                {/* Daily limit capacity indicator pill */}
                <View className={`px-3 py-1.5 rounded-2xl border flex-row items-center gap-1.5 ${
                  selectedDateTotalPoints > settings.dailyCapacity ? 'bg-primary/10 border-primary/20' : 'bg-surface-container-high border-outline-variant'
                }`}>
                  {selectedDateTotalPoints > settings.dailyCapacity && <AlertTriangle size={12} color={theme.primary} />}
                  <Text className={`font-black text-xs ${selectedDateTotalPoints > settings.dailyCapacity ? 'text-primary' : 'text-slate-650 dark:text-slate-300'}`}>
                    {selectedDateTotalPoints} / {settings.dailyCapacity} pts
                  </Text>
                </View>
              </View>

              {/* Burnout/Over-capacity warning banner */}
              {selectedDateTotalPoints > settings.dailyCapacity && (
                <View className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex-row items-center gap-3">
                  <AlertTriangle size={20} color={theme.primary} />
                  <Text className="text-xs font-bold text-primary flex-1 leading-relaxed">
                    Burnout warning! Total points scheduled for this day exceed your capacity limit of {settings.dailyCapacity}. Try rescheduling some tasks.
                  </Text>
                </View>
              )}

              {/* Core Schedule Lists */}
              {renderScheduleList()}

              {/* Quick Task Add & Import section */}
              <View className="flex-row gap-4">
                <View className="flex-1">
                  {renderQuickAddTask()}
                </View>
                <View className="flex-1">
                  {renderBacklogImporter()}
                </View>
              </View>
            </View>
          </ScrollView>

        </View>
      ) : (
        /* ==================== MOBILE SCREEN STACKED LAYOUT ==================== */
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4 mt-2">
            <View className="flex-row items-center gap-3">
              <CalendarDays size={32} color={theme.primary} />
              <Text className="text-4xl font-black text-on-surface tracking-tight">Calendar</Text>
            </View>
            {settings.calendarConnected && (
              <View className="bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 flex-row items-center gap-1.5">
                <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <Text className="text-xs font-black text-green-600 uppercase tracking-widest">Live Synced</Text>
              </View>
            )}
          </View>

          <Text className="text-sm text-slate-650 dark:text-slate-300 mb-6 leading-relaxed">
            Timebox your sprint deliverables into a structured calendar layout. View point loads and balance constraint-driven daily limits.
          </Text>

          {/* Calendar Month Card */}
          <View className="mb-6">
            {renderCalendarCard()}
          </View>

          {/* Selected Day Header */}
          <View className="flex-row items-center justify-between mb-4 px-1">
            <View>
              <Text className="text-2xl font-black text-on-surface tracking-tight">
                {selectedDateStr === getTodayString() ? 'Today’s Schedule' : 'Daily Schedule'}
              </Text>
              <Text className="text-xs text-slate-650 dark:text-slate-300 font-semibold mt-0.5 uppercase tracking-widest">
                {formattedSelectedDate}
              </Text>
            </View>

            {/* Daily limit badge */}
            <View className={`px-3 py-1.5 rounded-2xl border flex-row items-center gap-1.5 ${
              selectedDateTotalPoints > settings.dailyCapacity ? 'bg-primary/10 border-primary/20' : 'bg-surface-container-high border-outline-variant'
            }`}>
              {selectedDateTotalPoints > settings.dailyCapacity && <AlertTriangle size={12} color={theme.primary} />}
              <Text className={`font-black text-xs ${selectedDateTotalPoints > settings.dailyCapacity ? 'text-primary' : 'text-slate-650 dark:text-slate-300'}`}>
                {selectedDateTotalPoints} / {settings.dailyCapacity} pts
              </Text>
            </View>
          </View>

          {/* Daily Capacity warning banner */}
          {selectedDateTotalPoints > settings.dailyCapacity && (
            <View className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex-row items-center gap-3 mb-4">
              <AlertTriangle size={20} color={theme.primary} />
              <Text className="text-xs font-bold text-primary flex-1 leading-relaxed">
                Burnout warning! Total points scheduled for this day exceed your capacity limit of {settings.dailyCapacity}. Try rescheduling some tasks.
              </Text>
            </View>
          )}

          {/* Schedule List */}
          {renderScheduleList()}

          {/* Quick Add Task */}
          {renderQuickAddTask()}

          {/* Schedule from Backlog */}
          {renderBacklogImporter()}
        </ScrollView>
      )}
    </SafeScreen>
  );
}
