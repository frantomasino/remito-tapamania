import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

export const metadata: Metadata = {
  title: "Boleta",
  description: "Cargá pedidos, generá remitos e imprimí comprobantes desde el celular.",
  manifest: "/manifest.webmanifest",
 icons: {
  icon: "/icons/icon-192.png",
  apple: "/icons/icon-192.png",
},
}

export const viewport: Viewport = {
  themeColor: "#1565c0",
    interactiveWidget: "resizes-content",

}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}