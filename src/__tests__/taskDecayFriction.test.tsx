import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { View, Text, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store';
import BacklogPage from '../app/backlog';
import AnalyticsPage from '../app/analytics';
import { Task } from '../types';

// Mock AsyncStorage using react-native-async-storage's standard Jest mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
    Rigid: 'rigid',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock react-native-reanimated completely
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mockTransition = {
    springify: () => mockTransition,
    damping: () => mockTransition,
    duration: () => mockTransition,
  };
  return {
    __esModule: true,
    default: {
      View: ({ children, style, ...props }: any) => <View {...props} style={style}>{children}</View>,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (cb: any) => cb(),
    useAnimatedGestureHandler: (handlers: any) => {
      return (event: any) => {
        const context: any = { startX: 0 };
        if (handlers.onStart) handlers.onStart(event, context);
        if (handlers.onActive) handlers.onActive(event, context);
        if (handlers.onEnd) handlers.onEnd(event, context);
      };
    },
    withSpring: (toValue: any) => toValue,
    withTiming: (toValue: any) => toValue,
    withRepeat: (anim: any) => anim,
    withSequence: (...anims: any[]) => anims[0],
    Easing: {
      in: (fn: any) => fn,
      out: (fn: any) => fn,
      inOut: (fn: any) => fn,
      ease: (x: number) => x,
      bezier: () => (x: number) => x,
      linear: (x: number) => x,
      quad: (x: number) => x,
      cubic: (x: number) => x,
    },
    interpolate: (x: any, input: any, output: any) => output[0],
    runOnJS: (fn: any) => fn,
    LinearTransition: mockTransition,
    FadeInDown: mockTransition,
    FadeOutUp: mockTransition,
  };
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSvg = ({ children, ...props }: any) => <View {...props} testID="mock-svg">{children}</View>;
  const MockCircle = ({ children, ...props }: any) => <View {...props} testID="mock-svg-circle">{children}</View>;
  const MockPath = ({ children, ...props }: any) => <View {...props} testID="mock-svg-path">{children}</View>;
  const MockLine = ({ children, ...props }: any) => <View {...props} testID="mock-svg-line">{children}</View>;
  const MockText = ({ children, ...props }: any) => <View {...props} testID="mock-svg-text">{children}</View>;
  const MockG = ({ children, ...props }: any) => <View {...props} testID="mock-svg-g">{children}</View>;
  return {
    __esModule: true,
    default: MockSvg,
    Svg: MockSvg,
    Circle: MockCircle,
    Path: MockPath,
    Line: MockLine,
    Text: MockText,
    G: MockG,
  };
});

// Mock expo-blur
jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

// Mock expo-glass-effect
jest.mock('expo-glass-effect', () => ({
  GlassView: ({ children, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
  isLiquidGlassAvailable: () => true,
}));

// Mock lucide-react-native dynamically using a Proxy to prevent undefined icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mockIcon = (name: string) => {
    const Icon = (props: any) => <View {...props} testID={`icon-${name}`} />;
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy(
    {},
    {
      get: (target, prop) => {
        if (typeof prop === 'string') {
          return mockIcon(prop);
        }
        return undefined;
      },
    }
  );
});

// Mock hooks
jest.mock('../hooks/useAccentTheme', () => ({
  useAccentTheme: () => ({
    theme: 'crimson',
    primary: '#ef4444',
    secondary: '#3b82f6',
    background: '#1e293b',
    surface: '#0f172a',
    primaryContainer: '#fecaca',
    textPrimary: '#b91c1c',
  }),
}));

jest.mock('../hooks/use-color-scheme', () => ({
  useColorScheme: () => 'dark',
}));

// Mock SwipeableCard to simplify DOM structure
jest.mock('../components/SwipeableCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SwipeableCard: ({ children }: any) => <View testID="SwipeableCard">{children}</View>,
  };
});

// Mock AISprintArchitectDrawer
jest.mock('../components/AISprintArchitectDrawer', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    AISprintArchitectDrawer: ({ isOpen, initialTaskId, onClose }: any) => {
      if (!isOpen) return null;
      return (
        <View testID="AISprintArchitectDrawer">
          <Text>AISprintArchitectDrawer Open for task {initialTaskId}</Text>
        </View>
      );
    }
  };
});

