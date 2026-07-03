import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput,
  StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Modal
} from 'react-native';
import { api } from '../lib/api';
import { NavProps } from '../lib/navigation';

export default function ClientesScreen({ navigation }: NavProps) {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [showRegistro, setShowRegistro] = useState(false);
  const [form, setForm] = useState({ nombre: '', telefono: '', carnet: '', ubicacion: '' });
  const [showEditar, setShowEditar] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<any>(null);
  const [formEdit, setFormEdit] = useState({ nombre: '', telefono: '', carnet: '', ubicacion: '' });

  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/clientes');
      setClientes(Array.isArray(res.data) ? res.data : []);
    } catch {
      setClientes([]);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtrado = clientes.filter(c =>
    c.activo && (
      c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.carnet || '').toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  const registrar = async () => {
    if (!form.nombre) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }
    try {
      await api.post('/clientes', form);
      setShowRegistro(false);
      setForm({ nombre: '', telefono: '', carnet: '', ubicacion: '' });
      await cargar();
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message) ? err.response.data.message.join('. ') : (err.response?.data?.message || 'Error al registrar');
      Alert.alert('Error', msg);
    }
  };

  const abrirEditar = (cliente: any) => {
    setClienteEditando(cliente);
    setFormEdit({
      nombre: cliente.nombre || '',
      telefono: cliente.telefono || '',
      carnet: cliente.carnet || '',
      ubicacion: cliente.ubicacion || '',
    });
    setShowEditar(true);
  };

  const guardarEdicion = async () => {
    if (!formEdit.nombre) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }
    try {
      await api.put(`/clientes/${clienteEditando.id}`, formEdit);
      setShowEditar(false);
      setClienteEditando(null);
      await cargar();
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message) ? err.response.data.message.join('. ') : (err.response?.data?.message || 'Error al actualizar');
      Alert.alert('Error', msg);
    }
  };

  const eliminarCliente = (id: number) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de desactivar este cliente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/clientes/${id}`);
              setShowEditar(false);
              setClienteEditando(null);
              await cargar();
            } catch (err: any) {
              const msg = Array.isArray(err.response?.data?.message) ? err.response.data.message.join('. ') : (err.response?.data?.message || 'Error al eliminar');
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  if (cargando) return (
    <View style={styles.centro}>
      <ActivityIndicator size="large" color="#1B4F8A"/>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Panel de búsqueda + botón registrar */}
      <View style={styles.busquedaPanel}>
        <TextInput
          style={styles.buscador}
          placeholder="Buscar por nombre o carnet..."
          value={busqueda}
          onChangeText={setBusqueda}
        />
        <TouchableOpacity style={styles.botonAgregar} onPress={() => setShowRegistro(true)}>
          <Text style={styles.botonAgregarTexto}>+</Text>
        </TouchableOpacity>
      </View>

      {filtrado.length === 0 && !cargando ? (
        <View style={styles.centro}>
          <Text style={styles.vacioTexto}>No se encontraron clientes</Text>
        </View>
      ) : (
        <FlatList
          data={filtrado}
          keyExtractor={item => item.id.toString()}
          onRefresh={() => { setRefrescando(true); cargar(); }}
          refreshing={refrescando}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => abrirEditar(item)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTexto}>{item.nombre?.charAt(0)?.toUpperCase() || '?'}</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.nombre}>{item.nombre}</Text>
                {item.carnet ? <Text style={styles.carnetTexto}>Carnet: {item.carnet}</Text> : null}
                {item.telefono ? <Text style={styles.telefono}>{item.telefono}</Text> : null}
                {item.ubicacion ? <Text style={styles.ubicacionTexto}>📍 {item.ubicacion}</Text> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.botonVolver} onPress={() => navigation.goBack()}>
        <Text style={styles.botonTexto}>Volver al inicio</Text>
      </TouchableOpacity>

      {/* Modal registro */}
      <Modal visible={showRegistro} transparent animationType="slide">
        <View style={styles.modalFondo}>
          <View style={styles.modal}>
            <Text style={styles.modalTitulo}>Registrar Cliente</Text>
            <TextInput style={styles.modalInput} placeholder="Nombre *" placeholderTextColor="#9ca3af" value={form.nombre} onChangeText={t => setForm({ ...form, nombre: t })} />
            <TextInput style={styles.modalInput} placeholder="Carnet / CI" placeholderTextColor="#9ca3af" value={form.carnet} onChangeText={t => setForm({ ...form, carnet: t })} />
            <TextInput style={styles.modalInput} placeholder="Teléfono" placeholderTextColor="#9ca3af" keyboardType="phone-pad" value={form.telefono} onChangeText={t => setForm({ ...form, telefono: t })} />
            <TextInput style={styles.modalInput} placeholder="Ubicación / Dirección" placeholderTextColor="#9ca3af" value={form.ubicacion} onChangeText={t => setForm({ ...form, ubicacion: t })} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.botonSec} onPress={() => setShowRegistro(false)}>
                <Text style={styles.botonSecTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonPrim} onPress={registrar}>
                <Text style={styles.botonPrimTexto}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal editar / eliminar */}
      <Modal visible={showEditar} transparent animationType="slide">
        <View style={styles.modalFondo}>
          <View style={styles.modal}>
            <Text style={styles.modalTitulo}>Editar Cliente</Text>
            <TextInput style={styles.modalInput} placeholder="Nombre *" placeholderTextColor="#9ca3af" value={formEdit.nombre} onChangeText={t => setFormEdit({ ...formEdit, nombre: t })} />
            <TextInput style={styles.modalInput} placeholder="Carnet / CI" placeholderTextColor="#9ca3af" value={formEdit.carnet} onChangeText={t => setFormEdit({ ...formEdit, carnet: t })} />
            <TextInput style={styles.modalInput} placeholder="Teléfono" placeholderTextColor="#9ca3af" keyboardType="phone-pad" value={formEdit.telefono} onChangeText={t => setFormEdit({ ...formEdit, telefono: t })} />
            <TextInput style={styles.modalInput} placeholder="Ubicación / Dirección" placeholderTextColor="#9ca3af" value={formEdit.ubicacion} onChangeText={t => setFormEdit({ ...formEdit, ubicacion: t })} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.botonSec} onPress={() => { setShowEditar(false); setClienteEditando(null); }}>
                <Text style={styles.botonSecTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonPrim} onPress={guardarEdicion}>
                <Text style={styles.botonPrimTexto}>Guardar</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.botonEliminar} onPress={() => eliminarCliente(clienteEditando?.id)}>
              <Text style={styles.botonEliminarTexto}>Eliminar cliente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vacioTexto: { fontSize: 16, color: '#64748b', marginTop: 40 },

  busquedaPanel: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  buscador: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16 },
  botonAgregar: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1B4F8A', justifyContent: 'center', alignItems: 'center' },
  botonAgregarTexto: { color: '#fff', fontSize: 24, fontWeight: 'bold', lineHeight: 26 },

  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1B4F8A', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarTexto: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  itemInfo: { flex: 1 },
  nombre: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  carnetTexto: { fontSize: 12, color: '#64748b', marginTop: 1 },

  telefono: { fontSize: 13, color: '#1B4F8A', marginTop: 1 },
  ubicacionTexto: { fontSize: 12, color: '#64748b', marginTop: 1 },

  botonVolver: { backgroundColor: '#1B4F8A', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonPrim: { flex: 1, backgroundColor: '#1B4F8A', borderRadius: 12, padding: 16, alignItems: 'center' },
  botonPrimTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonSec: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, alignItems: 'center', backgroundColor: '#fff' },
  botonSecTexto: { color: '#64748b', fontWeight: '600', fontSize: 16 },

  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  modalInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  botonEliminar: { backgroundColor: '#C0392B', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  botonEliminarTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
