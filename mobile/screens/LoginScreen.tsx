import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { NavProps } from '../lib/navigation';
import { useAuthStore } from '../store/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://web-production-c811d.up.railway.app';

export default function LoginScreen({ navigation }: NavProps) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  const login = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }
    setCargando(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      await AsyncStorage.setItem('token', res.data.token);
      await AsyncStorage.setItem('usuario', JSON.stringify(res.data.usuario));
      setAuth(res.data.usuario, res.data.token);
      navigation.replace('Dashboard');
    } catch (error: any) {
      if (error.response) {
        Alert.alert('Error', error.response.data?.message || 'Credenciales incorrectas');
      } else if (error.request) {
        Alert.alert('Error de conexión', 'No se pudo conectar al servidor. Verificá la IP en app-movil/.env');
      } else {
        Alert.alert('Error', 'Ocurrió un error inesperado');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Panel de Ventas</Text>
      <Text style={styles.subtitulo}>Iniciá sesión para continuar</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!mostrarPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setMostrarPassword(!mostrarPassword)}>
          <Text style={styles.eyeIcon}>{mostrarPassword ? '👁' : '👁‍🗨'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.boton}
        onPress={login}
        disabled={cargando}>
        {cargando
          ? <ActivityIndicator color="#fff"/>
          : <Text style={styles.botonTexto}>Ingresar</Text>
        }
      </TouchableOpacity>

      <View style={styles.separador}>
        <View style={styles.separadorLinea} />
        <Text style={styles.separadorTexto}>o continuá con</Text>
        <View style={styles.separadorLinea} />
      </View>

      <TouchableOpacity
        style={styles.googleBoton}
        onPress={() => Linking.openURL(`${API_URL}/auth/google`)}>
        <Text style={styles.googleBotonTexto}>Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  titulo: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#1B4F8A', marginBottom: 8 },
  subtitulo: { fontSize: 16, textAlign: 'center', color: '#64748b', marginBottom: 32 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginBottom: 16 },
  passwordInput: { flex: 1, padding: 16, fontSize: 16 },
  eyeButton: { padding: 16 },
  eyeIcon: { fontSize: 20 },
  boton: { backgroundColor: '#1B4F8A', borderRadius: 12, padding: 16, alignItems: 'center' },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  separador: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  separadorLinea: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  separadorTexto: { marginHorizontal: 12, color: '#94a3b8', fontSize: 14 },
  googleBoton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, alignItems: 'center' },
  googleBotonTexto: { color: '#1e293b', fontSize: 16, fontWeight: '600' },
});