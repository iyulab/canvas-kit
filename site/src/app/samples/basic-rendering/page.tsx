'use client';

import dynamic from 'next/dynamic';
import { Scene } from '@canvas-kit/core';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const Viewer = dynamic(() => import('@canvas-kit/viewer').then(mod => mod.Viewer), {
    ssr: false,
});

export default function BasicRenderingSample() {
    const [scene, setScene] = useState<Scene | undefined>();
    const [objectCount, setObjectCount] = useState({ rect: 2, circle: 2 });

    const createScene = () => {
        const newScene = new Scene();

        // 사각형들 추가
        for (let i = 0; i < objectCount.rect; i++) {
            newScene.add({
                type: 'rect',
                x: 50 + i * 80,
                y: 50 + i * 30,
                width: 60,
                height: 40,
                color: `hsl(${i * 60}, 70%, 50%)`
            });
        }

        // 원들 추가
        for (let i = 0; i < objectCount.circle; i++) {
            newScene.add({
                type: 'circle',
                x: 150 + i * 80,
                y: 200 + i * 40,
                radius: 25 + i * 5,
                color: `hsl(${180 + i * 60}, 70%, 50%)`
            });
        }

        setScene(newScene);
    };

    useEffect(() => {
        createScene();
    }, [objectCount]);

    const addObject = (type: 'rect' | 'circle') => {
        setObjectCount(prev => ({
            ...prev,
            [type]: prev[type] + 1
        }));
    };

    const removeObject = (type: 'rect' | 'circle') => {
        setObjectCount(prev => ({
            ...prev,
            [type]: Math.max(0, prev[type] - 1)
        }));
    };

    return (
        <main className="container mx-auto p-8">
            <div className="mb-6">
                <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                    ← 샘플 목록으로
                </Link>
                <h1 className="text-3xl font-bold mb-2">🎨 Basic Rendering Sample</h1>
                <p className="text-gray-600">
                    Viewer 패키지를 사용한 기본 캔버스 렌더링 테스트입니다.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 컨트롤 패널 */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">컨트롤</h3>

                        <div className="space-y-4">
                            {/* 사각형 컨트롤 */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    사각형 ({objectCount.rect}개)
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => addObject('rect')}
                                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded text-sm"
                                    >
                                        추가
                                    </button>
                                    <button
                                        onClick={() => removeObject('rect')}
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded text-sm"
                                    >
                                        제거
                                    </button>
                                </div>
                            </div>

                            {/* 원 컨트롤 */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    원 ({objectCount.circle}개)
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => addObject('circle')}
                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded text-sm"
                                    >
                                        추가
                                    </button>
                                    <button
                                        onClick={() => removeObject('circle')}
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded text-sm"
                                    >
                                        제거
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={createScene}
                                className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded"
                            >
                                새로 생성
                            </button>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 rounded">
                            <h4 className="font-medium mb-2">기능 설명</h4>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li>• Scene 객체 생성 및 관리</li>
                                <li>• DrawingObject 추가/제거</li>
                                <li>• Canvas2D 렌더링</li>
                                <li>• 동적 색상 및 위치</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 캔버스 영역 */}
                <div className="lg:col-span-2">
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                        <h3 className="text-lg font-medium mb-4">Canvas Viewer</h3>
                        {scene && (
                            <div className="border border-gray-300 rounded overflow-hidden">
                                <Viewer width={600} height={400} scene={scene} />
                            </div>
                        )}
                    </div>

                    {/* 통계 정보 */}
                    <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded p-3">
                            <div className="text-lg font-bold text-blue-600">
                                {scene?.getObjects().length || 0}
                            </div>
                            <div className="text-sm text-gray-600">총 객체 수</div>
                        </div>
                        <div className="bg-green-50 rounded p-3">
                            <div className="text-lg font-bold text-green-600">
                                {objectCount.rect}
                            </div>
                            <div className="text-sm text-gray-600">사각형</div>
                        </div>
                        <div className="bg-purple-50 rounded p-3">
                            <div className="text-lg font-bold text-purple-600">
                                {objectCount.circle}
                            </div>
                            <div className="text-sm text-gray-600">원</div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
