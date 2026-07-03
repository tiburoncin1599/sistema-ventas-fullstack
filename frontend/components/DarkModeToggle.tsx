'use client';
import { useState, useEffect } from 'react';

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('dark', String(next));
  };

  return (
    <button
      onClick={toggle}
      className="text-sm px-2.5 py-1.5 rounded-lg font-semibold transition-colors
        text-white/80 hover:text-white hover:bg-white/10
        dark:text-yellow-300 dark:hover:bg-yellow-800/30"
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      {dark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
    </button>
  );
}
