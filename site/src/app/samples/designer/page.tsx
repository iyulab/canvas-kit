'use client';

import dynamic from 'next/dynamic';
import { Scene } from '@canvas-kit/core';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const KonvaDesigner = dynamic(() => import('@canvas-kit/designer').then(mod => ({ default: mod.KonvaDesigner })), {
  ssr: false,
});

export default function DesignerSample() {
  const [scene, setScene] = useState<Scene | undefined>();
  const [selectedObjects, setSelectedObjects] = useState<unknown[]>([]);

  useEffect(() => {
    const newScene = new Scene();

    // 초기 객체들 추가
    newScene.add({
      type: 'rect',
      x: 100,
      y: 100,
      width: 150,
      height: 100,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2
    });

    newScene.add({
      type: 'circle',
      x: 300,
      y: 200,
      radius: 60,
      fill: '#ef4444',
      stroke: '#dc2626',
      strokeWidth: 2
    });

    newScene.add({
      type: 'rect',
      x: 200,
      y: 300,
      width: 120,
      height: 80,
      fill: '#10b981',
      stroke: '#059669',
      strokeWidth: 2
    });

    setScene(newScene);
  }, []);

  const handleSceneChange = (newScene: Scene) => {
    setScene(newScene);
  };

  const handleSelectionChange = (objects: unknown[]) => {
    setSelectedObjects(objects);
  };

  return (
    <main className="container mx-auto p-8">
      <div className="mb-6">
        <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
          ← 샘플 목록으로
        </Link>
        <h1 className="text-3xl font-bold mb-2">🎨 Designer Sample</h1>
        <p className="text-gray-600">
          Designer 패키지를 사용한 인터랙티브 캔버스 에디터입니다.
        </p>
      </div>

      <div className="border-2 border-gray-200 rounded-lg bg-white overflow-hidden">
        {scene ? (
          <KonvaDesigner
            scene={scene}
            onSceneChange={handleSceneChange}
            onSelectionChange={handleSelectionChange}
            width={800}
            height={600}
            enableMultiSelect={true}
          />
        ) : (
          <div className="p-8 text-center text-gray-500">
            Designer를 로드하는 중...
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">기능</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• 드래그 앤 드롭으로 이동</li>
            <li>• 클릭으로 선택</li>
            <li>• Rectangle Selection</li>
            <li>• Transform 핸들</li>
            <li>• 멀티 선택 (Ctrl+클릭)</li>
          </ul>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">단축키</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <kbd>Del</kbd>: 선택한 객체 삭제</li>
            <li>• <kbd>Ctrl+Z</kbd>: 실행 취소</li>
            <li>• <kbd>Ctrl+Y</kbd>: 다시 실행</li>
            <li>• <kbd>Ctrl+C</kbd>: 복사</li>
            <li>• <kbd>Ctrl+V</kbd>: 붙여넣기</li>
            <li>• <kbd>Ctrl+D</kbd>: 복제</li>
            <li>• <kbd>Esc</kbd>: 선택 해제</li>
          </ul>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">도구</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• 선택 도구</li>
            <li>• 드래그 이동</li>
            <li>• 크기 조절</li>
            <li>• Rectangle Selection</li>
          </ul>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">선택 상태</h3>
          <div className="text-sm text-gray-700">
            <p className="mb-2">선택된 객체: <strong>{selectedObjects.length}개</strong></p>
            {selectedObjects.length > 0 && (
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {selectedObjects.map((obj, idx) => (
                  <div key={idx} className="text-xs bg-white px-2 py-1 rounded">
                    {String((obj as Record<string, unknown>).type)} ({Math.round(Number((obj as Record<string, unknown>).x))}, {Math.round(Number((obj as Record<string, unknown>).y))})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
