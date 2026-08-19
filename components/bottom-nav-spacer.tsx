/** Espacio extra al final de páginas largas (Safari / barra del navegador). */
export function BottomNavSpacer({ extraPx = 32 }: { extraPx?: number }) {
  return (
    <div
      aria-hidden
      className="w-full shrink-0"
      style={{ height: `${extraPx}px` }}
    />
  )
}
