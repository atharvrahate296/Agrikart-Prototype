import type { Metadata } from 'next'
import { DemoRoleProvider } from '@/components/lib/demo-role-context'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'AgriKart — SIH 26033 Demo Prototype',
  description: 'SIH 2026 — Multiple intermediaries reduce farmers earnings and increase consumer prices. Demo mode: instant role-based access without authentication.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <DemoRoleProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </DemoRoleProvider>
      </body>
    </html>
  )
}
