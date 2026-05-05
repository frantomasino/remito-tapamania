export default function PedidosLoading() {
  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-3">
      <div className="flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="h-10 w-20 animate-pulse rounded-xl bg-gray-200" />
        </div>

        {/* Card cobros */}
        <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />

        {/* Filtros */}
        <div className="h-16 animate-pulse rounded-xl bg-gray-200" />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 animate-pulse rounded-xl bg-gray-200" />
          <div className="h-16 animate-pulse rounded-xl bg-gray-200" />
        </div>

        {/* Grupos */}
        <div className="h-14 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-14 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-14 animate-pulse rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}