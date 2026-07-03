import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList,
  StyleSheet, ActivityIndicator, TouchableOpacity
} from 'react-native';
import { api } from '../lib/api';
import { NavProps } from '../lib/navigation';

export default function AlertasScreen({ navigation }: NavProps) {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/inventario/alertas');
      setAlertas(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAlertas([]);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return (
    <View style={styles.centro}>
      <ActivityIndicator size="large" color="#1B4F8A"/>
    </View>
  );

  return (
    <View style={styles.container}>
      {alertas.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.emoji}>✅</Text>
          <Text style={styles.okTexto}>Todo el stock está bien</Text>
        </View>
      ) : (
        <>
          <View style={styles.banner}>
            <Text style={styles.bannerTexto}>
              ⚠️ {alertas.length} producto{alertas.length > 1 ? 's' : ''} con stock bajo
            </Text>
          </View>
          <FlatList
            data={alertas}
            keyExtractor={item => item.id.toString()}
            onRefresh={() => { setRefrescando(true); cargar(); }}
            refreshing={refrescando}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <View style={styles.itemInfo}>
                  <Text style={styles.nombre}>{item.producto?.nombre}</Text>
                  <Text style={styles.minimo}>Mínimo requerido: {item.cantidad_minima}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.cantidad}>{item.cantidad}</Text>
                  <Text style={styles.unidades}>unidades</Text>
                </View>
              </View>
            )}
          />
        </>
      )}
      <TouchableOpacity style={styles.botonVolver} onPress={() => navigation.replace('Dashboard')}>
        <Text style={styles.botonTexto}>Volver al inicio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: 16 },
  okTexto: { fontSize: 18, color: '#27AE60', fontWeight: '600' },
  banner: { backgroundColor: '#FFDDD9', borderRadius: 12, padding: 16, marginBottom: 12 },
  bannerTexto: { color: '#C0392B', fontWeight: 'bold', fontSize: 15 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#FFDDD9' },
  itemInfo: { flex: 1 },
  nombre: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  minimo: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  badge: { backgroundColor: '#FFDDD9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  cantidad: { fontSize: 22, fontWeight: 'bold', color: '#C0392B' },
  unidades: { fontSize: 11, color: '#C0392B' },
  botonVolver: { backgroundColor: '#1B4F8A', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
