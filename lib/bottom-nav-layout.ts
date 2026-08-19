/** Altura del contenido de la nav (pt + ítems + pb), sin safe-area. */
export const BOTTOM_NAV_CONTENT_PX = 46

/** Espacio para que el último botón quede usable sobre la nav (~altura de botón + margen). */
export const BOTTOM_NAV_SCROLL_BUTTON_PX = 52

/** Padding inferior de páginas con scroll (nav + botón + safe-area). */
export function bottomNavScrollPadding(extraPx = 0) {
  return `calc(${BOTTOM_NAV_CONTENT_PX}px + ${BOTTOM_NAV_SCROLL_BUTTON_PX}px + env(safe-area-inset-bottom) + ${extraPx}px)`
}
