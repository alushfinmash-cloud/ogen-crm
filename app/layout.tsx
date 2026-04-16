import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'עוגן פיננסי CRM',
    template: '%s | עוגן פיננסי CRM',
  },
  description: 'מערכת CRM מקצועית לניהול לקוחות, לידים, שיחות ואוטומציות — עוגן פיננסי',
  keywords: ['CRM', 'ניהול לקוחות', 'לידים', 'עוגן פיננסי', 'אוטומציה'],
  authors: [{ name: 'עוגן פיננסי' }],
  openGraph: {
    title: 'עוגן פיננסי CRM',
    description: 'מערכת CRM מקצועית לניהול לקוחות, לידים, שיחות ואוטומציות',
    locale: 'he_IL',
    type: 'website',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  )
}
