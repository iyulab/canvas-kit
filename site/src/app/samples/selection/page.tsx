'use client';

import Link from 'next/link';

export default function SelectionSample() {
    return (
        <main className="container mx-auto p-8">
            <div className="mb-6">
                <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                    ← 샘플 목록으로
                </Link>
                <h1 className="text-3xl font-bold mb-2">✨ Selection System Sample</h1>
                <p className="text-gray-600">
                    객체 선택 및 바운딩 박스 시각화 기능입니다.
                </p>
            </div>

            <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-6 text-center">
                <h2 className="text-xl font-semibold mb-2">🚧 개발 진행 중</h2>
                <p className="text-gray-700 mb-4">
                    이 기능은 현재 개발 중입니다. Phase 2의 Selection System 구현 후 사용할 수 있습니다.
                </p>

                <div className="bg-white rounded p-4 mb-4">
                    <h3 className="font-medium mb-2">구현 예정 기능:</h3>
                    <ul className="text-left text-sm text-gray-600 space-y-1">
                        <li>• 선택된 객체 시각적 피드백</li>
                        <li>• 바운딩 박스 렌더링</li>
                        <li>• 선택 상태 관리</li>
                        <li>• SVG 오버레이 시스템</li>
                    </ul>
                </div>

                <Link
                    href="/samples/hit-test"
                    className="inline-block bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
                >
                    히트 테스트 샘플로 이동 →
                </Link>
            </div>
        </main>
    );
}
