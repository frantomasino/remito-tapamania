import Link from "next/link"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-100 px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-gray-200">
          <FileQuestion className="size-8 text-gray-400" />
        </div>
        <h1 className="text-[22px] font-semibold text-gray-900">Página no encontrada</h1>
        <p className="mt-2 text-[13px] text-gray-500">La página que buscás no existe o fue movida.</p>
        <Link href="/dashboard/nuevo"
          className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[#1565c0] text-[14px] font-semibold text-white active:opacity-80">
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}