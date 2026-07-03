'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">Algo salió mal</h1>
        <p className="text-gray-500 mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700">
          Intentar de nuevo
        </button>
      </div>
    </main>
  );
}
