'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

function suscribir(onChange: () => void) {
  window.addEventListener('dark-change', onChange);
  return () => window.removeEventListener('dark-change', onChange);
}

function obtenerSnapshot() {
  return document.documentElement.classList.contains('dark');
}

function obtenerSnapshotServidor() {
  return false;
}

export default function DarkModeToggle() {
  const dark = useSyncExternalStore(suscribir, obtenerSnapshot, obtenerSnapshotServidor);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('dark', String(next));
    window.dispatchEvent(new Event('dark-change'));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="prolimal-icon-btn"
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
