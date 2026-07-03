import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, TextInput,
  StyleSheet, ActivityIndicator
} from 'react-native';
import { api } from '../lib/api';
import { NavProps } from '../lib/navigation';
import { getImagenUrl } from '../lib/utils';
import type { Producto } from '../lib/types';
import Header from '../components/Header';

export default function CatalogoScreen({ navigation }: NavProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/productos')
      .then(res => setProductos(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProductos([]))
      .finally(() => setCargando(false));
  }, []);

  const filtrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (cargando) return (
    <View style={styles.centro}>
      <ActivityIndicator size="large" color="#1B4F8A" />
    </View>
  );

  return (
    <View style={styles.container}>
      <Header titulo="Catálogo" onBack={() => navigation.replace('Dashboard')} />

      <TextInput
        style={styles.buscador}
        placeholder="Buscar producto..."
        value={busqueda}
        onChangeText={setBusqueda}
      />

      <FlatList
        data={filtrados}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.fila}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.imgContainer}>
              {item.imagen_url
                ? <Image source={{ uri: getImagenUrl(item.imagen_url)! }} style={styles.img} resizeMode="contain" />
                : <Text style={styles.imgPlaceholder}>📦</Text>
              }
            </View>
            <Text style={styles.nombre}>{item.nombre}</Text>
            {item.tamano ? <Text style={styles.tamano}>{item.tamano}</Text> : null}
            <Text style={styles.precio}>Bs {Number(item.precio).toFixed(2)}</Text>
            {item.precio_por_docena ? (
              <Text style={styles.docena}>Docena: Bs {Number(item.precio_por_docena).toFixed(2)}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buscador: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, margin: 12, marginBottom: 8, fontSize: 16 },
  fila: { justifyContent: 'space-between', paddingHorizontal: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, width: '48%', borderWidth: 1, borderColor: '#e2e8f0' },
  imgContainer: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden' },
  img: { width: '100%', height: 120, borderRadius: 8 },
  imgPlaceholder: { fontSize: 40 },
  nombre: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  tamano: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  precio: { fontSize: 18, fontWeight: 'bold', color: '#1B4F8A' },
  docena: { fontSize: 12, color: '#27AE60', fontWeight: '600', marginTop: 2 },
});