// Helper function to find a Pressable by its matching inner text
const findPressableByText = (root: any, text: string) => {
  const pressables = root.findAll((node: any) => node.props && typeof node.props.onPress === 'function');
  return pressables.find((p: any) => {
    const textEls = p.findAllByType(Text);
    return textEls.some((t: any) => {
      const child = t.props.children;
      const joined = Array.isArray(child) ? child.join('') : (typeof child === 'string' ? child : String(child));
      return joined.toLowerCase().includes(text.toLowerCase());
    });
  });
};

describe('Option 4: Task Decay & Sprint Friction Premium Upgrades Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set a clean state in Zustand store
    act(() => {
      useAppStore.setState({
        _hasHydrated: true,
        tasks: [],
        settings: {
          isPremium: true,
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
          sprints: [],
        },
      });
    });
  });

  describe('1. Zustand Store Rollover Math & End Sprint Transitions', () => {
    
    it('should successfully increment rolloverCount for active uncompleted tasks and archive completed ones upon endSprint()', () => {
      const store = useAppStore.getState();
      
      // Seed uncompleted today and sprint tasks, plus one completed today task
      act(() => {
        store.addTask({ title: 'Uncompleted Today Task', status: 'today', completed: false, priority: 'must', points: 3 });
        store.addTask({ title: 'Uncompleted Sprint Task', status: 'sprint', completed: false, priority: 'should', points: 2 });
        store.addTask({ title: 'Completed Today Task', status: 'today', completed: true, priority: 'must', points: 5 });
        store.addTask({ title: 'Backlog Task', status: 'backlog', completed: false, priority: 'could' });
      });

      const seededState = useAppStore.getState();
      expect(seededState.tasks.length).toBe(4);
      
      const uncompletedTodayId = seededState.tasks.find(t => t.title === 'Uncompleted Today Task')?.id!;
      const uncompletedSprintId = seededState.tasks.find(t => t.title === 'Uncompleted Sprint Task')?.id!;
      const completedTodayId = seededState.tasks.find(t => t.title === 'Completed Today Task')?.id!;
      const backlogTaskId = seededState.tasks.find(t => t.title === 'Backlog Task')?.id!;
      
      // End sprint
      act(() => {
        seededState.endSprint('Wrapping up sprint 1');
      });

      const updatedState = useAppStore.getState();
      
      // Verify rolloverCount increments
      const task1 = updatedState.tasks.find(t => t.id === uncompletedTodayId);
      expect(task1?.rolloverCount).toBe(1);
      
      const task2 = updatedState.tasks.find(t => t.id === uncompletedSprintId);
      expect(task2?.rolloverCount).toBe(1);

      // Verify archiving of completed active task
      const task3 = updatedState.tasks.find(t => t.id === completedTodayId);
      expect(task3?.status).toBe('archive');
      expect(task3?.completedAt).toBeDefined();

      // Verify backlog tasks remain unaffected (rolloverCount remains 0 or unchanged)
      const task4 = updatedState.tasks.find(t => t.id === backlogTaskId);
      expect(task4?.rolloverCount).toBe(0);

      // Verify sprint history logging
      expect(updatedState.settings.sprints?.length).toBe(1);
      expect(updatedState.settings.sprintNumber).toBe(2);
    });

    it('should correctly default rolloverCount to 0 when a new task is added', () => {
      const store = useAppStore.getState();
      act(() => {
        store.addTask({ title: 'Fresh backlog task' });
      });

      const updatedState = useAppStore.getState();
      const freshTask = updatedState.tasks[0];
      expect(freshTask.rolloverCount).toBe(0);
    });
  });

  describe('2. Interactive Backlog Triage Optimizer Component UI & Actions', () => {

    it('should render a pristine status when there are no stale tasks with rolloverCount >= 2', () => {
      // Seed task with rolloverCount = 1 (not stale yet)
      const store = useAppStore.getState();
      act(() => {
        store.addTask({ title: 'Task with low rollover', rolloverCount: 1, status: 'backlog' });
      });

      let component: any;
      act(() => {
        component = TestRenderer.create(<BacklogPage />);
      });

      const root = component.root;
      
      // Backlog Triage Optimizer displays pristine health
      const pristineHeader = root.findAllByType(Text).find((t: any) => t.props.children === '✨ Backlog Health: Pristine');
      expect(pristineHeader).toBeTruthy();

      const staleHeader = root.findAllByType(Text).find((t: any) => t.props.children === '🚨 Backlog Friction Optimizer');
      expect(staleHeader).toBeFalsy();
    });

    it('should display stale tasks in the Backlog Triage Optimizer card list', () => {
      // Seed two stale tasks (rolloverCount >= 2)
      const store = useAppStore.getState();
      act(() => {
        store.addTask({ title: 'High Drag Task A', rolloverCount: 2, status: 'backlog', points: 3 });
        store.addTask({ title: 'Ultra Friction Task B', rolloverCount: 3, status: 'backlog', points: 5 });
      });

      let component: any;
      act(() => {
        component = TestRenderer.create(<BacklogPage />);
      });

      const root = component.root;

      // Optimizer is active
      const staleHeader = root.findAllByType(Text).find((t: any) => t.props.children === '🚨 Backlog Friction Optimizer');
      expect(staleHeader).toBeTruthy();

      // Renders both stale task titles
      const taskAText = root.findAllByType(Text).find((t: any) => t.props.children === 'High Drag Task A');
      const taskBText = root.findAllByType(Text).find((t: any) => t.props.children === 'Ultra Friction Task B');
      expect(taskAText).toBeTruthy();
      expect(taskBText).toBeTruthy();

      // Displays color-coded labels correctly
      const staleBadge = root.findAllByType(Text).find((t: any) => t.props.children === 'Stale Task');
      const frictionBadge = root.findAllByType(Text).find((t: any) => t.props.children === 'Friction x3');
      expect(staleBadge).toBeTruthy();
      expect(frictionBadge).toBeTruthy();
    });

    it('should trigger the Won\'t-Have demotion action cleanly from the optimizer panel', () => {
      const store = useAppStore.getState();
      act(() => {
        store.addTask({ title: 'Friction Task C', rolloverCount: 2, status: 'backlog' });
      });

      let component: any;
      act(() => {
        component = TestRenderer.create(<BacklogPage />);
      });

      const root = component.root;

      // Find "Won't" button using the start of the word to avoid JSX backslash escape mismatches
      const wontButton = findPressableByText(root, "Won");
      expect(wontButton).toBeTruthy();

      act(() => {
        wontButton.props.onPress();
      });

      // Verify that the task's priority is now set to 'wont' in the store
      const updatedStore = useAppStore.getState();
      const updatedTask = updatedStore.tasks.find(t => t.title === 'Friction Task C');
      expect(updatedTask?.priority).toBe('wont');
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });

    it('should trigger the Dump deletion action cleanly from the optimizer panel', () => {
      const store = useAppStore.getState();
      act(() => {
        store.addTask({ title: 'Friction Task D', rolloverCount: 2, status: 'backlog' });
      });

      let component: any;
      act(() => {
        component = TestRenderer.create(<BacklogPage />);
      });

      const root = component.root;

      // Find "Dump" button and press it
      const dumpButton = findPressableByText(root, "Dump");
      expect(dumpButton).toBeTruthy();

      act(() => {
        dumpButton.props.onPress();
      });

      // Verify task is deleted from the store
      const updatedStore = useAppStore.getState();
      const updatedTask = updatedStore.tasks.find(t => t.title === 'Friction Task D');
      expect(updatedTask).toBeUndefined();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    });

    it('should open the AI Sprint Architect drawer preloaded with the stale task ID upon pressing Split', () => {
      const store = useAppStore.getState();
      act(() => {
        // Needs points >= 3 to display Split action
        store.addTask({ title: 'Friction Task E', rolloverCount: 2, status: 'backlog', points: 5 });
      });

      let component: any;
      act(() => {
        component = TestRenderer.create(<BacklogPage />);
      });

      const root = component.root;

      // Find "Split" button and press it
      const splitButton = findPressableByText(root, "Split");
      expect(splitButton).toBeTruthy();

      act(() => {
        splitButton.props.onPress();
      });

      // Assert drawer is opened with the target task ID preloaded
      const drawer = root.findByProps({ testID: 'AISprintArchitectDrawer' });
      expect(drawer).toBeTruthy();

      const seededTask = useAppStore.getState().tasks[0];
      const drawerText = drawer.findByType(Text);
      const child = drawerText.props.children;
      const joinedText = Array.isArray(child) ? child.join('') : String(child);
      expect(joinedText).toContain(`AISprintArchitectDrawer Open for task ${seededTask.id}`);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });
  });

  describe('3. Sprint Friction Gauge Speedometer & Agility Index Math', () => {

    it('should correctly calculate high agility when rollover is zero and there are no backlog musts', () => {
      const store = useAppStore.getState();
      
      // Seed no rollover tasks, and some completed or backlog should tasks
      act(() => {
        store.addTask({ title: 'Should task', status: 'backlog', priority: 'should', completed: false, rolloverCount: 0 });
      });

      let component: any;
      act(() => {
        component = TestRenderer.create(<AnalyticsPage />);
      });

      const root = component.root;

      // Check agility score
      // Math: 100 - (0 * 12) - (0 * 15) = 100
      const scoreText = root.findAllByType(Text).find((t: any) => t.props.children === 100);
      expect(scoreText).toBeTruthy();

      // Check grade is A+
      const gradeText = root.findAllByType(Text).find((t: any) => t.props.children === 'A+');
      expect(gradeText).toBeTruthy();
    });

    it('should mathematically penalize agility index score for rollover counts and uncompleted must tasks', () => {
      const store = useAppStore.getState();
      
      // Seed 2 tasks with rolloverCount of 2 and 1 uncompleted must-have task
      act(() => {
        store.addTask({ title: 'Stale task A', status: 'backlog', priority: 'should', completed: false, rolloverCount: 2 }); // rollover = 2
        store.addTask({ title: 'Stale task B', status: 'backlog', priority: 'should', completed: false, rolloverCount: 1 }); // rollover = 1
        store.addTask({ title: 'Must task C', status: 'today', priority: 'must', completed: false, rolloverCount: 0 });       // uncompleted must = 1
      });

      let component: any;
      act(() => {
        component = TestRenderer.create(<AnalyticsPage />);
      });

      const root = component.root;

      // Agility Score Math:
      // sumRolloverCounts = 2 + 1 + 0 = 3. Penalty = 3 * 12 = 36
      // uncompletedMustsCount = 1 (Must task C). Penalty = 1 * 15 = 15
      // Score: 100 - 36 - 15 = 49 (clamped: 49)
      const scoreText = root.findAllByType(Text).find((t: any) => t.props.children === 49);
      expect(scoreText).toBeTruthy();

      // Score 49 sits in the C range (50-79 is B/C, let's verify C range 50-79, or D range 30-49)
      // Range check from analytics.tsx:
      // score >= 90: A+
      // score >= 80: A
      // score >= 70: B
      // score >= 50: C
      // score >= 30: D (49 falls into D)
      const gradeText = root.findAllByType(Text).find((t: any) => t.props.children === 'D');
      expect(gradeText).toBeTruthy();
    });

    it('should clamp friction index score between 0 and 100 gracefully under massive backlog overflow', () => {
      const store = useAppStore.getState();
      
      // Seed heavy friction that would push score negative:
      // rollover counts sum to 10
      // musts sum to 5
      // Math: 100 - (10 * 12) - (5 * 15) = 100 - 120 - 75 = -95 -> Clamps to 0
      act(() => {
        store.addTask({ title: 'Overflow stale', status: 'backlog', priority: 'must', completed: false, rolloverCount: 10 });
        store.addTask({ title: 'Must 1', status: 'today', priority: 'must', completed: false });
        store.addTask({ title: 'Must 2', status: 'today', priority: 'must', completed: false });
        store.addTask({ title: 'Must 3', status: 'today', priority: 'must', completed: false });
        store.addTask({ title: 'Must 4', status: 'today', priority: 'must', completed: false });
      });

      let component: any;
      act(() => {
        component = TestRenderer.create(<AnalyticsPage />);
      });

      const root = component.root;

      const scoreText = root.findAllByType(Text).find((t: any) => t.props.children === 0);
      expect(scoreText).toBeTruthy();

      const gradeText = root.findAllByType(Text).find((t: any) => t.props.children === 'F');
      expect(gradeText).toBeTruthy();
    });

    it('should hide or overlay Sprint Friction details behind the Premium Gate overlay if not Premium', () => {
      const store = useAppStore.getState();
      act(() => {
        store.updateSettings({ isPremium: false });
      });

      let component: any;
      act(() => {
        component = TestRenderer.create(<AnalyticsPage />);
      });

      const root = component.root;

      // Find the container with pointerEvents="none" indicating it is locked/faded
      const gatedView = root.findAllByType(View).find((v: any) => v.props.pointerEvents === 'none');
      expect(gatedView).toBeTruthy();
    });
  });
});
