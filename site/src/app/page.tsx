import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-5xl font-bold mb-6 text-gray-900">Canvas-Kit</h1>
        <p className="text-xl mb-8 text-gray-600">
          프레임워크 중립적인 웹 컴포넌트 기반 캔버스 라이브러리
        </p>
        <p className="text-lg mb-12 text-gray-500">
          필수적인 편집 기능을 제공하는 현대적이고 확장 가능한 2D 캔버스 라이브러리입니다.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/samples"
            className="px-8 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            📊 기능 샘플 보기
          </Link>
          <Link
            href="/samples/designer"
            className="px-8 py-3 text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            🎨 Designer 샘플
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">⚡ 고성능</h3>
            <p className="text-gray-600">
              Konva.js와 HTML 렌더링을 통한 하드웨어 가속 및 최적화된 성능
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">🔧 프레임워크 중립</h3>
            <p className="text-gray-600">
              React, Vue, Angular 등 모든 프레임워크나 바닐라 JS에서 사용 가능
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">📱 터치 지원</h3>
            <p className="text-gray-600">
              모바일과 태블릿에 최적화된 터치 인터랙션 지원
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
