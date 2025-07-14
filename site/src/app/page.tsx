import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">Canvas Kit</h1>
      <p className="text-lg mb-8">A modern, extensible 2D canvas library.</p>
      <Link href="/demo" className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
        View Demo
      </Link>
    </main>
  );
}
