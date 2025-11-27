/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/layout.tsx
 * PURPOSE: Root layout for entire Next.js app
 * 
 * INCLUDES:
 * - HTML structure with Inter font
 * - HashHandler component (handles auth tokens in URL hash)
 * - Global CSS import
 * 
 * METADATA: title="VizDots", description="See Your Business Clearly — One Dot at a Time"
 */

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import HashHandler from '@/components/auth/HashHandler'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VizDots',
  description: 'See Your Business Clearly — One Dot at a Time',
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
