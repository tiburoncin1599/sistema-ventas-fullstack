import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'PROLIMAC SRL | Productos de limpieza',
    template: '%s | PROLIMAC SRL',
  },
  description: 'Limpieza que respira. Productos para el hogar, oficinas y empresas, desde Cochabamba, Bolivia.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          src="/dark-init.js"
          async
        />
      </head>
      <body className={`${manrope.variable} ${fraunces.variable} overflow-x-clip font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}