import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, TouchableWithoutFeedback, Text } from 'react-native';

interface SOSButtonProps {
  onPress: () => void;
}

export default function SOSButton({ onPress }: SOSButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ripple1Anim = useRef(new Animated.Value(0)).current;
  const ripple2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for the button glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Overlapping ripple animations
    const startRipple = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startRipple(ripple1Anim, 0);
    startRipple(ripple2Anim, 1100);
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
    onPress();
  };

  const r1Scale = ripple1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.0],
  });
  const r1Opacity = ripple1Anim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.5, 0.3, 0],
  });

  const r2Scale = ripple2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.0],
  });
  const r2Opacity = ripple2Anim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.5, 0.3, 0],
  });

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={styles.container}>
        {/* Animated Ripples */}
        <Animated.View
          style={[
            styles.ripple,
            {
              transform: [{ scale: r1Scale }],
              opacity: r1Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ripple,
            {
              transform: [{ scale: r2Scale }],
              opacity: r2Opacity,
            },
          ]}
        />

        {/* Looping pulse glow */}
        <Animated.View
          style={[
            styles.buttonGlow,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        {/* Tactile SOS Button */}
        <Animated.View
          style={[
            styles.button,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.buttonText}>SOS</Text>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ripple: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(211, 47, 47, 0.4)',
  },
  buttonGlow: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(211, 47, 47, 0.25)',
  },
  button: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FF5252',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
