import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { View, Text, Share, Clipboard, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SprintScorecardModal } from '../components/SprintScorecardModal';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.log('ErrorBoundary caught error:', error.message, error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View>
          <Text>ErrorBoundary Error: {this.state.error?.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Mock Modal directly in react-native
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.Modal = ({ children, visible }: any) => {
    if (!visible) return null;
    return <rn.View>{children}</rn.View>;
  };
  return rn;
});

// Mock react-native-css-interop / NativeWind
jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn(),
  remapProps: jest.fn(),
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
    springify: () => ({
      damping: () => mockTransition,
    }),
  };
  return {
    __esModule: true,
    default: {
      View: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    },
    FadeInDown: mockTransition,
    ZoomIn: mockTransition,
  };
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

// Mock expo-glass-effect
jest.mock('expo-glass-effect', () => {
  return {
    GlassView: ({ children, style }: any) => {
      const { View } = require('react-native');
      return <View style={style}>{children}</View>;
    },
    isLiquidGlassAvailable: () => true,
  };
});

// Mock expo-blur
jest.mock('expo-blur', () => {
  return {
    BlurView: ({ children, style }: any) => {
      const { View } = require('react-native');
      return <View style={style}>{children}</View>;
    },
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
    X: mockIcon('X'),
    Share2: mockIcon('Share2'),
    Copy: mockIcon('Copy'),
    Check: mockIcon('Check'),
    Flame: mockIcon('Flame'),
    Target: mockIcon('Target'),
    TrendingUp: mockIcon('TrendingUp'),
    Calendar: mockIcon('Calendar'),
    MessageSquare: mockIcon('MessageSquare'),
    Sparkles: mockIcon('Sparkles'),
  };
});


// Mock hooks
jest.mock('../hooks/useAccentTheme', () => ({
  useAccentTheme: () => ({
    primary: '#ef4444',
    secondary: '#3b82f6',
    background: '#1e293b',
    surface: '#0f172a',
  }),
}));

jest.mock('../hooks/use-color-scheme', () => ({
  useColorScheme: () => 'dark',
}));

