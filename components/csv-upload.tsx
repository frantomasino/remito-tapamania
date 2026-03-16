"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, FileSpreadsheet, X, AlertCircle, Link2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type Product, parseCSV } from "@/lib/remito-types"

interface CSVUploadProps {
  onProductsLoaded: (products: Product[]) => void
  productsCount: number
}

export function CSVUpload({ onProductsLoaded, productsCount }: CSVUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [sourceLabel, setSourceLabel] = useState<string | null>(null) // "Archivo" / "URL"
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [url, setUrl] = useState("")
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFromUrl = useCallback(async () => {
    const cleanUrl = url.trim()
    if (!cleanUrl) {
      setError("Pegá una URL CSV de Google Sheets.")
      return
    }

    try {
      setError(null)
      setIsLoadingUrl(true)

      const res = await fetch(`/api/products-csv?url=${encodeURIComponent(cleanUrl)}`, {
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error("No se pudo traer el CSV desde la URL.")
      }

      const text = await res.text()
      const products = parseCSV(text)

      if (products.length === 0) {
        setError("No se encontraron productos válidos. Revisá que haya columnas: descripcion, precio (codigo es opcional).")
        return
      }

      setFileName("Google Sheets")
      setSourceLabel("URL")
      onProductsLoaded(products)
    } catch {
      setError("Falló la carga desde URL. Asegurate de que el Sheet esté publicado como CSV.")
    } finally {
      setIsLoadingUrl(false)
    }
  }, [url, onProductsLoaded])

  const processFile = useCallback(
    (file: File) => {
      setError(null)
      const validTypes = [
        "text/csv",
        "text/plain",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ]
      const isCSV = validTypes.includes(file.type) || file.name.endsWith(".csv") || file.name.endsWith(".txt")

      if (!isCSV) {
        setError("Por favor subi un archivo CSV (.csv o .txt)")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const products = parseCSV(text)
        if (products.length === 0) {
          setError("No se encontraron productos válidos. Asegurate de que el CSV tenga columnas: descripcion, precio (codigo es opcional).")
          return
        }
        setFileName(file.name)
        setSourceLabel("Archivo")
        onProductsLoaded(products)
      }
      reader.readAsText(file)
    },
    [onProductsLoaded]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleClear = () => {
    setFileName(null)
    setSourceLabel(null)
    setError(null)
    onProductsLoaded([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-medium text-foreground">Lista de Productos</label>

      {/* Cargar desde URL */}
      {!fileName && (
        <div className="rounded-lg border p-4 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Cargar desde URL (Google Sheets publicado en CSV)</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Pegá la URL CSV del Google Sheets"
            />
            <Button type="button" onClick={loadFromUrl} disabled={isLoadingUrl}>
              {isLoadingUrl ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
              Cargar
            </Button>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Columnas esperadas: <b>descripcion</b>, <b>precio</b> (codigo opcional).
          </p>
        </div>
      )}

      {/* Estado cargado */}
      {fileName ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <FileSpreadsheet className="size-5 text-primary" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground truncate">
              {fileName} {sourceLabel ? `(${sourceLabel})` : ""}
            </span>
            <span className="text-xs text-muted-foreground">{productsCount} productos cargados</span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={handleClear} aria-label="Quitar lista">
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        /* Cargar desde archivo */
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors cursor-pointer ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
          }}
          aria-label="Subir archivo CSV con productos"
        >
          <Upload className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Arrastrá tu CSV acá o <span className="text-primary font-medium">hacé click para seleccionar</span>
          </p>
          <p className="text-xs text-muted-foreground">Columnas esperadas: descripcion, precio (codigo opcional)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleChange}
            aria-hidden="true"
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}