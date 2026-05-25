declare module 'react-native-confetti-cannon' {
  import React from 'react';
  
  export interface ConfettiCannonProps {
    count?: number;
    origin?: { x: number; y: number };
    explosionSpeed?: number;
    fallSpeed?: number;
    colors?: string[];
    fadeOut?: boolean;
    autoStart?: boolean;
    autoStartDelay?: number;
    onAnimationStart?: () => void;
    onAnimationResume?: () => void;
    onAnimationStop?: () => void;
    onAnimationEnd?: () => void;
  }

  export default class ConfettiCannon extends React.Component<ConfettiCannonProps> {
    start: () => void;
    stop: () => void;
  }
}
