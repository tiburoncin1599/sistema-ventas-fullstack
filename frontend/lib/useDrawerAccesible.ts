'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';

const SELECTOR_ENFOCABLES =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

interface OpcionesDrawer {
  abierto: boolean;
  onCerrar: () => void;
  panelRef: RefObject<HTMLElement | null>;
  restaurarFoco?: boolean;
  bloquearScroll?: boolean;
}

function obtenerEnfocables(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)).filter(
    (elemento) =>
      !elemento.hasAttribute('disabled') &&
      elemento.getAttribute('aria-hidden') !== 'true' &&
      elemento.tabIndex !== -1,
  );
}

export function useDrawerAccesible({
  abierto,
  onCerrar,
  panelRef,
  restaurarFoco = true,
  bloquearScroll = true,
}: OpcionesDrawer) {
  useEffect(() => {
    if (!abierto) return;

    const panel = panelRef.current;
    const focoPrevio = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowPrevio = document.body.style.overflow;

    if (bloquearScroll) document.body.style.overflow = 'hidden';

    const enfocarInicial = window.setTimeout(() => {
      if (!panel) return;
      const preferido = panel.querySelector<HTMLElement>('[data-autofocus]');
      const enfocables = obtenerEnfocables(panel);
      (preferido ?? enfocables[0] ?? panel).focus({ preventScroll: true });
    }, 40);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCerrar();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;

      const enfocables = obtenerEnfocables(panel);
      if (enfocables.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const activo = document.activeElement;

      if (event.shiftKey) {
        if (activo === primero || !panel.contains(activo)) {
          event.preventDefault();
          ultimo.focus({ preventScroll: true });
        }
        return;
      }

      if (activo === ultimo || !panel.contains(activo)) {
        event.preventDefault();
        primero.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(enfocarInicial);
      document.removeEventListener('keydown', onKeyDown);
      if (bloquearScroll) document.body.style.overflow = overflowPrevio;
      if (restaurarFoco && focoPrevio && focoPrevio.isConnected && focoPrevio !== document.body) {
        focoPrevio.focus({ preventScroll: true });
      }
    };
  }, [abierto, onCerrar, panelRef, restaurarFoco, bloquearScroll]);
}
