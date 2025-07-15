'use client';

import Link from 'next/link';

export default function DragDropSample() {
    return (
        <main className="container mx-auto p-8">
            <div className="mb-6">
                <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                    ← 샘플 목록으로
                </Link>
                <h1 className="text-3xl font-bold mb-2">🖱️ Drag & Drop Sample</h1>
                <p className="text-gray-600">
                    선택된 객체를 드래그 앤 드롭으로 이동하는 기능입니다.
                </p>
            </div>

            <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-6 text-center">
                <h2 className="text-xl font-semibold mb-2">🚧 개발 예정</h2>
                <p className="text-gray-700 mb-4">
                    이 기능은 Selection System 구현 후 개발 예정입니다.
                </p>

                <div className="bg-white rounded p-4 mb-4">
                    <h3 className="font-medium mb-2">구현 예정 기능:</h3>
                    <ul className="text-left text-sm text-gray-600 space-y-1">
                        <li>• 드래그 인터랙션</li>
                        <li>• Scene 상태 동기화</li>
                        <li>• 실시간 위치 업데이트</li>
                        <li>• 마우스 다운/업/무브 이벤트 처리</li>
                    </ul>
                </div>

                <div className="flex gap-2 justify-center">
                    <Link
                        href="/samples/hit-test"
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
                    >
                        히트 테스트 보기
                    </Link>
                    <Link
                        href="/samples/selection"
                        className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
                    >
                        선택 시스템 보기
                    </Link>
                </div>
            </div>
        </main>
    );
}
