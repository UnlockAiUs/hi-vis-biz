import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import HashHandler from '@/components/auth/HashHandler'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hi-Vis Biz',
  description: 'AI-driven employee check-in system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <HashHandler />
        {children}
      </body>
    </html>
  )
}
