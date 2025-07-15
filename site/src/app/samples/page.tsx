'use client';

import Link from 'next/link';
import { useState } from 'react';

const samples = [
    {
        href: '/samples/basic-rendering',
        title: '🎨 Basic Rendering',
        description: 'Viewer 패키지를 사용한 기본 캔버스 렌더링',
        status: 'stable',
        features: ['Scene 생성', 'Rect/Circle 렌더링', 'Canvas 기본 기능']
    },
    {
        href: '/samples/hit-test',
        title: '🎯 Hit Test',
        description: '마우스 클릭으로 객체 선택 테스트 (Core 패키지)',
        status: 'new',
        features: ['좌표 기반 객체 찾기', '다중 객체 겹침 처리', '실시간 히트 테스트']
    },
    {
        href: '/samples/selection',
        title: '✨ Selection System',
        description: '객체 선택 및 바운딩 박스 시각화',
        status: 'coming',
        features: ['시각적 선택 피드백', '바운딩 박스 렌더링', '선택 상태 관리']
    },
    {
        href: '/samples/drag-drop',
        title: '🖱️ Drag & Drop',
        description: '선택된 객체 드래그 앤 드롭 이동',
        status: 'coming',
        features: ['드래그 인터랙션', 'Scene 상태 동기화', '실시간 위치 업데이트']
    },
];

const statusColors = {
    stable: 'bg-green-100 text-green-800',
    new: 'bg-blue-100 text-blue-800',
    coming: 'bg-gray-100 text-gray-600'
};

const statusLabels = {
    stable: '안정',
    new: '신규',
    coming: '예정'
};

export default function SamplesHub() {
    const [filter, setFilter] = useState<string>('all');

    const filteredSamples = filter === 'all'
        ? samples
        : samples.filter(sample => sample.status === filter);

    return (
        <main className="container mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">Canvas-Kit 기능 샘플</h1>
                <p className="text-gray-600 text-lg mb-6">
                    실제 UI에서 Canvas-Kit의 주요 기능을 테스트하고 확인할 수 있는 샘플 모음입니다.
                </p>

                {/* 필터 */}
                <div className="flex gap-2 mb-6">
                    {['all', 'stable', 'new', 'coming'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg transition-colors ${filter === status
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                        >
                            {status === 'all' ? '전체' : statusLabels[status as keyof typeof statusLabels]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {filteredSamples.map((sample) => (
                    <div key={sample.href} className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                            <h2 className="text-2xl font-semibold">{sample.title}</h2>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${statusColors[sample.status as keyof typeof statusColors]}`}>
                                {statusLabels[sample.status as keyof typeof statusLabels]}
                            </span>
                        </div>

                        <p className="text-gray-600 mb-4">{sample.description}</p>

                        <div className="mb-4">
                            <h4 className="font-medium mb-2">주요 기능:</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                {sample.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {sample.status === 'coming' ? (
                            <button className="w-full bg-gray-100 text-gray-500 py-2 px-4 rounded cursor-not-allowed">
                                개발 예정
                            </button>
                        ) : (
                            <Link
                                href={sample.href}
                                className="block w-full bg-blue-500 hover:bg-blue-600 text-white text-center py-2 px-4 rounded transition-colors"
                            >
                                샘플 확인하기 →
                            </Link>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-12 p-6 bg-blue-50 rounded-lg">
                <h3 className="text-xl font-semibold mb-2">🛠️ 개발 진행 상황</h3>
                <p className="text-gray-700 mb-4">
                    각 샘플은 Canvas-Kit의 실제 기능 개발과 연동되어 있습니다.
                    새로운 기능이 구현되면 해당 샘플이 즉시 업데이트됩니다.
                </p>
                <div className="flex gap-4 text-sm">
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span>구현 완료</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span>신규 기능</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                        <span>개발 예정</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
