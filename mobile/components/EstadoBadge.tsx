import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface EstadoBadgeProps {
  estado: string;
}

const colores: Record<string, { bg: string; text: string }> = {
  pendiente: { bg: '#FFF3CD', text: '#856404' },
  confirmado: { bg: '#D1ECF1', text: '#0C5460' },
  enviado: { bg: '#E8D5F5', text: '#6F42C1' },
  entregado: { bg: '#D4EDDA', text: '#155724' },
  cancelado: { bg: '#FFDDD9', text: '#C0392B' },
};

export default function EstadoBadge({ estado }: EstadoBadgeProps) {
  const color = colores[estado] || { bg: '#f1f5f9', text: '#64748b' };
  return (
    <View style={[styles.badge, { backgroundColor: color.bg }]}>
      <Text style={[styles.texto, { color: color.text }]}>{estado}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  texto: { fontSize: 13, fontWeight: '600' },
});
