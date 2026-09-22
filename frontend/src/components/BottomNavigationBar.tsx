import React, { useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Platform, Animated } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface BottomNavigationBarProps {
  activeTab: string;
  onTabPress: (tabName: string) => void;
  isTrackingActive?: boolean;
}

export default function BottomNavigationBar({ activeTab, onTabPress, isTrackingActive = false }: BottomNavigationBarProps) {
  const tabs = [
    { name: 'Home', icon: 'home', type: 'Feather' },
    { name: 'Alerts', icon: 'bell', type: 'Feather' },
    { name: 'LOCATION', icon: 'map-marker-radius', type: 'MaterialCommunityIcons', isCenter: true },
    { name: 'Contacts', icon: 'users', type: 'Feather' },
    { name: 'Profile', icon: 'user', type: 'Feather' },
  ];

  const scaleAnims = {
    Home: useRef(new Animated.Value(1)).current,
    Alerts: useRef(new Animated.Value(1)).current,
    LOCATION: useRef(new Animated.Value(1)).current,
    Contacts: useRef(new Animated.Value(1)).current,
    Profile: useRef(new Animated.Value(1)).current,
  };

  const handlePressIn = (tabName: string) => {
    Animated.spring(scaleAnims[tabName as keyof typeof scaleAnims], {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (tabName: string) => {
    Animated.spring(scaleAnims[tabName as keyof typeof scaleAnims], {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
    onTabPress(tabName);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.barContainer}>
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.name;
          const currentScale = scaleAnims[tab.name as keyof typeof scaleAnims];

          if (tab.isCenter) {
            return (
              <TouchableOpacity
                key={tab.name}
                activeOpacity={0.9}
                onPressIn={() => handlePressIn(tab.name)}
                onPressOut={() => handlePressOut(tab.name)}
                style={styles.centerTabWrapper}
              >
                <Animated.View style={[
                  styles.centerTab, 
                  isSelected && styles.centerTabSelected,
                  { transform: [{ scale: currentScale }] }
                ]}>
                  <View style={{ position: 'relative' }}>
                    <MaterialCommunityIcons
                      name={tab.icon as any}
                      size={28}
                      color="#FFFFFF"
                    />
                    <View style={[
                      styles.statusDot,
                      isTrackingActive ? styles.statusDotGreen : styles.statusDotRed
                    ]} />
                  </View>
                  <Text style={styles.centerTabText}>LOCATION</Text>
                </Animated.View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.name}
              activeOpacity={0.8}
              onPressIn={() => handlePressIn(tab.name)}
              onPressOut={() => handlePressOut(tab.name)}
              style={styles.tab}
            >
              <Animated.View style={[styles.tabContent, { transform: [{ scale: currentScale }] }]}>
                {tab.type === 'Feather' ? (
                  <Feather
                    name={tab.icon as any}
                    size={20}
                    color={isSelected ? '#FF5252' : '#8E8E93'}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={20}
                    color={isSelected ? '#FF5252' : '#8E8E93'}
                  />
                )}
                <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                  {tab.name}
                </Text>
                {isSelected && <View style={styles.activeDot} />}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 12, // Reduced bottom gap by ~15% for a sleeker fit
    left: 16,
    right: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  barContainer: {
    flexDirection: 'row',
    width: width - 32,
    backgroundColor: 'rgba(20, 20, 22, 0.95)', // Darkened background for better contrast and premium frosted feel
    borderWidth: 1.2, // Slightly more defined border
    borderColor: '#303036', // Enhanced border contrast against page content
    borderRadius: 24,
    height: 64,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 }, // Smoother, deeper drop shadow
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingBottom: 4,
  },
  tabText: {
    fontSize: 9,
    color: '#8E8E93',
    fontWeight: '600',
    marginTop: 4,
  },
  tabTextSelected: {
    color: '#FF5252',
    fontWeight: '700',
  },
  activeDot: {
    width: 10, // Converted simple dot to a sleek active indicator pill
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FF5252',
    position: 'absolute',
    bottom: -4,
  },
  centerTabWrapper: {
    width: 76,
    height: 76,
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerTab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0F0F11',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  centerTabSelected: {
    backgroundColor: '#FF5252',
    borderColor: '#FFFFFF',
  },
  centerTabText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: -2,
    right: -2,
    borderWidth: 1.5,
    borderColor: '#D32F2F',
  },
  statusDotGreen: {
    backgroundColor: '#30D158',
  },
  statusDotRed: {
    backgroundColor: '#FF3B30',
  },
});
