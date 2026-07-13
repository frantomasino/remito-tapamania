import { LogOut, MessageCircle } from "lucide-react"

export default function SuspendidoPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">

        <div className="mb-4 text-4xl">🔒</div>

        <h1 className="text-[18px] font-semibold text-gray-900">
          Cuenta suspendida
        </h1>

        <p className="mt-2 text-[13px] text-gray-500 leading-relaxed">
          Tu cuenta fue suspendida. Contactanos para regularizar tu situación y volver a acceder.
        </p>

        <a
          href="https://wa.me/5491131256510?text=Hola%2C%20mi%20cuenta%20fue%20suspendida%20y%20quiero%20regularizar%20mi%20situaci%C3%B3n"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-[13px] font-semibold text-white active:opacity-80 shadow-sm"
        >
          <MessageCircle className="size-3.5" />
          Contactar por WhatsApp
        </a>

        <form action="/auth/signout" method="post" className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-2.5 text-[13px] font-medium text-red-500 active:opacity-60 shadow-sm"
          >
            <LogOut className="size-3.5" />
            Cerrar sesión
          </button>
        </form>

      </div>
    </div>
  )
}