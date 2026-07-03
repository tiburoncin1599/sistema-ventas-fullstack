import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export default function Button({
  title, onPress, variant = 'primary', disabled, loading, style,
}: ButtonProps) {
  const bg = {
    primary: '#1B4F8A',
    secondary: '#fff',
    danger: '#FFDDD9',
    success: '#27AE60',
  };
  const textColor = {
    primary: '#fff',
    secondary: '#64748b',
    danger: '#C0392B',
    success: '#fff',
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { backgroundColor: bg[variant], borderWidth: variant === 'secondary' ? 1 : 0, borderColor: variant === 'secondary' ? '#e2e8f0' : 'transparent' },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}>
      {loading
        ? <ActivityIndicator color={textColor[variant]} size="small" />
        : <Text style={[styles.texto, { color: textColor[variant] }]}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 12, padding: 14, alignItems: 'center' },
  texto: { fontWeight: 'bold', fontSize: 15 },
  disabled: { opacity: 0.5 },
});
