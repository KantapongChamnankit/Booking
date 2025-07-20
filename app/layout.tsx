import type React from "react"
import type { Metadata } from "next"
import { Kanit } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Kanit({ weight: "400", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ระบบจองเครื่องซักผ้า",
  description: "ระบบจองเครื่องซักผ้า - หอพัก 4",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
