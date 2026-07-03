import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mi Tienda Online',
  description: 'Sistema de ventas online',
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
      <body className={`${geist.className} antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}