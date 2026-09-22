import React, { useRef } from 'react';
import { StyleSheet, Text, Animated, Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EmergencyTypeCardProps {
  title: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}

export default function EmergencyTypeCard({ title, icon, selected, onPress }: EmergencyTypeCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
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
    >
      <Animated.View
        style={[
          styles.card,
          selected && styles.cardSelected,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={[styles.iconContainer, selected && styles.iconContainerSelected]}>
          <MaterialCommunityIcons
            name={icon as any}
            size={26}
            color={selected ? '#FFFFFF' : '#FF5252'}
          />
        </View>
        <Text style={[styles.title, selected && styles.titleSelected]}>
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 16,
    padding: 12,
    width: 106,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardSelected: {
    borderColor: '#D32F2F',
    backgroundColor: 'rgba(211, 47, 47, 0.12)',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 82, 82, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconContainerSelected: {
    backgroundColor: '#D32F2F',
  },
  title: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  titleSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
