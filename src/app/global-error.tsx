'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0c0c0e] text-white flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-amber-400 text-black font-bold rounded-full"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
