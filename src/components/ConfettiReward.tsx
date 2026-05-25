import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import ConfettiCannon from 'react-native-confetti-cannon';

export interface ConfettiRewardRef {
  fire: () => void;
}

export const ConfettiReward = forwardRef<ConfettiRewardRef, {}>((props, ref) => {
  const cannonRef = useRef<ConfettiCannon>(null);

  useImperativeHandle(ref, () => ({
    fire: () => {
      if (cannonRef.current) {
        cannonRef.current.start();
      }
    },
  }));

  return (
    <ConfettiCannon
      ref={cannonRef}
      count={100}
      origin={{ x: -10, y: 0 }}
      autoStart={false}
      explosionSpeed={350}
      fallSpeed={3000}
      fadeOut={true}
      colors={['#b61722', '#ff8b94', '#ffd3b6', '#dcedc1', '#a8e6cf', '#b61722']}
    />
  );
});

ConfettiReward.displayName = 'ConfettiReward';
