import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo?: boolean;
}

interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  setAuth: (usuario: Usuario, token: string) => void;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  token: null,
  setAuth: (usuario, token) => {
    set({ usuario, token });
  },
  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('usuario');
    set({ usuario: null, token: null });
  },
  loadFromStorage: async () => {
    const token = await AsyncStorage.getItem('token');
    const usuarioStr = await AsyncStorage.getItem('usuario');
    if (token && usuarioStr) {
      try {
        set({ token, usuario: JSON.parse(usuarioStr) });
      } catch {}
    }
  },
}));
