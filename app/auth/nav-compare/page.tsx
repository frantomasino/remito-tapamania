"use client"

/**
 * Comparación visual: por qué "nav unificada" casi no se nota.
 * Antes había 2 barras iguales apiladas; ahora 1.
 */
export default function NavComparePage() {
  return (
    <div className="min-h-dvh bg-gray-100 px-4 py-6 text-gray-900">
      <div className="mx-auto w-full max-w-md space-y-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1565c0]">Boleta · Preview</p>
          <h1 className="mt-1 text-[20px] font-semibold">Nav unificada: antes vs ahora</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
            No es una nav nueva. Es que antes en “Nuevo” había <strong className="font-semibold text-gray-700">dos barras iguales</strong> una arriba de la otra. Se veía como una sola.
          </p>
        </div>

        {/* ANTES */}
        <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
          <div className="border-b border-red-100 bg-red-50 px-4 py-2.5">
            <p className="text-[13px] font-semibold text-red-700">ANTES — 2 navs (duplicadas)</p>
            <p className="text-[12px] text-red-600/80">La de abajo casi no se veía; estaba tapada</p>
          </div>

          <div className="relative h-[220px] bg-gray-50">
            <div className="absolute inset-x-0 top-0 p-4">
              <div className="h-16 rounded-xl border border-dashed border-gray-300 bg-white" />
              <p className="mt-2 text-center text-[11px] text-gray-400">contenido del remito…</p>
            </div>

            {/* Nav A — la de layout, “debajo” */}
            <div className="absolute inset-x-0 bottom-0 border-t-2 border-dashed border-red-400 bg-red-100/90 pb-1 pt-1">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-red-600">
                Nav #1 (layout) — tapada
              </p>
              <FakeNav accent="red" />
            </div>

            {/* Nav B — la de nuevo, encima */}
            <div className="absolute inset-x-0 bottom-[52px] border-t-2 border-amber-400 bg-amber-50 shadow-[0_-4px_16px_rgba(0,0,0,0.12)]">
              <p className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Nav #2 (pantalla Nuevo) — la que se veía
              </p>
              <FakeNav accent="amber" />
            </div>
          </div>
        </section>

        {/* AHORA */}
        <section className="overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm">
          <div className="border-b border-green-100 bg-green-50 px-4 py-2.5">
            <p className="text-[13px] font-semibold text-green-700">AHORA — 1 sola nav</p>
            <p className="text-[12px] text-green-700/80">Misma barra en Historial, Nuevo y Cuenta</p>
          </div>

          <div className="relative h-[180px] bg-gray-50">
            <div className="absolute inset-x-0 top-0 p-4">
              <div className="h-16 rounded-xl border border-dashed border-gray-300 bg-white" />
              <p className="mt-2 text-center text-[11px] text-gray-400">contenido del remito…</p>
            </div>

            <div className="absolute inset-x-0 bottom-0 border-t border-gray-200 bg-white">
              <p className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wide text-green-700">
                Una sola BottomNav
              </p>
              <FakeNav accent="blue" />
            </div>
          </div>
        </section>

        <p className="pb-6 text-center text-[12px] text-gray-400">
          Por eso en las fotos del celular “no se ve” el cambio de nav: se ve casi igual, pero sin duplicar.
        </p>
      </div>
    </div>
  )
}

function FakeNav({ accent }: { accent: "red" | "amber" | "blue" }) {
  const active =
    accent === "blue"
      ? "bg-[#1565c0] text-white"
      : accent === "amber"
        ? "bg-amber-500 text-white"
        : "bg-red-400 text-white"

  return (
    <div className="grid grid-cols-3 items-center px-3 py-2">
      {["Historial", "Nuevo", "Cuenta"].map((label, i) => (
        <div key={label} className="flex justify-center">
          <div
            className={`flex h-11 w-[5.25rem] flex-col items-center justify-center rounded-xl text-[11px] font-semibold ${
              i === 1 ? active : "text-gray-400"
            }`}
          >
            <span className="text-[15px] leading-none">{i === 0 ? "☰" : i === 1 ? "+" : "⚙"}</span>
            <span className="mt-0.5">{label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
