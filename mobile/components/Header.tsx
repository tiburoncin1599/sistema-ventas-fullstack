import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface HeaderProps {
  titulo: string;
  onBack?: () => void;
}

export default function Header({ titulo, onBack }: HeaderProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.headerAtras}>← Atrás</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 60 }} />
      )}
      <Text style={styles.headerTitulo}>{titulo}</Text>
      <View style={{ width: 60 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#1B4F8A',
  },
  headerAtras: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerTitulo: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
