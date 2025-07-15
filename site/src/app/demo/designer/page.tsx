'use client';

import dynamic from 'next/dynamic';
import { Scene } from '@canvas-kit/core';
import { useEffect, useState } from 'react';

// Legacy Designer (Native Canvas)
const Designer = dynamic(() => import('@canvas-kit/designer').then(mod => mod.Designer), {
  ssr: false,
});

// New Konva-based Designer
const KonvaDesigner = dynamic(() => import('@canvas-kit/designer').then(mod => mod.KonvaDesigner), {
  ssr: false,
});

export default function DesignerDemo() {
  const [scene, setScene] = useState<Scene | undefined>();
  const [selectedObjects, setSelectedObjects] = useState<any[]>([]);
  const [useKonva, setUseKonva] = useState(true); // Default to Konva

  useEffect(() => {
    const newScene = new Scene();
    newScene.add({
      id: 'rect1',
      type: 'rect',
      x: 50,
      y: 50,
      width: 100,
      height: 80,
      fill: '#ff6b6b',
      stroke: '#d63031',
      strokeWidth: 2
    });
    newScene.add({
      id: 'circle1',
      type: 'circle',
      x: 200,
      y: 120,
      radius: 40,
      fill: '#74b9ff',
      stroke: '#0984e3',
      strokeWidth: 2
    });
    newScene.add({
      id: 'text1',
      type: 'text',
      x: 100,
      y: 200,
      text: 'Hello Konva!',
      fontSize: 24,
      fill: '#2d3436'
    });
    setScene(newScene);
  }, []);

  const handleSelectionChange = (objects: any[]) => {
    setSelectedObjects(objects);
  };

  const handleSceneChange = (newScene: Scene) => {
    setScene(newScene);
  };

  return (
    <main className="container mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-4">Designer Demo</h1>

        {/* Toggle between Konva and Native Canvas */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setUseKonva(true)}
            className={`px-4 py-2 rounded ${useKonva
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
              }`}
          >
            🚀 Konva Designer (New)
          </button>
          <button
            onClick={() => setUseKonva(false)}
            className={`px-4 py-2 rounded ${!useKonva
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
              }`}
          >
            📝 Legacy Designer
          </button>
        </div>

        {/* Info Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">
              {useKonva ? '🚀 Konva Features' : '📝 Legacy Features'}
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              {useKonva ? (
                <>
                  <li>✅ 드래그 & 드롭 지원</li>
                  <li>✅ Transformer 핸들 (크기조정, 회전)</li>
                  <li>✅ 멀티 선택 (Ctrl+Click)</li>
                  <li>✅ 부드러운 애니메이션</li>
                </>
              ) : (
                <>
                  <li>📝 기본 렌더링만</li>
                  <li>⏳ 선택 기능 제한적</li>
                  <li>⏳ 조작 기능 없음</li>
                </>
              )}
            </ul>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">
              📊 Selection Info
            </h3>
            <div className="text-sm text-green-700">
              <div>Selected Objects: {selectedObjects.length}</div>
              {selectedObjects.map((obj, index) => (
                <div key={index} className="ml-2">
                  • {obj.type} (id: {obj.id})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
        {scene && (
          useKonva ? (
            <KonvaDesigner
              width={800}
              height={600}
              scene={scene}
              onSceneChange={handleSceneChange}
              onSelectionChange={handleSelectionChange}
              enableMultiSelect={true}
            />
          ) : (
            <Designer width={800} height={600} scene={scene} />
          )
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">🎮 사용법</h3>
        <div className="text-sm text-gray-700 space-y-1">
          {useKonva ? (
            <>
              <div>• 클릭: 객체 선택</div>
              <div>• Ctrl+클릭: 다중 선택</div>
              <div>• 드래그: 객체 이동</div>
              <div>• 핸들 드래그: 크기 조정 및 회전</div>
              <div>• 빈 영역 클릭: 선택 해제</div>
            </>
          ) : (
            <>
              <div>• 기본 렌더링만 지원</div>
              <div>• 편집 기능은 Konva 버전을 사용하세요</div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
