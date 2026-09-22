import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TextInputProps } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface CustomInputProps extends TextInputProps {
  label: string;
  icon?: string;
  leftElement?: React.ReactNode;
}

export default function CustomInput({ label, icon, leftElement, style, ...props }: CustomInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
        {leftElement}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="#636366"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {icon && <Feather name={icon as any} size={18} color={isFocused ? '#D32F2F' : '#8E8E93'} style={styles.icon} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
  },
  inputWrapperFocused: {
    borderColor: '#D32F2F',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  icon: {
    marginLeft: 8,
  },
});
