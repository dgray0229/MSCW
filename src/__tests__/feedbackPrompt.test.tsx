import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store';
import { FeedbackPrompt } from '../components/FeedbackPrompt';
import { db } from '../lib/firebase';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock react-native-reanimated
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
    LinearTransition: mockTransition,
    FadeInDown: mockTransition,
    FadeOutUp: mockTransition,
  };
});

// Mock expo-glass-effect and expo-blur
jest.mock('expo-glass-effect', () => ({
  GlassView: ({ children }: any) => children,
  isLiquidGlassAvailable: () => true,
}));

jest.mock('expo-blur', () => ({
  BlurView: ({ children }: any) => children,
}));

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
    Heart: mockIcon('Heart'),
    Frown: mockIcon('Frown'),
    X: mockIcon('X'),
    MessageSquare: mockIcon('MessageSquare'),
    Send: mockIcon('Send'),
    Star: mockIcon('Star'),
    Check: mockIcon('Check'),
  };
});

// Mock hooks
jest.mock('../hooks/useAccentTheme', () => ({
  useAccentTheme: () => ({
    primary: '#ef4444',
    secondary: '#3b82f6',
    tertiary: '#10b981',
    tint: 'bg-red-550/10',
    textPrimary: 'text-primary',
    borderPrimary: 'border-primary',
  }),
}));

jest.mock('../hooks/use-color-scheme', () => ({
  useColorScheme: () => 'dark',
}));

// Mock firebase db.collection('feedback').add
const mockAdd = jest.fn(() => Promise.resolve());
jest.mock('../lib/firebase', () => ({
  db: {
    collection: () => ({
      add: mockAdd,
    }),
  },
}));

