import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, Image,
  StyleSheet, ActivityIndicator
} from 'react-native';
import { api } from '../lib/api';
import { NavProps } from '../lib/navigation';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://web-production-c811d.up.railway.app';

const getImagenUrl = (url?: string) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url}`;
};

export default function StockScreen({ navigation }: NavProps) {
  const [inventario, setInventario] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/inventario');
      setInventario(Array.isArray(res.data) ? res.data : []);
    } catch {
      setInventario([]);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtrado = inventario.filter(i =>
    i.producto?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getColor = (cantidad: number, minimo: number) => {
    if (cantidad <= minimo) return '#C0392B';
    if (cantidad <= minimo * 2) return '#E67E22';
    return '#27AE60';
  };

  if (cargando) return (
    <View style={styles.centro}>
      <ActivityIndicator size="large" color="#1B4F8A"/>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.buscador}
        placeholder="Buscar producto..."
        value={busqueda}
        onChangeText={setBusqueda}
      />
      <FlatList
        data={filtrado}
        keyExtractor={item => item.id.toString()}
        onRefresh={() => { setRefrescando(true); cargar(); }}
        refreshing={refrescando}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.imagenContainer}>
              {item.producto?.imagen_url
                ? <Image source={{ uri: getImagenUrl(item.producto.imagen_url)! }} style={styles.imagen} resizeMode="contain" />
                : <Text style={styles.imagenPlaceholder}>📦</Text>
              }
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.nombre}>{item.producto?.nombre}</Text>
              <Text style={styles.minimo}>Mínimo: {item.cantidad_minima}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getColor(item.cantidad, item.cantidad_minima) + '20' }]}>
              <Text style={[styles.cantidad, { color: getColor(item.cantidad, item.cantidad_minima) }]}>
                {item.cantidad}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buscador: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  imagenContainer: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  imagen: { width: 48, height: 48, borderRadius: 8 },
  imagenPlaceholder: { fontSize: 24 },
  itemInfo: { flex: 1 },
  nombre: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  minimo: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  badge: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  cantidad: { fontSize: 20, fontWeight: 'bold' },
});
