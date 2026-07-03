import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal, Image,
  Linking, ScrollView, Share
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { NavProps } from '../lib/navigation';
import { descargarPDF as descargarPDFUtil } from '../lib/utils';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://web-production-c811d.up.railway.app';
const WHATSAPP_NUMERO = process.env.EXPO_PUBLIC_WHATSAPP || '59170000000';

const getImagenUrl = (url?: string) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url}`;
};

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imagen_url?: string;
}

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

export default function NuevoPedidoScreen({ navigation }: NavProps) {
  const [paso, setPaso] = useState(1);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [busquedaCli, setBusquedaCli] = useState('');
  const [clienteSel, setClienteSel] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState<any>(null);
  const [qrData, setQrData] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [showRegistroCli, setShowRegistroCli] = useState(false);
  const [formCli, setFormCli] = useState({ nombre: '', telefono: '', carnet: '', ubicacion: '' });
  const [showCantModal, setShowCantModal] = useState(false);
  const [prodSeleccionado, setProdSeleccionado] = useState<Producto | null>(null);
  const [cantDocenas, setCantDocenas] = useState('1');

  useEffect(() => {
    api.get('/productos')
      .then(res => setProductos(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProductos([]))
      .finally(() => setCargando(false));
  }, []);

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busquedaCli.toLowerCase()) ||
    (c.carnet || '').includes(busquedaCli)
  );

  const agregarAlCarrito = (producto: Producto, cantidad: number) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.producto.id === producto.id);
      if (existe) {
        return prev.map(i =>
          i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + cantidad } : i
        );
      }
      return [...prev, { producto, cantidad }];
    });
    setShowCantModal(false);
    setProdSeleccionado(null);
    setCantDocenas('1');
  };

  const abrirSelectorCant = (producto: Producto) => {
    setProdSeleccionado(producto);
    setCantDocenas('1');
    setShowCantModal(true);
  };

  const formatCantidad = (cant: number) => {
    const docenas = Math.floor(cant / 12);
    const unidades = cant % 12;
    if (docenas > 0 && unidades > 0) return `${docenas} doc + ${unidades}u`;
    if (docenas > 0) return `${docenas} doc${docenas > 1 ? 's' : ''} (${cant}u)`;
    return `${cant} u`;
  };

  const cambiarCantidad = (id: number, delta: number) => {
    setCarrito(prev => {
      const item = prev.find(i => i.producto.id === id);
      if (!item) return prev;
      const nueva = item.cantidad + delta;
      if (nueva <= 0) return prev.filter(i => i.producto.id !== id);
      return prev.map(i => i.producto.id === id ? { ...i, cantidad: nueva } : i);
    });
  };

  const totalCarrito = carrito.reduce((sum, i) => sum + i.producto.precio * i.cantidad, 0);
  const totalItems = carrito.reduce((sum, i) => sum + i.cantidad, 0);

  const buscarClientes = useCallback(async () => {
    try {
      const res = await api.get('/clientes');
      setClientes(Array.isArray(res.data) ? res.data : []);
    } catch {
      setClientes([]);
    }
  }, []);

  useEffect(() => {
    if (paso === 3) buscarClientes();
  }, [paso, buscarClientes]);

  const registrarCliente = async () => {
    if (!formCli.nombre) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }
    try {
      const res = await api.post('/clientes', formCli);
      setClienteSel(res.data);
      setShowRegistroCli(false);
      setFormCli({ nombre: '', telefono: '', carnet: '', ubicacion: '' });
      buscarClientes();
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message) ? err.response.data.message.join('. ') : (err.response?.data?.message || 'Error al registrar cliente');
      Alert.alert('Error', msg);
    }
  };

  const guardarPedido = async () => {
    if (!clienteSel) {
      Alert.alert('Error', 'Seleccioná un cliente');
      return;
    }
    if (carrito.length === 0) {
      Alert.alert('Error', 'Agregá al menos un producto');
      return;
    }
    setGuardando(true);
    try {
      const res = await api.post('/pedidos', {

        usuarioId: clienteSel.id,
        items: carrito.map(i => ({
          producto_id: i.producto.id,
          cantidad: i.cantidad,
          precio: Number(i.producto.precio),
        })),
        notas: `Pedido desde app móvil - Cliente: ${clienteSel.nombre}`,
      });
      setPedidoCreado(res.data);

      const qrRes = await api.get(`/pedidos/${res.data.id}/factura/qr`);
      setQrData(qrRes.data.qr);
      setPdfUrl(qrRes.data.pdf_url);
      setPaso(5);
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join('. ')
        : (err.response?.data?.message || 'Error al guardar pedido');
      Alert.alert('Error', msg);
    } finally {
      setGuardando(false);
    }
  };

  const downloadPDF = async (): Promise<string | null> => {
    try {
      const token = await AsyncStorage.getItem('token');
      const fileUri = FileSystem.documentDirectory + `factura_${pedidoCreado.id}.pdf`;
      return await descargarPDFUtil(pdfUrl, fileUri, token);
    } catch (err: any) {
      console.error('[downloadPDF] Error:', err.message);
      Alert.alert('Error', err.message || 'No se pudo descargar el PDF');
      return null;
    }
  };

  const compartirWhatsApp = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Compartir no está disponible en este dispositivo');
        return;
      }
      const fileUri = await downloadPDF();
      if (fileUri) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Factura Pedido #${pedidoCreado.id}`,
        });
      }
    } catch (err: any) {
      console.error('[compartirWhatsApp] Error:', err.message);
      try {
        await Share.share({
          message: `Factura Pedido #${pedidoCreado.id}\nTotal: Bs${Number(pedidoCreado.total).toFixed(2)}\nDescargá la factura desde la app.`,
        });
      } catch {}
    }
  };

  const descargarPDF = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const fileUri = FileSystem.documentDirectory + `factura_${pedidoCreado.id}.pdf`;
      const uri = await descargarPDFUtil(pdfUrl, fileUri, token);
      Alert.alert('PDF descargado', `Factura guardada en: ${uri}`);
    } catch (err: any) {
      console.error('[descargarPDF] Error:', err.message);
      Alert.alert('Error', err.message || 'No se pudo descargar el PDF');
    }
  };

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#1B4F8A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con pasos */}
      <View style={styles.steps}>
        {['Productos', 'Carrito', 'Cliente', 'Confirmar', 'Factura'].slice(0, paso < 5 ? paso : 5).map((s, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[styles.stepCirculo, i === paso - 1 && styles.stepActivo]}>
              <Text style={[styles.stepNum, i === paso - 1 && styles.stepNumActivo]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, i === paso - 1 && styles.stepLabelActivo]}>{s}</Text>
          </View>
        ))}
      </View>

      {/* Paso 1: Productos */}
      {paso === 1 && (
        <>
          <TextInput
            style={styles.buscador}
            placeholder="Buscar productos..."
            value={busqueda}
            onChangeText={setBusqueda}
          />
          <FlatList
            data={productosFiltrados}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => {
              const enCarrito = carrito.find(i => i.producto.id === item.id);
              return (
                <View style={styles.prodItem}>
                  <View style={styles.prodImgContainer}>
                    {item.imagen_url
                      ? <Image source={{ uri: getImagenUrl(item.imagen_url)! }} style={styles.prodImg} resizeMode="contain" />
                      : <Text style={styles.prodImgPlaceholder}>📦</Text>
                    }
                  </View>
                  <View style={styles.prodInfo}>
                    <Text style={styles.prodNombre}>{item.nombre}</Text>
                    <Text style={styles.prodPrecio}>Bs {Number(item.precio).toFixed(2)}</Text>
                  </View>
                  {enCarrito ? (
                    <View style={styles.prodCantControls}>
                      <TouchableOpacity style={styles.prodCantBtn} onPress={() => cambiarCantidad(item.id, -3)}>
                        <Text style={styles.prodCantBtnTexto}>-3</Text>
                      </TouchableOpacity>
                      <Text style={styles.prodCantNum}>{enCarrito.cantidad}</Text>
                      <TouchableOpacity style={styles.prodCantBtn} onPress={() => cambiarCantidad(item.id, 3)}>
                        <Text style={styles.prodCantBtnTexto}>+3</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.prodAddBtn} onPress={() => abrirSelectorCant(item)}>
                      <Text style={styles.prodAddBtnTexto}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
          <View style={styles.footerBtns}>
            <TouchableOpacity style={styles.botonSec} onPress={() => navigation.goBack()}>
              <Text style={styles.botonSecTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.botonPrim, carrito.length === 0 && styles.botonDisabled]} disabled={carrito.length === 0} onPress={() => setPaso(2)}>
              <Text style={styles.botonPrimTexto}>Ir al carrito ({totalItems})</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Paso 2: Carrito */}
      {paso === 2 && (
        <ScrollView style={{ flex: 1 }}>
          {carrito.length === 0 ? (
            <View style={styles.centro}>
              <Text style={styles.vacioTexto}>Carrito vacío</Text>
              <TouchableOpacity style={styles.botonPrim} onPress={() => setPaso(1)}>
                <Text style={styles.botonPrimTexto}>Agregar productos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {carrito.map(item => (
                <View key={item.producto.id} style={styles.cartItem}>
                  <View style={styles.cartTopRow}>
                    <View style={styles.cartProdInfo}>
                      <Text style={styles.cartProdNombre} numberOfLines={1} ellipsizeMode="tail">{item.producto.nombre}</Text>
                      <Text style={styles.cartProdPrecio}>Bs {Number(item.producto.precio).toFixed(2)} c/u</Text>
                    </View>
                    <Text style={styles.cartSubtotal}>Bs {(item.producto.precio * item.cantidad).toFixed(2)}</Text>
                  </View>
                  <View style={styles.cartBottomRow}>
                    <Text style={styles.cartCant}>{formatCantidad(item.cantidad)}</Text>
                    <View style={styles.cartControles}>
                      <TouchableOpacity style={styles.cartBtn} onPress={() => cambiarCantidad(item.producto.id, -12)}>
                        <Text style={styles.cartBtnTexto}>-12</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cartBtn} onPress={() => cambiarCantidad(item.producto.id, -6)}>
                        <Text style={styles.cartBtnTexto}>-6</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cartBtn} onPress={() => cambiarCantidad(item.producto.id, -3)}>
                        <Text style={styles.cartBtnTexto}>-3</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cartBtn} onPress={() => cambiarCantidad(item.producto.id, 3)}>
                        <Text style={styles.cartBtnTexto}>+3</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cartBtn} onPress={() => cambiarCantidad(item.producto.id, 6)}>
                        <Text style={styles.cartBtnTexto}>+6</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cartBtn} onPress={() => cambiarCantidad(item.producto.id, 12)}>
                        <Text style={styles.cartBtnTexto}>+12</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalMonto}>Bs {totalCarrito.toFixed(2)}</Text>
              </View>
            </>
          )}
          <View style={styles.footerBtns}>
            <TouchableOpacity style={styles.botonSec} onPress={() => setPaso(1)}>
              <Text style={styles.botonSecTexto}>Volver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.botonPrim, carrito.length === 0 && styles.botonDisabled]} disabled={carrito.length === 0} onPress={() => setPaso(3)}>
              <Text style={styles.botonPrimTexto}>Seleccionar cliente</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Paso 3: Cliente */}
      {paso === 3 && (
        <>
          <TextInput
            style={styles.buscador}
            placeholder="Buscar cliente por nombre o carnet..."
            value={busquedaCli}
            onChangeText={setBusquedaCli}
          />
          {clientesFiltrados.length === 0 ? (
            <View style={styles.centro}>
              <Text style={styles.vacioTexto}>No hay clientes disponibles</Text>
              <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>
                Registrá un nuevo cliente usando el botón de abajo
              </Text>
            </View>
          ) : (
            <FlatList
              data={clientesFiltrados}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.cliItem, clienteSel?.id === item.id && styles.cliItemSel]}
                  onPress={() => setClienteSel(item)}>
                  <View style={styles.cliAvatar}>
                    <Text style={styles.cliAvatarTexto}>{item.nombre?.charAt(0)?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={styles.cliInfo}>
                    <Text style={styles.cliNombre}>{item.nombre}</Text>
                    {item.carnet ? <Text style={styles.cliCarnet}>Carnet: {item.carnet}</Text> : null}
                  </View>
                  {clienteSel?.id === item.id && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity style={styles.botonLink} onPress={() => setShowRegistroCli(true)}>
            <Text style={styles.botonLinkTexto}>+ Registrar nuevo cliente</Text>
          </TouchableOpacity>

          {clienteSel && (
            <View style={styles.cliSeleccionado}>
              <Text style={styles.cliSelLabel}>Cliente seleccionado:</Text>
              <Text style={styles.cliSelNombre}>{clienteSel.nombre}</Text>
              {clienteSel.carnet ? <Text style={styles.cliSelDetalle}>Carnet: {clienteSel.carnet}</Text> : null}
              {clienteSel.ubicacion ? <Text style={styles.cliSelDetalle}>Ubicación: {clienteSel.ubicacion}</Text> : null}
            </View>
          )}

          <View style={styles.footerBtns}>
            <TouchableOpacity style={styles.botonSec} onPress={() => setPaso(2)}>
              <Text style={styles.botonSecTexto}>Volver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.botonPrim, !clienteSel && styles.botonDisabled]}
              disabled={!clienteSel}
              onPress={() => setPaso(4)}>
              <Text style={styles.botonPrimTexto}>Confirmar pedido</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Paso 4: Confirmar */}
      {paso === 4 && (
        <ScrollView style={{ flex: 1 }}>
          <Text style={styles.confirmTitulo}>Resumen del pedido</Text>

          <View style={styles.confirmCliBox}>
            <Text style={styles.confirmCliLabel}>Cliente:</Text>
            <Text style={styles.confirmCliNombre}>{clienteSel?.nombre}</Text>
            {clienteSel?.carnet ? <Text style={styles.confirmCliDetalle}>Carnet: {clienteSel.carnet}</Text> : null}
            {clienteSel?.ubicacion ? <Text style={styles.confirmCliDetalle}>Ubicación: {clienteSel.ubicacion}</Text> : null}
          </View>

          <View style={styles.confirmTable}>
            <View style={styles.confirmTableHeader}>
              <Text style={[styles.confirmTH, { flex: 2 }]}>Producto</Text>
              <Text style={[styles.confirmTH, { flex: 1, textAlign: 'center' }]}>Cant</Text>
              <Text style={[styles.confirmTH, { flex: 1, textAlign: 'right' }]}>Precio</Text>
              <Text style={[styles.confirmTH, { flex: 1, textAlign: 'right' }]}>Subtotal</Text>
            </View>
            {carrito.map(item => (
              <View key={item.producto.id} style={styles.confirmRow}>
                <Text style={[styles.confirmTD, { flex: 2 }]}>{item.producto.nombre}</Text>
                <Text style={[styles.confirmTD, { flex: 1, textAlign: 'center' }]}>{formatCantidad(item.cantidad)}</Text>
                <Text style={[styles.confirmTD, { flex: 1, textAlign: 'right' }]}>Bs {Number(item.producto.precio).toFixed(2)}</Text>
                <Text style={[styles.confirmTD, { flex: 1, textAlign: 'right' }]}>Bs {(item.producto.precio * item.cantidad).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.confirmTotal}>
            <Text style={styles.confirmTotalLabel}>TOTAL</Text>
            <Text style={styles.confirmTotalMonto}>Bs {totalCarrito.toFixed(2)}</Text>
          </View>

          <View style={styles.footerBtns}>
            <TouchableOpacity style={styles.botonSec} onPress={() => setPaso(3)}>
              <Text style={styles.botonSecTexto}>Volver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.botonPrim, guardando && styles.botonDisabled]}
              disabled={guardando}
              onPress={guardarPedido}>
              {guardando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.botonPrimTexto}>Guardar Pedido</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Paso 5: Factura PDF */}
      {paso === 5 && pedidoCreado && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.facturaContainer}>
          <Text style={styles.facturaTitulo}>✅ Pedido Creado</Text>
          <Text style={styles.facturaNum}>Pedido #{pedidoCreado.id}</Text>
          <Text style={styles.facturaTotal}>Total: Bs {Number(pedidoCreado.total).toFixed(2)}</Text>

          <TouchableOpacity style={styles.botonDescargar} onPress={descargarPDF}>
            <Text style={styles.botonDescTexto}>Descargar Factura PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botonWhatsApp} onPress={compartirWhatsApp}>
            <Text style={styles.botonWATexto}>Compartir Factura</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Modal Seleccionar Cantidad */}
      <Modal visible={showCantModal} transparent animationType="slide">
        <View style={styles.modalFondo}>
          <View style={styles.modal}>
            <Text style={styles.modalTitulo}>Agregar: {prodSeleccionado?.nombre}</Text>
            <Text style={styles.modalPrecio}>Bs {Number(prodSeleccionado?.precio).toFixed(2)} c/u</Text>

            <TouchableOpacity style={styles.cantOptBtn} onPress={() => prodSeleccionado && agregarAlCarrito(prodSeleccionado, 3)}>
              <Text style={styles.cantOptBtnTexto}>3 Unidades</Text>
              <Text style={styles.cantOptSub}>Bs {(3 * Number(prodSeleccionado?.precio || 0)).toFixed(2)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cantOptBtn} onPress={() => prodSeleccionado && agregarAlCarrito(prodSeleccionado, 6)}>
              <Text style={styles.cantOptBtnTexto}>6 Unidades</Text>
              <Text style={styles.cantOptSub}>Bs {(6 * Number(prodSeleccionado?.precio || 0)).toFixed(2)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cantOptBtn} onPress={() => prodSeleccionado && agregarAlCarrito(prodSeleccionado, 12)}>
              <Text style={styles.cantOptBtnTexto}>1 Docena (12 unidades)</Text>
              <Text style={styles.cantOptSub}>Bs {(12 * Number(prodSeleccionado?.precio || 0)).toFixed(2)}</Text>
            </TouchableOpacity>

            <View style={styles.cantCustomRow}>
              <Text style={styles.cantCustomLabel}>Docenas:</Text>
              <TextInput
                style={styles.cantCustomInput}
                keyboardType="numeric"
                value={cantDocenas}
                onChangeText={t => setCantDocenas(t.replace(/[^0-9]/g, ''))}
              />
              <TouchableOpacity
                style={styles.cantCustomBtn}
                onPress={() => {
                  const doc = parseInt(cantDocenas, 10);
                  if (doc > 0 && prodSeleccionado) agregarAlCarrito(prodSeleccionado, doc * 12);
                }}>
                <Text style={styles.cantCustomBtnTexto}>Agregar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.botonSec} onPress={() => { setShowCantModal(false); setProdSeleccionado(null); }}>
              <Text style={styles.botonSecTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Registro Cliente */}
      <Modal visible={showRegistroCli} transparent animationType="slide">
        <View style={styles.modalFondo}>
          <View style={styles.modal}>
            <Text style={styles.modalTitulo}>Registrar Cliente</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nombre *"
              placeholderTextColor="#9ca3af"
              value={formCli.nombre}
              onChangeText={t => setFormCli({ ...formCli, nombre: t })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Carnet / CI"
              placeholderTextColor="#9ca3af"
              value={formCli.carnet}
              onChangeText={t => setFormCli({ ...formCli, carnet: t })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Teléfono"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              value={formCli.telefono}
              onChangeText={t => setFormCli({ ...formCli, telefono: t })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Ubicación / Dirección"
              placeholderTextColor="#9ca3af"
              value={formCli.ubicacion}
              onChangeText={t => setFormCli({ ...formCli, ubicacion: t })}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.botonSec} onPress={() => setShowRegistroCli(false)}>
                <Text style={styles.botonSecTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonPrim} onPress={registrarCliente}>
                <Text style={styles.botonPrimTexto}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  vacioTexto: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 16 },

  // Steps
  steps: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, position: 'relative' },
  stepItem: { alignItems: 'center', marginRight: 20 },
  stepCirculo: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  stepActivo: { backgroundColor: '#1B4F8A' },
  stepNum: { fontSize: 13, fontWeight: 'bold', color: '#94a3b8' },
  stepNumActivo: { color: '#fff' },
  stepLabel: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  stepLabelActivo: { color: '#1B4F8A', fontWeight: '600' },

  // Buscador
  buscador: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16 },

  // Productos
  prodItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  prodImgContainer: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  prodImg: { width: 48, height: 48, borderRadius: 8 },
  prodImgPlaceholder: { fontSize: 24 },
  prodInfo: { flex: 1 },
  prodNombre: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  prodPrecio: { fontSize: 14, color: '#1B4F8A', fontWeight: 'bold', marginTop: 2 },
  prodCantControls: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  prodCantBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1B4F8A', justifyContent: 'center', alignItems: 'center' },
  prodCantBtnTexto: { color: '#fff', fontSize: 18, fontWeight: 'bold', lineHeight: 20 },
  prodCantNum: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 8, minWidth: 20, textAlign: 'center', color: '#1e293b' },
  prodAddBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1B4F8A', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  prodAddBtnTexto: { color: '#fff', fontSize: 18, fontWeight: 'bold', lineHeight: 20 },

  // Botones pie
  footerBtns: { flexDirection: 'row', gap: 12, marginTop: 16, paddingBottom: 20 },
  botonPrim: { flex: 1, backgroundColor: '#1B4F8A', borderRadius: 12, padding: 16, alignItems: 'center' },
  botonPrimTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonSec: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, alignItems: 'center', backgroundColor: '#fff' },
  botonSecTexto: { color: '#64748b', fontWeight: '600', fontSize: 16 },
  botonDisabled: { opacity: 0.5 },
  botonLink: { alignItems: 'center', padding: 12, marginTop: 4 },
  botonLinkTexto: { color: '#1B4F8A', fontWeight: '600', fontSize: 15 },

  // Carrito
  cartItem: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  cartTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cartProdInfo: { flex: 1, marginRight: 8 },
  cartProdNombre: { fontSize: 14, fontWeight: '600', color: '#1e293b', flexShrink: 1 },
  cartProdPrecio: { fontSize: 12, color: '#1B4F8A', fontWeight: 'bold', marginTop: 2 },
  cartBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartControles: { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' },
  cartBtn: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  cartBtnTexto: { fontSize: 11, fontWeight: 'bold', color: '#1B4F8A' },
  cartCant: { fontSize: 13, fontWeight: 'bold', color: '#1e293b', marginRight: 8 },
  cartSubtotal: { fontSize: 15, fontWeight: 'bold', color: '#1B4F8A', textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1B4F8A', borderRadius: 12, padding: 16, marginTop: 8 },
  totalLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  totalMonto: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  // Cliente
  cliItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  cliItemSel: { borderColor: '#1B4F8A', backgroundColor: '#EBF4FB' },
  cliAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1B4F8A', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cliAvatarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cliInfo: { flex: 1 },
  cliNombre: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  cliCarnet: { fontSize: 12, color: '#64748b', marginTop: 2 },

  checkIcon: { fontSize: 20, color: '#27AE60', fontWeight: 'bold' },
  cliSeleccionado: { backgroundColor: '#D4EDDA', borderRadius: 12, padding: 12, marginTop: 8 },
  cliSelLabel: { fontSize: 12, color: '#155724', fontWeight: '600' },
  cliSelNombre: { fontSize: 16, fontWeight: 'bold', color: '#155724', marginTop: 2 },
  cliSelDetalle: { fontSize: 13, color: '#155724', marginTop: 1 },

  // Confirmar
  confirmTitulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  confirmCliBox: { backgroundColor: '#EBF4FB', borderRadius: 12, padding: 12, marginBottom: 12 },
  confirmCliLabel: { fontSize: 12, color: '#1B4F8A', fontWeight: '600' },
  confirmCliNombre: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 2 },
  confirmCliDetalle: { fontSize: 13, color: '#64748b', marginTop: 1 },
  confirmTable: { marginBottom: 12 },
  confirmTableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: '#e2e8f0' },
  confirmTH: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  confirmRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  confirmTD: { fontSize: 13, color: '#1e293b' },
  confirmTotal: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1B4F8A', borderRadius: 12, padding: 16, marginBottom: 8 },
  confirmTotalLabel: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  confirmTotalMonto: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  // Factura QR
  facturaContainer: { alignItems: 'center', paddingVertical: 20 },
  facturaTitulo: { fontSize: 22, fontWeight: 'bold', color: '#27AE60', marginBottom: 4 },
  facturaNum: { fontSize: 18, color: '#1e293b', marginBottom: 4 },
  facturaTotal: { fontSize: 28, fontWeight: 'bold', color: '#1B4F8A', marginBottom: 20 },
  qrBox: { alignItems: 'center', marginBottom: 20 },
  qrImg: { width: 200, height: 200 },
  qrLabel: { fontSize: 12, color: '#64748b', marginTop: 8, textAlign: 'center' },

  botonDescargar: { backgroundColor: '#2C3E50', borderRadius: 12, padding: 16, alignItems: 'center', width: '100%', marginBottom: 8 },
  botonDescTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonWhatsApp: { backgroundColor: '#25D366', borderRadius: 12, padding: 16, alignItems: 'center', width: '100%', marginBottom: 8 },
  botonWATexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonCompartir: { backgroundColor: '#1B4F8A', borderRadius: 12, padding: 16, alignItems: 'center', width: '100%', marginBottom: 12 },
  botonCompTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Modal
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  modalPrecio: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  modalInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16, color: '#1e293b' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },

  cantOptBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EBF4FB', borderRadius: 12, padding: 16, marginBottom: 8 },
  cantOptBtnTexto: { fontSize: 16, fontWeight: '600', color: '#1B4F8A' },
  cantOptSub: { fontSize: 14, color: '#1B4F8A', fontWeight: 'bold' },
  cantCustomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  cantCustomLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  cantCustomInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 16, textAlign: 'center' },
  cantCustomBtn: { backgroundColor: '#1B4F8A', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  cantCustomBtnTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