describe('Sprint Retro Export & Share Cards Tests', () => {
  const mockSprintData = {
    id: 'sprint-123',
    sprintNumber: 5,
    startDate: '2026-05-15T00:00:00.000Z',
    endDate: '2026-05-22T00:00:00.000Z',
    totalPoints: 15,
    completedPoints: 12,
    completedMusts: 3,
    totalMusts: 4,
    velocityScore: 80,
    notes: 'We knocked out the primary UI modules but hit a slight integration snag near the end.',
  };

  const mockSprintDataNoNotes = {
    ...mockSprintData,
    notes: undefined,
  };

  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  const findPressableByText = (root: any, text: string) => {
    const pressables = root.findAll((node: any) => node.props && typeof node.props.onPress === 'function');
    return pressables.find((p: any) => {
      const textEls = p.findAllByType(Text);
      return textEls.some((t: any) => {
        const child = t.props.children;
        const joined = Array.isArray(child) ? child.join('') : (typeof child === 'string' ? child : String(child));
        return joined.includes(text);
      });
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should not render anything when visible is false', () => {
    let component: any;
    act(() => {
      component = TestRenderer.create(
        <ErrorBoundary>
          <SprintScorecardModal
            visible={false}
            onClose={jest.fn()}
            sprint={mockSprintData}
            hapticsEnabled={true}
          />
        </ErrorBoundary>
      );
    });
    expect(component.toJSON()).toBeNull();
  });

  it('should not render anything when sprint is null', () => {
    let component: any;
    act(() => {
      component = TestRenderer.create(
        <ErrorBoundary>
          <SprintScorecardModal
            visible={true}
            onClose={jest.fn()}
            sprint={null}
            hapticsEnabled={true}
          />
        </ErrorBoundary>
      );
    });
    expect(component.toJSON()).toBeNull();
  });

  it('should render the sprint details and ASCII progress bar correctly', () => {
    let component: any;
    act(() => {
      component = TestRenderer.create(
        <ErrorBoundary>
          <SprintScorecardModal
            visible={true}
            onClose={jest.fn()}
            sprint={mockSprintData}
            hapticsEnabled={true}
          />
        </ErrorBoundary>
      );
    });
    const root = component.root;

    // Verify Sprint Number
    const sprintTitle = root.findByProps({ className: 'text-on-surface font-black text-2xl tracking-tight' });
    const titleText = Array.isArray(sprintTitle.props.children) ? sprintTitle.props.children.join('') : sprintTitle.props.children;
    expect(titleText).toContain('Sprint #5');

    // Verify ASCII progress bar has correct fills
    // 12/15 is 80%. 80% of 15 blocks is 12 blocks.
    // 12 filled blocks '█' and 3 empty blocks '░'
    const expectedProgressBar = '████████████░░░';
    const monoText = root.findAllByType(Text).find((t: any) => 
      t.props.style && t.props.style.color === '#ef4444' && t.props.className?.includes('font-mono')
    );
    expect(monoText).toBeTruthy();
    expect(monoText?.props.children).toContain(expectedProgressBar);

    // Verify stats text
    const textElements = root.findAllByType(Text).map((t: any) => {
      const child = t.props.children;
      return Array.isArray(child) ? child.join('') : (typeof child === 'string' ? child : String(child));
    });
    
    // Musts: 3/4 is 75%
    expect(textElements.some((text: any) => text.includes('75%'))).toBe(true);
    // Efficiency/Velocity: 80%
    expect(textElements.some((text: any) => text.includes('80%'))).toBe(true);

    // Verify Retro learnings
    const notesText = root.findByProps({ className: 'text-[11px] text-on-surface font-medium italic leading-relaxed' });
    expect(notesText.props.children).toContain(mockSprintData.notes);
  });

  it('should handle clipboard copy actions and trigger haptics', () => {
    const clipboardSpy = jest.spyOn(Clipboard, 'setString').mockImplementation(() => {});
    let component: any;
    act(() => {
      component = TestRenderer.create(
        <ErrorBoundary>
          <SprintScorecardModal
            visible={true}
            onClose={jest.fn()}
            sprint={mockSprintData}
            hapticsEnabled={true}
          />
        </ErrorBoundary>
      );
    });
    
    // Find clipboard copy button using our helper
    const root = component.root;
    const copyButton = findPressableByText(root, 'Copy Text');
    
    expect(copyButton).toBeTruthy();
    
    act(() => {
      copyButton.props.onPress();
    });

    // Check if Clipboard is called with correct text representation
    expect(clipboardSpy).toHaveBeenCalled();
    const copiedText = clipboardSpy.mock.calls[0][0];
    expect(copiedText).toContain('🏆 MSCW SPRINT SCORECARD (Sprint 5) 🏆');
    expect(copiedText).toContain('████████████░░░');
    expect(copiedText).toContain('Must-Have Tasks Finished: 3/4 (75%)');
    expect(copiedText).toContain('Overall Velocity Score: 80%');
    expect(copiedText).toContain(mockSprintData.notes);

    // Check if haptics was fired
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it('should handle standard team sharing correctly and trigger haptics', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    let component: any;
    act(() => {
      component = TestRenderer.create(
        <ErrorBoundary>
          <SprintScorecardModal
            visible={true}
            onClose={jest.fn()}
            sprint={mockSprintData}
            hapticsEnabled={true}
          />
        </ErrorBoundary>
      );
    });
    
    const root = component.root;
    // Find share button using helper
    const shareButton = findPressableByText(root, 'Share Card');
    expect(shareButton).toBeTruthy();

    await act(async () => {
      shareButton.props.onPress();
    });

    expect(shareSpy).toHaveBeenCalled();
    const sharePayload = shareSpy.mock.calls[0][0];
    expect(sharePayload.message).toContain('🏆 MSCW SPRINT SCORECARD (Sprint 5) 🏆');
    expect(sharePayload.message).toContain('████████████░░░');
    expect(sharePayload.title).toBe('Sprint 5 Scorecard');

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('should format output beautifully with default notes fallback when sprint retrospective notes are empty', () => {
    const clipboardSpy = jest.spyOn(Clipboard, 'setString').mockImplementation(() => {});
    let component: any;
    act(() => {
      component = TestRenderer.create(
        <ErrorBoundary>
          <SprintScorecardModal
            visible={true}
            onClose={jest.fn()}
            sprint={mockSprintDataNoNotes}
            hapticsEnabled={true}
          />
        </ErrorBoundary>
      );
    });
    
    const root = component.root;
    const copyButton = findPressableByText(root, 'Copy Text');
    expect(copyButton).toBeTruthy();
    
    act(() => {
      copyButton.props.onPress();
    });

    expect(clipboardSpy).toHaveBeenCalled();
    const copiedText = clipboardSpy.mock.calls[0][0];
    expect(copiedText).toContain('No retrospective comments logged for this sprint cycle.');
  });
});
