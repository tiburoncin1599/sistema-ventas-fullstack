import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Stock: undefined;
  Alertas: undefined;
  Pedidos: undefined;
  Clientes: undefined;
  NuevoPedido: undefined;
  Catalogo: undefined;
};

export type NavProps = NativeStackScreenProps<RootStackParamList>;
