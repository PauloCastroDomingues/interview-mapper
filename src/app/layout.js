import './globals.css'
import { Analytics } from '@vercel/analytics/next'

export const metadata = {
  title: 'Interview Mapper - Mapeamento de Processos',
  description: 'Ferramenta interna para conduzir entrevistas de mapeamento de processos com stakeholders.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#f5f7fb] text-gray-900 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
