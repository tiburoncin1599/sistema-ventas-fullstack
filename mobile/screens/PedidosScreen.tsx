import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput,
  StyleSheet, ActivityIndicator, TouchableOpacity, Image, Modal, Alert, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '../lib/api';
import { NavProps } from '../lib/navigation';
import { descargarPDF as descargarPDFUtil } from '../lib/utils';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://web-production-c811d.up.railway.app';

const getImagenUrl = (url?: string) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url}`;
};

const formatFecha = (fecha: string) => {
  try {
    return new Date(fecha).toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return fecha || '';
  }
};

const formatCantidad = (cant: number) => {
  const docenas = Math.floor(cant / 12);
  const unidades = cant % 12;
  if (docenas > 0 && unidades > 0) return `${docenas} doc + ${unidades}u`;
  if (docenas > 0) return `${docenas} doc${docenas > 1 ? 's' : ''} (${cant}u)`;
  return `${cant} u`;
};

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imagen_url?: string;
}

export default function PedidosScreen({ navigation }: NavProps) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [pedidoSel, setPedidoSel] = useState<any>(null);
  const [qrImg, setQrImg] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [editDetalles, setEditDetalles] = useState<any[]>([]);
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const [showAddProd, setShowAddProd] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busquedaProd, setBusquedaProd] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/pedidos');
      setPedidos(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPedidos([]);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const getColorEstado = (estado: string) => {
    const colores: Record<string, { bg: string; text: string }> = {
      pendiente: { bg: '#FFF3CD', text: '#856404' },
      confirmado: { bg: '#D1ECF1', text: '#0C5460' },
      enviado: { bg: '#E8D5F5', text: '#6F42C1' },
      entregado: { bg: '#D4EDDA', text: '#155724' },
      cancelado: { bg: '#FFDDD9', text: '#C0392B' },
    };
    return colores[estado] || { bg: '#f1f5f9', text: '#64748b' };
  };

  const cambiarEstado = async (id: number, estado: string) => {
    try {
      await api.put(`/pedidos/${id}/estado`, { estado });
      const res = await api.get('/pedidos');
      setPedidos(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al cambiar estado';
      Alert.alert('Error', msg);
    }
  };

  const verDetalle = async (id: number) => {
    try {
      const res = await api.get(`/pedidos/${id}`);
      setPedidoSel(res.data);
      setQrImg('');
      setEditMode(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo cargar el detalle');
    }
  };

  const generarQR = async (id: number) => {
    try {
      const res = await api.get(`/pedidos/${id}/factura/qr`);
      setQrImg(res.data.qr);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo generar el QR');
    }
  };

  const descargarPDF = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const pdfUrl = `${API_URL}/pedidos/${id}/factura/pdf`;
      const fileUri = FileSystem.cacheDirectory + `factura_${id}.pdf`;
      const uri = await descargarPDFUtil(pdfUrl, fileUri, token);
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Factura Pedido #${id}`,
        });
      } else {
        Alert.alert('PDF descargado', `Factura guardada en: ${uri}`);
      }
    } catch (err: any) {
      console.error('[descargarPDF] Error:', err.message);
      Alert.alert('Error', err.message || 'No se pudo descargar el PDF');
    }
  };

  const eliminarPedido = (id: number) => {
    Alert.alert(
      'Eliminar pedido',
      '¿Estás seguro? Se devolverá el stock de todos los productos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/pedidos/${id}`);
              setPedidoSel(null);
              setQrImg('');
              const res = await api.get('/pedidos');
              setPedidos(res.data);
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el pedido');
            }
          },
        },
      ],
    );
  };

  const iniciarEdicion = () => {
    setEditDetalles(pedidoSel?.detalles?.map((d: any) => ({ ...d })) || []);
    setEditMode(true);
  };

  const cancelarEdicion = () => {
    setEditMode(false);
    setEditDetalles([]);
  };

  const guardarEdicion = async () => {
    const originales = pedidoSel.detalles;
    const editIds = editDetalles.filter(d => d.id > 0).map(d => d.id);
    const nuevos = editDetalles.filter(d => d.id < 0);

    setGuardandoEdit(true);
    try {
      // Delete removed items
      for (const orig of originales) {
        if (!editIds.includes(orig.id)) {
          await api.delete(`/pedidos/${pedidoSel.id}/items/${orig.id}`);
        }
      }

      // Update changed quantities
      for (const edit of editDetalles) {
        if (edit.id > 0) {
          const orig = originales.find((o: any) => o.id === edit.id);
          if (orig && orig.cantidad !== edit.cantidad) {
            await api.put(`/pedidos/${pedidoSel.id}/items/${edit.id}`, { cantidad: edit.cantidad });
          }
        }
      }

      // Add new items
      if (nuevos.length > 0) {
        await api.post(`/pedidos/${pedidoSel.id}/items`, {
          items: nuevos.map((n: any) => ({
            producto_id: n.producto_id,
            cantidad: n.cantidad,
            precio: Number(n.precio_unitario),
          })),
        });
      }

      const res = await api.get(`/pedidos/${pedidoSel.id}`);
      setPedidoSel(res.data);
      setEditMode(false);
      setEditDetalles([]);

      const resPedidos = await api.get('/pedidos');
      setPedidos(resPedidos.data);

      Alert.alert('Pedido actualizado', 'Los cambios se guardaron correctamente');
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join('. ')
        : (err.response?.data?.message || 'Error al guardar los cambios');
      Alert.alert('Error', msg);
    } finally {
      setGuardandoEdit(false);
    }
  };

  const eliminarItemEdit = (itemId: number) => {
    Alert.alert('Eliminar producto', '¿Eliminar este producto del pedido?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        setEditDetalles(prev => prev.filter(d => d.id !== itemId));
      }},
    ]);
  };

  const cambiarCantidadEdit = (itemId: number, delta: number) => {
    setEditDetalles(prev => prev.map(d => {
      if (d.id !== itemId) return d;
      const nueva = Math.max(1, d.cantidad + delta);
      return { ...d, cantidad: nueva };
    }));
  };

  const abrirAgregarProducto = async () => {
    try {
      const res = await api.get('/productos');
      setProductos(Array.isArray(res.data) ? res.data : []);
      setBusquedaProd('');
      setShowAddProd(true);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los productos');
    }
  };

  const agregarProductoAEdicion = (producto: Producto, cantidad: number) => {
    const existe = editDetalles.find(d => d.producto_id === producto.id);
    if (existe) {
      setEditDetalles(prev => prev.map(d =>
        d.id === existe.id ? { ...d, cantidad: d.cantidad + cantidad } : d
      ));
    } else {
      const nuevoId = -(Date.now() + Math.random());
      setEditDetalles(prev => [...prev, {
        id: nuevoId,
        producto_id: producto.id,
        cantidad,
        precio_unitario: Number(producto.precio),
        producto,
      }]);
    }
    setShowAddProd(false);
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busquedaProd.toLowerCase())
  );

  const totalEdit = editDetalles.reduce((sum, d) => sum + Number(d.precio_unitario) * d.cantidad, 0);

  const estadoPedido = pedidoSel?.estado;
  const puedeEditar = estadoPedido && !['cancelado', 'entregado'].includes(estadoPedido);

  if (cargando) return (
    <View style={styles.centro}>
      <ActivityIndicator size="large" color="#1B4F8A"/>
    </View>
  );

  return (
    <View style={styles.container}>
      {pedidos.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.emoji}>📋</Text>
          <Text style={styles.vacioTexto}>No hay pedidos todavía</Text>
        </View>
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={item => item.id.toString()}
          onRefresh={() => { setRefrescando(true); cargar(); }}
          refreshing={refrescando}
          renderItem={({ item }) => {
            const color = getColorEstado(item.estado);
            return (
              <TouchableOpacity style={styles.card} onPress={() => verDetalle(item.id)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
                  <View style={[styles.estadoBadge, { backgroundColor: color.bg }]}>
                    <Text style={[styles.estadoTexto, { color: color.text }]}>{item.estado}</Text>
                  </View>
                </View>
                <Text style={styles.cliente}>{item.usuario?.nombre}</Text>
                <Text style={styles.total}>Bs {Number(item.total).toFixed(2)}</Text>
                <Text style={styles.fecha}>{formatFecha(item.creado_en)}</Text>

                <View style={styles.botonesEstado}>
                  {['confirmado', 'enviado', 'entregado'].map(estado => (
                    <TouchableOpacity
                      key={estado}
                      style={[styles.botonEstado, item.estado === estado && styles.botonActivo]}
                      onPress={() => cambiarEstado(item.id, estado)}>
                      <Text style={[styles.botonEstadoTexto, item.estado === estado && styles.botonActivoTexto]}>
                        {estado}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.botonVolver} onPress={() => navigation.replace('Dashboard')}>
        <Text style={styles.botonVolverTexto}>Volver al inicio</Text>
      </TouchableOpacity>

      {/* Modal Detalle / Edición */}
      <Modal visible={!!pedidoSel} transparent animationType="slide">
        <View style={styles.modalFondo}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Pedido #{pedidoSel?.id}</Text>
              <TouchableOpacity onPress={() => { setPedidoSel(null); setQrImg(''); setEditMode(false); }}>
                <Text style={styles.modalCerrar}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            {!editMode ? (
              <>
                {/* VISTA NORMAL */}
                <ScrollView style={{ maxHeight: 320 }}>
                  {pedidoSel?.detalles?.map((d: any) => (
                    <View key={d.id} style={styles.detalleItem}>
                      <View style={styles.detalleImg}>
                        {d.producto?.imagen_url
                          ? <Image source={{ uri: getImagenUrl(d.producto.imagen_url)! }} style={styles.detalleImgInner} resizeMode="contain" />
                          : <Text style={styles.detalleImgPlaceholder}>📦</Text>
                        }
                      </View>
                      <View style={styles.detalleInfo}>
                        <Text style={styles.detalleNombre}>{d.producto?.nombre}</Text>
                        <Text style={styles.detalleCant}>{formatCantidad(d.cantidad)} x Bs {Number(d.precio_unitario).toFixed(2)}</Text>
                      </View>
                      <Text style={styles.detalleTotal}>Bs {(d.cantidad * Number(d.precio_unitario)).toFixed(2)}</Text>
                    </View>
                  ))}
                </ScrollView>

                <Text style={styles.totalFinal}>Total: Bs {Number(pedidoSel?.total).toFixed(2)}</Text>

                {puedeEditar && (
                  <TouchableOpacity style={styles.botonEditar} onPress={iniciarEdicion}>
                    <Text style={styles.botonEditarTexto}>✏️ Modificar pedido</Text>
                  </TouchableOpacity>
                )}

                {puedeEditar && (
                  <TouchableOpacity style={styles.botonEliminar} onPress={() => eliminarPedido(pedidoSel?.id)}>
                    <Text style={styles.botonEliminarTexto}>Eliminar pedido</Text>
                  </TouchableOpacity>
                )}

                {qrImg ? (
                  <View style={styles.qrContainer}>
                    <Image source={{ uri: qrImg }} style={styles.qrImg} />
                    <TouchableOpacity style={styles.botonDescargar} onPress={() => descargarPDF(pedidoSel?.id)}>
                      <Text style={styles.botonDescTexto}>Descargar PDF</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.botonQR} onPress={() => generarQR(pedidoSel?.id)}>
                    <Text style={styles.botonQRTexto}>Generar Factura QR</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                {/* VISTA EDICIÓN */}
                <ScrollView style={{ maxHeight: 320 }}>
                  {editDetalles.length === 0 ? (
                    <Text style={styles.editSinItems}>No hay productos en el pedido</Text>
                  ) : (
                    editDetalles.map((d: any) => (
                      <View key={d.id} style={styles.editItem}>
                        <View style={styles.editItemInfo}>
                          <Text style={styles.editItemNombre}>{d.producto?.nombre || `Producto #${d.producto_id}`}</Text>
                          <Text style={styles.editItemSub}>{formatCantidad(d.cantidad)} x Bs {Number(d.precio_unitario).toFixed(2)}</Text>
                          <Text style={styles.editItemTotal}>Bs {(d.cantidad * Number(d.precio_unitario)).toFixed(2)}</Text>
                        </View>
                        <View style={styles.editItemActions}>
                          <View style={styles.editCantControls}>
                            <TouchableOpacity style={styles.editCantBtn} onPress={() => cambiarCantidadEdit(d.id, -12)}>
                              <Text style={styles.editCantBtnTexto}>-12</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.editCantBtn} onPress={() => cambiarCantidadEdit(d.id, -6)}>
                              <Text style={styles.editCantBtnTexto}>-6</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.editCantBtn} onPress={() => cambiarCantidadEdit(d.id, -3)}>
                              <Text style={styles.editCantBtnTexto}>-3</Text>
                            </TouchableOpacity>
                            <Text style={styles.editCantNum}>{d.cantidad}</Text>
                            <TouchableOpacity style={styles.editCantBtn} onPress={() => cambiarCantidadEdit(d.id, 3)}>
                              <Text style={styles.editCantBtnTexto}>+3</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.editCantBtn} onPress={() => cambiarCantidadEdit(d.id, 6)}>
                              <Text style={styles.editCantBtnTexto}>+6</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.editCantBtn} onPress={() => cambiarCantidadEdit(d.id, 12)}>
                              <Text style={styles.editCantBtnTexto}>+12</Text>
                            </TouchableOpacity>
                          </View>
                          {d.id > 0 && (
                            <TouchableOpacity style={styles.editDeleteBtn} onPress={() => eliminarItemEdit(d.id)}>
                              <Text style={styles.editDeleteBtnTexto}>Eliminar</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>

                <TouchableOpacity style={styles.botonAgregarProd} onPress={abrirAgregarProducto}>
                  <Text style={styles.botonAgregarProdTexto}>+ Agregar producto</Text>
                </TouchableOpacity>

                <Text style={styles.totalFinal}>Total: Bs {totalEdit.toFixed(2)}</Text>

                <View style={styles.editBotones}>
                  <TouchableOpacity style={styles.botonSec} onPress={cancelarEdicion}>
                    <Text style={styles.botonSecTexto}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.botonPrim, guardandoEdit && styles.botonDisabled]}
                    disabled={guardandoEdit}
                    onPress={guardarEdicion}>
                    {guardandoEdit
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.botonPrimTexto}>Guardar cambios</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Agregar Producto a Pedido */}
      <Modal visible={showAddProd} transparent animationType="slide">
        <View style={styles.modalFondo}>
          <View style={styles.modal}>
            <Text style={styles.modalTitulo}>Agregar producto</Text>
            <TextInput
              style={styles.buscador}
              placeholder="Buscar productos..."
              value={busquedaProd}
              onChangeText={setBusquedaProd}
            />
            <FlatList
              data={productosFiltrados}
              keyExtractor={item => item.id.toString()}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <View style={styles.addProdItem}>
                  <View style={styles.addProdInfo}>
                    <Text style={styles.addProdNombre}>{item.nombre}</Text>
                    <Text style={styles.addProdPrecio}>Bs {Number(item.precio).toFixed(2)}</Text>
                  </View>
                  <View style={styles.addProdBtns}>
                    <TouchableOpacity style={styles.addProdBtn} onPress={() => agregarProductoAEdicion(item, 3)}>
                      <Text style={styles.addProdBtnTexto}>+3</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addProdBtn} onPress={() => agregarProductoAEdicion(item, 6)}>
                      <Text style={styles.addProdBtnTexto}>+6</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addProdBtn} onPress={() => agregarProductoAEdicion(item, 12)}>
                      <Text style={styles.addProdBtnTexto}>+12</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.vacioTexto}>Sin resultados</Text>}
            />
            <TouchableOpacity style={styles.botonSec} onPress={() => setShowAddProd(false)}>
              <Text style={styles.botonSecTexto}>Cerrar</Text>
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
  emoji: { fontSize: 64, marginBottom: 16 },
  vacioTexto: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pedidoId: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  estadoBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  estadoTexto: { fontSize: 13, fontWeight: '600' },
  cliente: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  total: { fontSize: 20, fontWeight: 'bold', color: '#1B4F8A', marginBottom: 4 },
  fecha: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  botonesEstado: { flexDirection: 'row', gap: 8 },
  botonEstado: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 8, alignItems: 'center' },
  botonActivo: { backgroundColor: '#1B4F8A', borderColor: '#1B4F8A' },
  botonEstadoTexto: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  botonActivoTexto: { color: '#fff' },
  botonVolver: { backgroundColor: '#1B4F8A', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  botonVolverTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitulo: { fontSize: 20, fontWeight: 'bold' },
  modalCerrar: { color: '#1B4F8A', fontSize: 16 },
  detalleItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detalleImg: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  detalleImgInner: { width: 48, height: 48, borderRadius: 8 },
  detalleImgPlaceholder: { fontSize: 24 },
  detalleInfo: { flex: 1 },
  detalleNombre: { fontSize: 15, fontWeight: '600' },
  detalleCant: { fontSize: 13, color: '#64748b', marginTop: 2 },
  detalleTotal: { fontSize: 15, fontWeight: 'bold' },
  totalFinal: { fontSize: 22, fontWeight: 'bold', color: '#1B4F8A', textAlign: 'center', marginVertical: 16 },
  qrContainer: { alignItems: 'center', marginBottom: 16 },
  qrImg: { width: 200, height: 200 },
  botonQR: { backgroundColor: '#27AE60', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  botonQRTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonDescargar: { backgroundColor: '#2C3E50', borderRadius: 12, padding: 14, alignItems: 'center', width: '100%', marginTop: 8 },
  botonDescTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Edit mode
  botonEditar: { backgroundColor: '#1B4F8A', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  botonEditarTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonEliminar: { backgroundColor: '#FFDDD9', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  botonEliminarTexto: { color: '#C0392B', fontWeight: 'bold', fontSize: 16 },
  editSinItems: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingVertical: 20 },
  editItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  editItemInfo: { marginBottom: 8 },
  editItemNombre: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  editItemSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  editItemTotal: { fontSize: 14, fontWeight: 'bold', color: '#1B4F8A', marginTop: 2 },
  editItemActions: {},
  editCantControls: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  editCantBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  editCantBtnTexto: { fontSize: 11, fontWeight: 'bold', color: '#1B4F8A' },
  editCantNum: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginHorizontal: 6, minWidth: 24, textAlign: 'center' },
  editDeleteBtn: { backgroundColor: '#FFDDD9', borderRadius: 8, padding: 6, alignItems: 'center', marginTop: 6 },
  editDeleteBtnTexto: { color: '#C0392B', fontWeight: '600', fontSize: 12 },
  botonAgregarProd: { borderWidth: 1, borderColor: '#1B4F8A', borderStyle: 'dashed', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 4 },
  botonAgregarProdTexto: { color: '#1B4F8A', fontWeight: 'bold', fontSize: 15 },
  editBotones: { flexDirection: 'row', gap: 12, marginTop: 4 },

  // Shared buttons
  botonPrim: { flex: 1, backgroundColor: '#1B4F8A', borderRadius: 12, padding: 14, alignItems: 'center' },
  botonPrimTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  botonSec: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: '#fff' },
  botonSecTexto: { color: '#64748b', fontWeight: '600', fontSize: 15 },
  botonDisabled: { opacity: 0.5 },
  buscador: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 15 },

  // Add product modal
  addProdItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  addProdInfo: { flex: 1 },
  addProdNombre: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  addProdPrecio: { fontSize: 13, color: '#1B4F8A', fontWeight: 'bold', marginTop: 2 },
  addProdBtns: { flexDirection: 'row', gap: 4 },
  addProdBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#1B4F8A' },
  addProdBtnTexto: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});
