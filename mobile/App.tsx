import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import StockScreen from './screens/StockScreen';
import AlertasScreen from './screens/AlertasScreen';
import PedidosScreen from './screens/PedidosScreen';
import ClientesScreen from './screens/ClientesScreen';
import NuevoPedidoScreen from './screens/NuevoPedidoScreen';
import CatalogoScreen from './screens/CatalogoScreen';
import { useAuthStore } from './store/auth';
import { setOnUnauthorized } from './lib/api';

export type { NavProps } from './lib/navigation';

const Stack = createNativeStackNavigator();

function AuthGate() {
  const { token, loadFromStorage, logout } = useAuthStore();
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setOnUnauthorized(() => logout());
  }, [logout]);

  useEffect(() => {
    loadFromStorage().finally(() => setCargando(false));
  }, [loadFromStorage]);

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#1B4F8A" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Stock" component={StockScreen} />
          <Stack.Screen name="Alertas" component={AlertasScreen} />
          <Stack.Screen name="Pedidos" component={PedidosScreen} />
          <Stack.Screen name="Clientes" component={ClientesScreen} />
          <Stack.Screen name="NuevoPedido" component={NuevoPedidoScreen} />
          <Stack.Screen name="Catalogo" component={CatalogoScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthGate />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
