import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store';
import BoardPage from '../app/index';
import BacklogPage from '../app/backlog';

// Mock AsyncStorage for Zustand persist middleware
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native package directly to prevent CSS interop issues
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  // Mock Modal to render inline
  rn.Modal = ({ children, visible }: any) => {
    if (!visible) return null;
    return <rn.View>{children}</rn.View>;
  };
  return rn;
});

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

// Mock react-native-reanimated customly to allow interactive mock pan-gestures
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
      // Simulate standard pan-gesture flow synchronously under test
      return (event: any) => {
        const context: any = { startX: 0 };
        if (handlers.onStart) {
          handlers.onStart(event, context);
        }
        if (handlers.onActive) {
          handlers.onActive(event, context);
        }
        if (handlers.onEnd) {
          handlers.onEnd(event, context);
        }
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

// Mock react-native-gesture-handler to capture and expose gesture events
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  // Custom mock gesture to hold references to callbacks
  const mockGesture: any = {
    activeOffsetX: function() { return this; },
    failOffsetY: function() { return this; },
    onStart: function(cb: any) { this._onStart = cb; return this; },
    onUpdate: function(cb: any) { this._onUpdate = cb; return this; },
    onEnd: function(cb: any) { this._onEnd = cb; return this; },
  };

  return {
    GestureDetector: ({ children, gesture }: any) => {
      return (
        <View 
          testID="PanGestureHandler" 
          onGestureEvent={(event: any) => {
            const simulatedEvent = {
              translationX: event.translationX,
              velocityX: event.velocityX || 0,
            };
            if (event.state === 'active') {
              if (gesture._onStart) gesture._onStart();
              if (gesture._onUpdate) gesture._onUpdate(simulatedEvent);
            } else {
              // Run full sequence to simulate the swipe drag & release
              if (gesture._onStart) gesture._onStart();
              if (gesture._onUpdate) gesture._onUpdate(simulatedEvent);
              if (gesture._onEnd) gesture._onEnd(simulatedEvent);
            }
          }}
        >
          {children}
        </View>
      );
    },
    Gesture: {
      Pan: () => mockGesture,
    },
  };
});

// Mock other native dependencies
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn(),
  remapProps: jest.fn(),
}));

jest.mock('expo-glass-effect', () => ({
  GlassView: ({ children, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
  isLiquidGlassAvailable: () => true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('Premium Kanban Swipe-to-Action Gestures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up standard seed tasks in the store
    useAppStore.setState({
      tasks: [
        {
          id: 'test-board-1',
          title: 'Daily Action Task',
          description: 'A task for testing board actions',
          points: 3,
          priority: 'must',
          status: 'today',
          completed: false,
          createdAt: new Date().toISOString(),
          type: 'Feature',
        },
        {
          id: 'test-backlog-1',
          title: 'Backlog Graduation Task',
          description: 'A task to move from backlog to today board',
          points: 5,
          priority: 'unsorted',
          status: 'backlog',
          completed: false,
          createdAt: new Date().toISOString(),
          type: 'Bug',
        },
      ],
      settings: {
        isPremium: true,
        dailyCapacity: 8,
        hapticsEnabled: true,
        accentTheme: 'crimson',
        sprints: [],
        sprintNumber: 1,
      } as any,
    });
  });

  it('verifies Swipe Right (Left-to-Right) on Daily Board toggles task completion', () => {
    let component: any;
    act(() => {
      component = TestRenderer.create(<BoardPage />);
    });
    const gestureHandlers = component.root.findAllByProps({ testID: 'PanGestureHandler' });
    
    // Assert we found the Daily Action task gesture wrapper
    expect(gestureHandlers.length).toBeGreaterThanOrEqual(1);
    
    const firstHandler = gestureHandlers[0];
    const triggerGesture = firstHandler.props.onGestureEvent;
    
    // 1. Simulate active swipe right beyond threshold
    act(() => {
      triggerGesture({ state: 'active', translationX: 120 });
    });
    
    // Verify tactile selection haptic fired
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    
    // 2. Simulate release to trigger left action (Complete task)
    act(() => {
      triggerGesture({ state: 'end', translationX: 120 });
    });
    
    // Verify success confirmation haptic fired
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    
    // Assert task completion status toggled in the store
    const updatedTasks = useAppStore.getState().tasks;
    const actionTask = updatedTasks.find(t => t.id === 'test-board-1');
    expect(actionTask?.completed).toBe(true);
  });

  it('verifies Swipe Left (Right-to-Left) on Daily Board archives the task', () => {
    let component: any;
    act(() => {
      component = TestRenderer.create(<BoardPage />);
    });
    const gestureHandlers = component.root.findAllByProps({ testID: 'PanGestureHandler' });
    
    const firstHandler = gestureHandlers[0];
    const triggerGesture = firstHandler.props.onGestureEvent;
    
    // Simulate release to trigger right action (Archive task)
    act(() => {
      triggerGesture({ state: 'end', translationX: -120 });
    });
    
    // Verify haptics and archive state update
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    
    const updatedTasks = useAppStore.getState().tasks;
    const actionTask = updatedTasks.find(t => t.id === 'test-board-1');
    expect(actionTask?.status).toBe('archive');
  });

  it('verifies Swipe Right (Left-to-Right) on Backlog graduates task to Board', () => {
    let component: any;
    act(() => {
      component = TestRenderer.create(<BacklogPage />);
    });
    const gestureHandlers = component.root.findAllByProps({ testID: 'PanGestureHandler' });
    
    // Assert we found the Backlog Graduation task gesture wrapper
    expect(gestureHandlers.length).toBeGreaterThanOrEqual(1);
    
    const backlogHandler = gestureHandlers[0];
    const triggerGesture = backlogHandler.props.onGestureEvent;
    
    // Simulate release to trigger left action (Activate task)
    act(() => {
      triggerGesture({ state: 'end', translationX: 120 });
    });
    
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    
    // Assert status updated to 'today' and priority to 'unsorted'
    const updatedTasks = useAppStore.getState().tasks;
    const backlogTask = updatedTasks.find(t => t.id === 'test-backlog-1');
    expect(backlogTask?.status).toBe('today');
    expect(backlogTask?.priority).toBe('unsorted');
  });

  it('verifies Swipe Left (Right-to-Left) on Backlog deletes the task completely', () => {
    let component: any;
    act(() => {
      component = TestRenderer.create(<BacklogPage />);
    });
    const gestureHandlers = component.root.findAllByProps({ testID: 'PanGestureHandler' });
    
    const backlogHandler = gestureHandlers[0];
    const triggerGesture = backlogHandler.props.onGestureEvent;
    
    // Simulate release to trigger right action (Delete task)
    act(() => {
      triggerGesture({ state: 'end', translationX: -120 });
    });
    
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    
    // Assert task deleted from the store completely
    const updatedTasks = useAppStore.getState().tasks;
    const deletedTask = updatedTasks.find(t => t.id === 'test-backlog-1');
    expect(deletedTask).toBeUndefined();
  });
});
