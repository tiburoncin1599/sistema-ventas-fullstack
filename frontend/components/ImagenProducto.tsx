'use client';

import { useState } from 'react';

function ImagenProducto({ src, alt }: { src: string; alt: string }) {
  const [fallo, setFallo] = useState(false);
  if (fallo) return <div className="flex h-full w-full items-center justify-center text-4xl text-muted-foreground" aria-hidden="true">🧴</div>;
  return (
    <img
      src={src}
      alt={alt}
      className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
      onError={() => setFallo(true)}
    />
  );
}

export default ImagenProducto;