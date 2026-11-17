import Navbar from '@/components/Navbar';
import Footer from '@/components/tienda/Footer';

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
