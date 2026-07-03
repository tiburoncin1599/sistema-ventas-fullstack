import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../lib/api';
import { NavProps } from '../lib/navigation';
import { useAuthStore } from '../store/auth';

const formatearFecha = () => {
  try {
    return new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return new Date().toLocaleDateString();
  }
};

const STATS_CONFIG: Record<string, { label: string; key: string; nav: string }[]> = {
  admin: [
    { label: 'Productos', key: 'productos', nav: 'Catalogo' },
    { label: 'Pedidos', key: 'pedidos', nav: 'Pedidos' },
    { label: 'Alertas', key: 'alertas', nav: 'Alertas' },
    { label: 'Clientes', key: 'clientes', nav: 'Clientes' },
  ],
  ventas: [
    { label: 'Productos', key: 'productos', nav: 'Catalogo' },
    { label: 'Pedidos', key: 'pedidos', nav: 'Pedidos' },
    { label: 'Clientes', key: 'clientes', nav: 'Clientes' },
  ],
  inventario: [
    { label: 'Productos', key: 'productos', nav: 'Stock' },
    { label: 'Alertas', key: 'alertas', nav: 'Alertas' },
    { label: 'Pedidos', key: 'pedidos', nav: 'Pedidos' },
  ],
};

const QUICK_ACTIONS: Record<string, { titulo: string; icono: string; pantalla: string }[]> = {
  admin: [
    { titulo: 'Realizar Pedido', icono: '\uD83D\uDED2', pantalla: 'NuevoPedido' },
    { titulo: 'Consultar Stock', icono: '\uD83D\uDCE6', pantalla: 'Stock' },
    { titulo: 'Ver Clientes', icono: '\uD83D\uDC65', pantalla: 'Clientes' },
  ],
  ventas: [
    { titulo: 'Realizar Pedido', icono: '\uD83D\uDED2', pantalla: 'NuevoPedido' },
    { titulo: 'Ver Cat\u00E1logo', icono: '\uD83D\uDCCB', pantalla: 'Catalogo' },
    { titulo: 'Ver Clientes', icono: '\uD83D\uDC65', pantalla: 'Clientes' },
  ],
  inventario: [
    { titulo: 'Consultar Stock', icono: '\uD83D\uDCE6', pantalla: 'Stock' },
    { titulo: 'Ver Alertas', icono: '\u26A0\uFE0F', pantalla: 'Alertas' },
  ],
};

const STATS_ENDPOINTS: Record<string, string> = {
  productos: '/productos',
  pedidos: '/pedidos',
  alertas: '/inventario/alertas',
  clientes: '/clientes',
};

export default function DashboardScreen({ navigation }: NavProps) {
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const [stats, setStats] = useState<Record<string, number>>({});

  const rol = usuario?.rol;
  const statsItems = rol ? (STATS_CONFIG[rol] || STATS_CONFIG.admin) : [];
  const actions = rol ? (QUICK_ACTIONS[rol] || QUICK_ACTIONS.admin) : [];

  useFocusEffect(
    useCallback(() => {
      cargarStats();
    }, [rol])
  );

  const cargarStats = async () => {
    const entries = statsItems.map((item) => item.key);
    const uniqueEndpoints = [...new Set(entries.map((k) => STATS_ENDPOINTS[k]))];

    const results = await Promise.all(
      uniqueEndpoints.map(async (url) => {
        try {
          const res = await api.get(url);
          const count = Array.isArray(res.data) ? res.data.length : (typeof res.data === 'object' && res.data !== null ? Object.keys(res.data).length : 0);
          return { url, data: count };
        } catch {
          return { url, data: 0 };
        }
      }),
    );

    const map = Object.fromEntries(results.map((r) => [r.url, r.data]));
    const newStats: Record<string, number> = {};
    for (const item of statsItems) {
      newStats[item.key] = map[STATS_ENDPOINTS[item.key]] ?? 0;
    }
    setStats(newStats);
  };

  const cerrarSesion = async () => {
    await logout();
    navigation.replace('Login');
  };

  const bgForAlertas = stats.alertas !== undefined && stats.alertas > 0 ? '#FFDDD9' : '#F1F5F9';
  const colorForAlertas = stats.alertas !== undefined && stats.alertas > 0 ? '#C0392B' : '#333';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.bienvenida}>Hola, {usuario?.nombre}</Text>
          <Text style={styles.subHeader}>
            {rol === 'ventas' ? 'Ventas' : rol === 'inventario' ? 'Inventario' : 'Administrador'}
          </Text>
          <Text style={styles.fecha}>{formatearFecha()}</Text>
        </View>
        <TouchableOpacity onPress={cerrarSesion}>
          <Text style={styles.salir}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {statsItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.statCard,
              {
                backgroundColor:
                  item.key === 'alertas'
                    ? bgForAlertas
                    : item.key === 'pedidos'
                      ? '#D4EDDA'
                      : '#EBF4FB',
              },
            ]}
            onPress={() => navigation.navigate(item.nav)}
          >
            <Text
              style={[
                styles.statNum,
                item.key === 'alertas' ? { color: colorForAlertas } : null,
              ].filter(Boolean)}
            >
              {stats[item.key] ?? 0}
            </Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.seccion}>Acciones r\u00E1pidas</Text>

      {actions.map((item) => (
        <TouchableOpacity
          key={item.pantalla}
          style={styles.menuItem}
          onPress={() => navigation.navigate(item.pantalla)}
        >
          <Text style={styles.menuIcono}>{item.icono}</Text>
          <Text style={styles.menuTexto}>{item.titulo}</Text>
          <Text style={styles.menuFlecha}>{'\u203A'}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 48, backgroundColor: '#1B4F8A' },
  bienvenida: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subHeader: { fontSize: 13, color: '#93c5fd', marginTop: 1 },
  fecha: { fontSize: 13, color: '#93c5fd', marginTop: 2 },
  salir: { color: '#93c5fd', fontSize: 14 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statCard: { width: '48%', borderRadius: 12, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: 'bold', color: '#1B4F8A' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  seccion: { fontSize: 16, fontWeight: 'bold', color: '#64748b', paddingHorizontal: 16, paddingVertical: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  menuIcono: { fontSize: 24, marginRight: 12 },
  menuTexto: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1e293b' },
  menuFlecha: { fontSize: 24, color: '#94a3b8' },
});
