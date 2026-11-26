import Navbar from '@/components/Navbar';
import Footer from '@/components/tienda/Footer';
import AsistenteFlotante from '@/components/tienda/AsistenteFlotante';

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <AsistenteFlotante />
    </>
  );
}
