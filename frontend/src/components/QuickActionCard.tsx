import React, { useRef } from 'react';
import { StyleSheet, Text, View, Animated, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface QuickActionCardProps {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}

export default function QuickActionCard({ title, subtitle, icon, onPress }: QuickActionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconContainer}>
          <Feather name={icon as any} size={20} color="#FF5252" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    margin: 6,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    height: 104,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 82, 82, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    width: '100%',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
  },
});
