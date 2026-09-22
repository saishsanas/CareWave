import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import CustomButton from '../components/CustomButton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const randomCallers = [
  "Satish Sharma",
  "Priya Singh",
  "Aman Gujjar",
  "Neha Verma",
  "Saish Sanas ",
  "Sneha Kulkarni",
  "Prabhas Joshi",
  "Shruti Gupta"
];

interface FakeCallSetupScreenProps {
  onNavigateBack: () => void;
  onStartCall: (callerName: string, delaySeconds: number) => void;
}

type CallerType = 'MOTHER' | 'FATHER' | 'RANDOM' | 'CUSTOM';

export default function FakeCallSetupScreen({ onNavigateBack, onStartCall }: FakeCallSetupScreenProps) {
  const [selectedType, setSelectedType] = useState<CallerType>('MOTHER');
  const [customName, setCustomName] = useState('');
  const [errorText, setErrorText] = useState('');
  const [selectedDelay, setSelectedDelay] = useState<number>(5); // Default to 5 seconds

  // Handle Android Back press to return to Home screen
  useEffect(() => {
    const backAction = () => {
      onNavigateBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [onNavigateBack]);

  const handleStartCall = () => {
    setErrorText('');

    let finalName = '';
    if (selectedType === 'MOTHER') {
      finalName = 'Mother';
    } else if (selectedType === 'FATHER') {
      finalName = 'Father';
    } else if (selectedType === 'RANDOM') {
      const randomIndex = Math.floor(Math.random() * randomCallers.length);
      finalName = randomCallers[randomIndex];
    } else if (selectedType === 'CUSTOM') {
      if (!customName.trim()) {
        setErrorText('Please enter a custom caller name');
        return;
      }
      finalName = customName.trim();
    }

    onStartCall(finalName, selectedDelay);
  };

  const handleTypeSelect = (type: CallerType) => {
    setSelectedType(type);
    setErrorText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onNavigateBack} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FAKE CALL SETUP</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Choose Caller</Text>
            <Text style={styles.sectionSubtitle}>
              Select who will appear as the caller on your simulated active call screen.
            </Text>

            {/* Option Options */}
            <View style={styles.optionsContainer}>
              {/* Option Mother */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedType === 'MOTHER' && styles.optionCardSelected,
                ]}
                onPress={() => handleTypeSelect('MOTHER')}
                activeOpacity={0.7}
              >
                <View style={styles.optionRow}>
                  <View style={[styles.avatarCircle, selectedType === 'MOTHER' && styles.avatarCircleSelected]}>
                    <Text style={styles.avatarInitials}>M</Text>
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Mother</Text>
                    <Text style={styles.optionDescription}>Preset simulation</Text>
                  </View>
                  {selectedType === 'MOTHER' && (
                    <Feather name="check-circle" size={20} color="#FF5252" style={styles.checkIcon} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Option Father */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedType === 'FATHER' && styles.optionCardSelected,
                ]}
                onPress={() => handleTypeSelect('FATHER')}
                activeOpacity={0.7}
              >
                <View style={styles.optionRow}>
                  <View style={[styles.avatarCircle, selectedType === 'FATHER' && styles.avatarCircleSelected]}>
                    <Text style={styles.avatarInitials}>F</Text>
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Father</Text>
                    <Text style={styles.optionDescription}>Preset simulation</Text>
                  </View>
                  {selectedType === 'FATHER' && (
                    <Feather name="check-circle" size={20} color="#FF5252" style={styles.checkIcon} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Option Random */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedType === 'RANDOM' && styles.optionCardSelected,
                ]}
                onPress={() => handleTypeSelect('RANDOM')}
                activeOpacity={0.7}
              >
                <View style={styles.optionRow}>
                  <View style={[styles.avatarCircle, selectedType === 'RANDOM' && styles.avatarCircleSelected]}>
                    <Feather name="users" size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Random Person</Text>
                    <Text style={styles.optionDescription}>Generates a realistic contact name</Text>
                  </View>
                  {selectedType === 'RANDOM' && (
                    <Feather name="check-circle" size={20} color="#FF5252" style={styles.checkIcon} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Option Custom */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedType === 'CUSTOM' && styles.optionCardSelected,
                ]}
                onPress={() => handleTypeSelect('CUSTOM')}
                activeOpacity={0.7}
              >
                <View style={styles.optionRow}>
                  <View style={[styles.avatarCircle, selectedType === 'CUSTOM' && styles.avatarCircleSelected]}>
                    <Feather name="edit-2" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Custom Name</Text>
                    <Text style={styles.optionDescription}>Enter any custom caller details</Text>
                  </View>
                  {selectedType === 'CUSTOM' && (
                    <Feather name="check-circle" size={20} color="#FF5252" style={styles.checkIcon} />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Custom Name input field rendered conditionally */}
            {selectedType === 'CUSTOM' && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Caller Name</Text>
                <View style={[styles.inputContainer, !!errorText && styles.inputContainerError]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter caller name"
                    placeholderTextColor="#636366"
                    value={customName}
                    onChangeText={(text) => {
                      setCustomName(text);
                      if (text.trim()) setErrorText('');
                    }}
                    maxLength={30}
                    autoFocus={true}
                  />
                  <Feather name="user" size={18} color="#8E8E93" />
                </View>
                {!!errorText && <Text style={styles.errorLabel}>{errorText}</Text>}
              </View>
            )}

            <View style={{ height: 16 }} />

            {/* Delay Selection Section */}
            <Text style={styles.sectionTitle}>Call Delay</Text>
            <Text style={styles.sectionSubtitle}>
              Choose the delay time before the incoming call begins.
            </Text>
            <View style={styles.delayContainer}>
              <TouchableOpacity
                style={[styles.delayCard, selectedDelay === 0 && styles.delayCardSelected]}
                onPress={() => setSelectedDelay(0)}
                activeOpacity={0.7}
              >
                <Text style={styles.delayText}>Instant</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.delayCard, selectedDelay === 5 && styles.delayCardSelected]}
                onPress={() => setSelectedDelay(5)}
                activeOpacity={0.7}
              >
                <Text style={styles.delayText}>5 Sec</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.delayCard, selectedDelay === 10 && styles.delayCardSelected]}
                onPress={() => setSelectedDelay(10)}
                activeOpacity={0.7}
              >
                <Text style={styles.delayText}>10 Sec</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.delayCard, selectedDelay === 30 && styles.delayCardSelected]}
                onPress={() => setSelectedDelay(30)}
                activeOpacity={0.7}
              >
                <Text style={styles.delayText}>30 Sec</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Start button footer */}
          <View style={styles.footer}>
            <CustomButton
              title="Start Call"
              onPress={handleStartCall}
              icon="phone-call"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F11',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginLeft: 12,
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  optionCard: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 16,
    padding: 16,
  },
  optionCardSelected: {
    borderColor: '#FF5252',
    backgroundColor: 'rgba(255, 82, 82, 0.04)',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleSelected: {
    backgroundColor: '#FF5252',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  optionTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  optionDescription: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  checkIcon: {
    marginLeft: 8,
  },
  inputWrapper: {
    marginTop: 10,
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
  },
  inputContainerError: {
    borderColor: '#FF3B30',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  errorLabel: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  delayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  delayCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delayCardSelected: {
    borderColor: '#FF5252',
    backgroundColor: 'rgba(255, 82, 82, 0.04)',
  },
  delayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
