'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Scene } from '@canvas-kit/core';

const Viewer = dynamic(() => import('@canvas-kit/viewer').then(mod => mod.Viewer), {
    ssr: false,
});

interface Room {
    id: string;
    name: string;
    type: 'office' | 'meeting' | 'common' | 'restroom' | 'storage';
    occupied: boolean;
    capacity?: number;
    description?: string;
}

interface Building {
    rooms: Room[];
    corridors: any[];
    exits: any[];
}

export default function InteractiveBuildingMapPage() {
    const [scene, setScene] = useState<Scene>(new Scene());
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
    const [building] = useState<Building>({
        rooms: [
            { id: 'room1', name: 'Conference Room A', type: 'meeting', occupied: false, capacity: 12, description: 'Large conference room with projector' },
            { id: 'room2', name: 'Office 101', type: 'office', occupied: true, capacity: 4, description: 'Development team workspace' },
            { id: 'room3', name: 'Office 102', type: 'office', occupied: false, capacity: 4, description: 'Design team workspace' },
            { id: 'room4', name: 'Break Room', type: 'common', occupied: true, capacity: 20, description: 'Kitchen and dining area' },
            { id: 'room5', name: 'Conference Room B', type: 'meeting', occupied: true, capacity: 8, description: 'Small meeting room' },
            { id: 'room6', name: 'Storage', type: 'storage', occupied: false, description: 'Office supplies storage' },
            { id: 'room7', name: 'Restroom', type: 'restroom', occupied: false, description: 'Public restroom facilities' },
            { id: 'room8', name: 'Reception', type: 'common', occupied: true, capacity: 50, description: 'Main reception area' },
        ],
        corridors: [],
        exits: []
    });

    const roomColors = {
        office: { free: '#e3f2fd', occupied: '#ffcdd2', stroke: '#1976d2' },
        meeting: { free: '#f3e5f5', occupied: '#ffcdd2', stroke: '#7b1fa2' },
        common: { free: '#e8f5e8', occupied: '#ffcdd2', stroke: '#388e3c' },
        restroom: { free: '#fff3e0', occupied: '#ffcdd2', stroke: '#f57c00' },
        storage: { free: '#fafafa', occupied: '#ffcdd2', stroke: '#616161' }
    };

    // Initialize building layout
    useEffect(() => {
        const newScene = new Scene();

        // Create building outline
        newScene.add({
            type: 'rect',
            x: 20,
            y: 20,
            width: 760,
            height: 460,
            fill: 'transparent',
            stroke: '#333',
            strokeWidth: 3
        });

        // Create rooms
        const roomLayout = [
            { id: 'room1', x: 50, y: 50, width: 200, height: 120 },
            { id: 'room2', x: 280, y: 50, width: 150, height: 80 },
            { id: 'room3', x: 460, y: 50, width: 150, height: 80 },
            { id: 'room4', x: 640, y: 50, width: 120, height: 200 },
            { id: 'room5', x: 280, y: 160, width: 150, height: 80 },
            { id: 'room6', x: 460, y: 160, width: 80, height: 80 },
            { id: 'room7', x: 570, y: 160, width: 40, height: 80 },
            { id: 'room8', x: 50, y: 200, width: 200, height: 150 },
        ];

        roomLayout.forEach(layout => {
            const room = building.rooms.find(r => r.id === layout.id);
            if (!room) return;

            const colors = roomColors[room.type];
            const isHovered = hoveredRoom === room.id;
            const isSelected = selectedRoom?.id === room.id;

            newScene.add({
                type: 'rect',
                x: layout.x,
                y: layout.y,
                width: layout.width,
                height: layout.height,
                fill: isSelected ? '#ffeb3b' : isHovered ? '#f5f5f5' : (room.occupied ? colors.occupied : colors.free),
                stroke: isSelected ? '#ff9800' : colors.stroke,
                strokeWidth: isSelected ? 3 : (isHovered ? 2 : 1)
            });

            // Room labels
            newScene.add({
                type: 'text',
                x: layout.x + layout.width / 2 - (room.name.length * 3),
                y: layout.y + layout.height / 2,
                text: room.name,
                fontSize: 12,
                fill: '#333',
                fontFamily: 'Arial'
            });

            // Occupancy indicator
            if (room.occupied) {
                newScene.add({
                    type: 'circle',
                    x: layout.x + layout.width - 15,
                    y: layout.y + 15,
                    radius: 6,
                    fill: '#f44336',
                    stroke: '#d32f2f',
                    strokeWidth: 1
                });
            } else {
                newScene.add({
                    type: 'circle',
                    x: layout.x + layout.width - 15,
                    y: layout.y + 15,
                    radius: 6,
                    fill: '#4caf50',
                    stroke: '#388e3c',
                    strokeWidth: 1
                });
            }
        });

        // Add corridors
        newScene.add({
            type: 'rect',
            x: 50,
            y: 180,
            width: 560,
            height: 20,
            fill: '#f5f5f5',
            stroke: '#ddd',
            strokeWidth: 1
        });

        newScene.add({
            type: 'rect',
            x: 250,
            y: 50,
            width: 20,
            height: 300,
            fill: '#f5f5f5',
            stroke: '#ddd',
            strokeWidth: 1
        });

        // Add exit signs
        newScene.add({
            type: 'rect',
            x: 20,
            y: 280,
            width: 30,
            height: 40,
            fill: '#ff5722',
            stroke: '#d84315',
            strokeWidth: 2
        });

        newScene.add({
            type: 'text',
            x: 25,
            y: 305,
            text: 'EXIT',
            fontSize: 10,
            fill: 'white',
            fontFamily: 'Arial'
        });

        setScene(newScene);
    }, [building, hoveredRoom, selectedRoom]);

    const handleRoomClick = useCallback((roomId: string) => {
        const room = building.rooms.find(r => r.id === roomId);
        setSelectedRoom(room || null);
    }, [building]);

    const toggleRoomOccupancy = (roomId: string) => {
        const roomIndex = building.rooms.findIndex(r => r.id === roomId);
        if (roomIndex !== -1) {
            building.rooms[roomIndex].occupied = !building.rooms[roomIndex].occupied;
            // Force re-render by updating the scene
            setScene(new Scene());
            setTimeout(() => {
                // This will trigger the useEffect to rebuild the scene
            }, 0);
        }
    };

    const getOccupancyStats = () => {
        const total = building.rooms.length;
        const occupied = building.rooms.filter(r => r.occupied).length;
        const occupancyRate = Math.round((occupied / total) * 100);
        return { total, occupied, free: total - occupied, rate: occupancyRate };
    };

    const stats = getOccupancyStats();

    return (
        <main className="container mx-auto p-8">
            <div className="mb-6">
                <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                    ← Back to Samples
                </Link>
                <h1 className="text-3xl font-bold mb-2">🏢 Interactive Building Map</h1>
                <p className="text-gray-600 mb-4">
                    Interactive floor plan with room occupancy tracking and navigation.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Building Info Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <div>
                            <h3 className="font-semibold mb-3">Building Overview</h3>

                            {/* Occupancy Stats */}
                            <div className="bg-white rounded p-3 mb-4">
                                <h4 className="font-medium mb-2">Occupancy Status</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Total Rooms:</span>
                                        <span className="font-mono">{stats.total}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Occupied:</span>
                                        <span className="font-mono text-red-600">{stats.occupied}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Available:</span>
                                        <span className="font-mono text-green-600">{stats.free}</span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span>Rate:</span>
                                        <span className="font-mono">{stats.rate}%</span>
                                    </div>
                                </div>

                                {/* Occupancy Bar */}
                                <div className="mt-3">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-red-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${stats.rate}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="bg-white rounded p-3 mb-4">
                                <h4 className="font-medium mb-2">Legend</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-blue-100 border border-blue-400 rounded"></div>
                                        <span>Office</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-purple-100 border border-purple-400 rounded"></div>
                                        <span>Meeting Room</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-green-100 border border-green-400 rounded"></div>
                                        <span>Common Area</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-orange-100 border border-orange-400 rounded"></div>
                                        <span>Restroom</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-gray-100 border border-gray-400 rounded"></div>
                                        <span>Storage</span>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <span>Available</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                        <span>Occupied</span>
                                    </div>
                                </div>
                            </div>

                            {/* Selected Room Info */}
                            {selectedRoom && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                    <h4 className="font-medium mb-2 text-yellow-800">Selected Room</h4>
                                    <div className="space-y-1 text-sm">
                                        <div><strong>Name:</strong> {selectedRoom.name}</div>
                                        <div><strong>Type:</strong> {selectedRoom.type}</div>
                                        <div><strong>Status:</strong>
                                            <span className={`ml-1 ${selectedRoom.occupied ? 'text-red-600' : 'text-green-600'}`}>
                                                {selectedRoom.occupied ? 'Occupied' : 'Available'}
                                            </span>
                                        </div>
                                        {selectedRoom.capacity && (
                                            <div><strong>Capacity:</strong> {selectedRoom.capacity}</div>
                                        )}
                                        {selectedRoom.description && (
                                            <div><strong>Description:</strong> {selectedRoom.description}</div>
                                        )}

                                        <button
                                            onClick={() => toggleRoomOccupancy(selectedRoom.id)}
                                            className={`mt-2 w-full px-3 py-1 rounded text-sm transition-colors ${selectedRoom.occupied
                                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                                    : 'bg-red-500 hover:bg-red-600 text-white'
                                                }`}
                                        >
                                            Mark as {selectedRoom.occupied ? 'Available' : 'Occupied'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Building Map */}
                <div className="lg:col-span-3">
                    <div className="border-2 border-gray-200 rounded-lg bg-white overflow-hidden">
                        <h3 className="text-lg font-medium p-4 border-b border-gray-200">
                            Floor Plan - Level 1
                        </h3>
                        <div className="relative">
                            <Viewer scene={scene} width={800} height={500} />

                            {/* Interactive overlay for room clicks */}
                            <div className="absolute inset-0">
                                {/* Room click areas - simplified for demo */}
                                <div
                                    className="absolute cursor-pointer"
                                    style={{ left: '50px', top: '50px', width: '200px', height: '120px' }}
                                    onClick={() => handleRoomClick('room1')}
                                    onMouseEnter={() => setHoveredRoom('room1')}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                />
                                <div
                                    className="absolute cursor-pointer"
                                    style={{ left: '280px', top: '50px', width: '150px', height: '80px' }}
                                    onClick={() => handleRoomClick('room2')}
                                    onMouseEnter={() => setHoveredRoom('room2')}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                />
                                <div
                                    className="absolute cursor-pointer"
                                    style={{ left: '460px', top: '50px', width: '150px', height: '80px' }}
                                    onClick={() => handleRoomClick('room3')}
                                    onMouseEnter={() => setHoveredRoom('room3')}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                />
                                <div
                                    className="absolute cursor-pointer"
                                    style={{ left: '640px', top: '50px', width: '120px', height: '200px' }}
                                    onClick={() => handleRoomClick('room4')}
                                    onMouseEnter={() => setHoveredRoom('room4')}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                />
                                <div
                                    className="absolute cursor-pointer"
                                    style={{ left: '280px', top: '160px', width: '150px', height: '80px' }}
                                    onClick={() => handleRoomClick('room5')}
                                    onMouseEnter={() => setHoveredRoom('room5')}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                />
                                <div
                                    className="absolute cursor-pointer"
                                    style={{ left: '460px', top: '160px', width: '80px', height: '80px' }}
                                    onClick={() => handleRoomClick('room6')}
                                    onMouseEnter={() => setHoveredRoom('room6')}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                />
                                <div
                                    className="absolute cursor-pointer"
                                    style={{ left: '570px', top: '160px', width: '40px', height: '80px' }}
                                    onClick={() => handleRoomClick('room7')}
                                    onMouseEnter={() => setHoveredRoom('room7')}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                />
                                <div
                                    className="absolute cursor-pointer"
                                    style={{ left: '50px', top: '200px', width: '200px', height: '150px' }}
                                    onClick={() => handleRoomClick('room8')}
                                    onMouseEnter={() => setHoveredRoom('room8')}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Room List */}
                    <div className="mt-4">
                        <h4 className="font-medium mb-3">Room Directory</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {building.rooms.map(room => (
                                <div
                                    key={room.id}
                                    onClick={() => setSelectedRoom(room)}
                                    className={`p-3 rounded border cursor-pointer transition-colors ${selectedRoom?.id === room.id
                                            ? 'bg-yellow-50 border-yellow-300'
                                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-sm">{room.name}</div>
                                            <div className="text-xs text-gray-600 capitalize">{room.type}</div>
                                        </div>
                                        <div className={`w-3 h-3 rounded-full ${room.occupied ? 'bg-red-500' : 'bg-green-500'
                                            }`} />
                                    </div>
                                    {room.capacity && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            Capacity: {room.capacity}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
