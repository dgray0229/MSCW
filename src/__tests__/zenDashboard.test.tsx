import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store';
import ZenModePage from '../app/zen';

// Mock AsyncStorage using react-native-async-storage's standard Jest mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockSearchParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
}));

// Mock expo-audio
jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => ({
    loop: false,
    volume: 1.0,
    play: jest.fn(),
    pause: jest.fn(),
  })),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
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

// Mock react-native-reanimated completely to support shared values under testing
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
  const MockSvg = ({ children, ...props }: any) => <View {...props}>{children}</View>;
  const MockCircle = ({ children, ...props }: any) => <View {...props}>{children}</View>;
  return {
    __esModule: true,
    default: MockSvg,
    Circle: MockCircle,
    Svg: MockSvg,
  };
});

// Mock lucide-react-native
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mockIcon = (name: string) => {
    const Icon = (props: any) => <View {...props} testID={`icon-${name}`} />;
    Icon.displayName = name;
    return Icon;
  };
  return {
    ArrowLeft: mockIcon('ArrowLeft'),
    Check: mockIcon('Check'),
    Play: mockIcon('Play'),
    Pause: mockIcon('Pause'),
    Volume2: mockIcon('Volume2'),
    RotateCcw: mockIcon('RotateCcw'),
    AlertOctagon: mockIcon('AlertOctagon'),
    ChevronDown: mockIcon('ChevronDown'),
    Music: mockIcon('Music'),
    Sparkles: mockIcon('Sparkles'),
    CloudRain: mockIcon('CloudRain'),
    Waves: mockIcon('Waves'),
    VolumeX: mockIcon('VolumeX'),
    History: mockIcon('History'),
    BarChart2: mockIcon('BarChart2'),
    Award: mockIcon('Award'),
    X: mockIcon('X'),
  };
});

// Mock hooks
jest.mock('../hooks/useAccentTheme', () => ({
  useAccentTheme: () => ({
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

describe('Zen Focus Session Dashboard & Distraction Logs Tests', () => {
  const testTasks = [
    {
      id: 'task-must-1',
      title: 'Implement deep analytics',
      points: 5,
      priority: 'must' as const,
      status: 'today' as const,
      completed: false,
      createdAt: '',
      type: 'Feature' as const,
    },
    {
      id: 'task-should-1',
      title: 'Polishing test modules',
      points: 3,
      priority: 'should' as const,
      status: 'today' as const,
      completed: false,
      createdAt: '',
      type: 'Feature' as const,
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    
    // Set up standard seed tasks in the store
    act(() => {
      useAppStore.setState({
        tasks: testTasks,
        focusSessions: [],
        distractions: [],
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
        }
      });
    });
  });

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

  it('should render the timer view when there is an active focus task', () => {
    let component: any;
    act(() => {
      component = TestRenderer.create(<ZenModePage />);
    });

    const root = component.root;

    // Verify it renders the focus task title
    const titleText = root.findAllByType(Text).find((t: any) => t.props.children === 'Implement deep analytics');
    expect(titleText).toBeTruthy();

    // Verify "Complete & Exit" button is visible
    const completeButton = findPressableByText(root, 'Complete & Exit');
    expect(completeButton).toBeTruthy();
  });

  it('should display the Zen Space Dashboard when no focus tasks are available', () => {
    // Clear today's tasks or set all to completed
    act(() => {
      useAppStore.setState({
        tasks: testTasks.map(t => ({ ...t, completed: true }))
      });
    });

    let component: any;
    act(() => {
      component = TestRenderer.create(<ZenModePage />);
    });

    const root = component.root;

    // Verify Zen Space header is present
    const headerText = root.findAllByType(Text).find((t: any) => t.props.children === 'Zen Space');
    expect(headerText).toBeTruthy();
  });

  it('should log distractions during a session', () => {
    let component: any;
    act(() => {
      component = TestRenderer.create(<ZenModePage />);
    });

    const root = component.root;

    // Open Distraction modal
    const logIntButton = findPressableByText(root, 'LOG INTERRUPTION');
    expect(logIntButton).toBeTruthy();
    act(() => {
      logIntButton.props.onPress();
    });

    // Verify distraction modal pressables are rendered and click one
    const externalButton = findPressableByText(root, 'External');
    expect(externalButton).toBeTruthy();

    act(() => {
      externalButton.props.onPress();
    });

    // Check store updates
    const store = useAppStore.getState();
    expect(store.distractions.length).toBe(1);
    expect(store.distractions[0].category).toBe('external');
  });

  it('should calculate focus score properly when time elapsed exceeds 5 seconds', () => {
    jest.useFakeTimers();
    let component: any;
    act(() => {
      component = TestRenderer.create(<ZenModePage />);
    });

    // Toggle active state to start timer
    const root = component.root;
    const playButton = root.findAll((node: any) => node.props && typeof node.props.onPress === 'function')
      .find((p: any) => {
        const textEls = p.findAllByType(Text);
        return textEls.some((t: any) => t.props.children === '||' || t.props.children === '>');
      });
    
    // Start timer
    act(() => {
      playButton.props.onPress();
    });

    // Advance Jest timers by 10 seconds
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Log distraction
    const logIntButton = findPressableByText(root, 'LOG INTERRUPTION');
    act(() => {
      logIntButton.props.onPress();
    });
    const externalButton = findPressableByText(root, 'External');
    act(() => {
      externalButton.props.onPress();
    });

    // Press Complete & Exit
    const completeButton = findPressableByText(root, 'Complete & Exit');
    act(() => {
      completeButton.props.onPress();
    });

    // Check if session was saved
    const store = useAppStore.getState();
    expect(store.focusSessions.length).toBe(1);

    const session = store.focusSessions[0];
    expect(session.durationSeconds).toBe(10);
    
    // Math: Math.round((10 / 1500) * 100) - 1 * 15 = 1 - 15 = -14 -> capped at Max(0) = 0
    expect(session.focusScore).toBe(0);

    jest.useRealTimers();
  });
});