describe('FeedbackPrompt System Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    act(() => {
      useAppStore.setState({
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
          sprints: [],
          feedbackStatus: 'pending',
          feedbackPromptLastShown: null,
          feedbackSnoozeCount: 0,
        },
      });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('should not show the prompt if user has not metcompleted task/sprint thresholds', () => {
    let component: any;
    act(() => {
      component = TestRenderer.create(<FeedbackPrompt />);
    });
    // The prompt visible state should be null because criteria aren't met
    expect(component.toJSON()).toBeNull();
  });

  it('should show the prompt if user completed 5 tasks', () => {
    const mockTasksList = Array.from({ length: 5 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      points: 1,
      priority: 'must' as const,
      status: 'archive' as const,
      completed: true,
      createdAt: '',
    }));

    act(() => {
      useAppStore.setState({
        tasks: mockTasksList,
      });
    });

    let component: any;
    act(() => {
      component = TestRenderer.create(<FeedbackPrompt />);
    });

    // Modal should render (not null)
    expect(component.toJSON()).not.toBeNull();
    const root = component.root;
    expect(root.findAllByType(Text).find((t: any) => t.props.children === 'Enjoying MSCW?')).toBeTruthy();
  });

  it('should show the prompt if user has completed at least 1 sprint', () => {
    act(() => {
      useAppStore.setState({
        settings: {
          ...useAppStore.getState().settings,
          sprints: [{
            id: 'sprint-1',
            sprintNumber: 1,
            startDate: '',
            endDate: '',
            totalPoints: 10,
            completedPoints: 8,
            completedMusts: 2,
            totalMusts: 2,
            velocityScore: 80,
          }],
        },
      });
    });

    let component: any;
    act(() => {
      component = TestRenderer.create(<FeedbackPrompt />);
    });

    expect(component.toJSON()).not.toBeNull();
  });

  it('should snooze the prompt when clicking Not Really, then close or cancel', () => {
    act(() => {
      useAppStore.setState({
        settings: {
          ...useAppStore.getState().settings,
          sprints: [{
            id: 'sprint-1',
            sprintNumber: 1,
            startDate: '',
            endDate: '',
            totalPoints: 10,
            completedPoints: 8,
            completedMusts: 2,
            totalMusts: 2,
            velocityScore: 80,
          }],
        },
      });
    });

    let component: any;
    act(() => {
      component = TestRenderer.create(<FeedbackPrompt />);
    });

    const root = component.root;
    
    // Select Sentiment: "Not Really"
    const notReallyButton = findPressableByText(root, 'Not Really');
    expect(notReallyButton).toBeTruthy();
    act(() => {
      notReallyButton.props.onPress();
    });

    // Check store settings transitioned to not_enjoying
    let settings = useAppStore.getState().settings;
    expect(settings.feedbackStatus).toBe('not_enjoying');

    // TextInput for constructive feedback should be visible
    const input = root.findByType(TextInput);
    expect(input).toBeTruthy();

    // Click cancel to snooze
    const cancelButton = findPressableByText(root, 'Cancel');
    expect(cancelButton).toBeTruthy();
    act(() => {
      cancelButton.props.onPress();
    });

    settings = useAppStore.getState().settings;
    expect(settings.feedbackStatus).toBe('snoozed');
    expect(settings.feedbackPromptLastShown).not.toBeNull();
    expect(settings.feedbackSnoozeCount).toBe(1);
  });

  it('should submit feedback to Firestore and update state to submitted when not enjoying and comments given', async () => {
    act(() => {
      useAppStore.setState({
        settings: {
          ...useAppStore.getState().settings,
          sprints: [{
            id: 'sprint-1',
            sprintNumber: 1,
            startDate: '',
            endDate: '',
            totalPoints: 10,
            completedPoints: 8,
            completedMusts: 2,
            totalMusts: 2,
            velocityScore: 80,
          }],
        },
      });
    });

    let component: any;
    act(() => {
      component = TestRenderer.create(<FeedbackPrompt />);
    });

    const root = component.root;
    
    // Choose "Not Really"
    act(() => {
      findPressableByText(root, 'Not Really').props.onPress();
    });

    // Fill in feedback text
    const input = root.findByType(TextInput);
    act(() => {
      input.props.onChangeText('Needs easier shortcut key bindings.');
    });

    // Choose "Submit Feedback"
    const submitButton = findPressableByText(root, 'Submit Feedback');
    expect(submitButton).toBeTruthy();

    await act(async () => {
      await submitButton.props.onPress();
    });

    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
      feedbackText: 'Needs easier shortcut key bindings.',
    }));

    const settings = useAppStore.getState().settings;
    expect(settings.feedbackStatus).toBe('submitted');

    // Advance timers so setTimeout finishes inside act()
    act(() => {
      jest.advanceTimersByTime(2000);
    });
  });

  it('should route user to review details when choosing positive sentiment path and handle store review click', async () => {
    act(() => {
      useAppStore.setState({
        settings: {
          ...useAppStore.getState().settings,
          sprints: [{
            id: 'sprint-1',
            sprintNumber: 1,
            startDate: '',
            endDate: '',
            totalPoints: 10,
            completedPoints: 8,
            completedMusts: 2,
            totalMusts: 2,
            velocityScore: 80,
          }],
        },
      });
    });

    let component: any;
    act(() => {
      component = TestRenderer.create(<FeedbackPrompt />);
    });

    const root = component.root;

    // Choose "Love it!"
    act(() => {
      findPressableByText(root, 'Love it!').props.onPress();
    });

    let settings = useAppStore.getState().settings;
    expect(settings.feedbackStatus).toBe('enjoying');

    // Store review buttons should be visible
    const reviewButton = findPressableByText(root, 'Product Hunt') || findPressableByText(root, 'Review on');
    expect(reviewButton).toBeTruthy();

    // Click the review button
    await act(async () => {
      await reviewButton.props.onPress();
    });

    settings = useAppStore.getState().settings;
    expect(settings.feedbackStatus).toBe('submitted');

    // Advance timers
    act(() => {
      jest.advanceTimersByTime(2000);
    });
  });
});
