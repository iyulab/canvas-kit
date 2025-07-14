import Link from 'next/link';

const demos = [
  {
    href: '/demo/basic-rendering',
    title: 'Basic Rendering',
    description: 'Displays a static scene with a rectangle and a circle.',
  },
  {
    href: '/demo/designer',
    title: 'Designer',
    description: 'A canvas editor to design scenes.',
  },
];

export default function DemoHub() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Canvas Kit Demos</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demos.map((demo) => (
          <Link href={demo.href} key={demo.href} className="block p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold mb-2">{demo.title}</h2>
            <p className="text-gray-600">{demo.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
