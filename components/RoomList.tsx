
import React, { useState } from 'react';
import { Room } from '../types';

interface RoomListProps {
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const RoomList: React.FC<RoomListProps> = ({ rooms, setRooms }) => {
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCount, setNewRoomCount] = useState('30');

  const handleAdd = () => {
    if (!newRoomName.trim()) return;
    setRooms([...rooms, {
      id: generateId(),
      name: newRoomName.trim(),
      studentCount: parseInt(newRoomCount) || 0
    }]);
    // Try to auto-increment room number if it looks like a number
    const num = parseInt(newRoomName);
    if (!isNaN(num)) {
      setNewRoomName((num + 1).toString());
    } else {
      setNewRoomName('');
    }
  };

  const handleBatchAdd = () => {
    // Add 6 default rooms if empty
    if (rooms.length === 0) {
      const defaults = [
        { id: generateId(), name: '401', studentCount: 40 },
        { id: generateId(), name: '402', studentCount: 40 },
        { id: generateId(), name: '403', studentCount: 35 },
        { id: generateId(), name: '404', studentCount: 35 },
        { id: generateId(), name: '501', studentCount: 30 },
        { id: generateId(), name: '502', studentCount: 30 },
      ];
      setRooms(defaults);
    }
  };

  const deleteRoom = (id: string) => {
    setRooms(rooms.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">考场管理</h2>
        {rooms.length === 0 && (
          <button 
            onClick={handleBatchAdd}
            className="text-sm text-indigo-600 hover:underline"
          >
            一键生成默认考场(401-502)
          </button>
        )}
      </div>

      <div className="flex gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200 items-end">
        <div className="flex-grow">
          <label className="block text-sm text-slate-500 mb-1">考场号/名称</label>
          <input 
            type="text" 
            placeholder="例如: 401" 
            className="border p-2 rounded w-full"
            value={newRoomName}
            onChange={e => setNewRoomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <div className="w-32">
          <label className="block text-sm text-slate-500 mb-1">考生人数</label>
          <input 
            type="number" 
            className="border p-2 rounded w-full"
            value={newRoomCount}
            onChange={e => setNewRoomCount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <button 
          onClick={handleAdd}
          className="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-700 transition h-[42px]"
        >
          添加
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-600 text-sm uppercase">
            <tr>
              <th className="p-4 border-b">序号</th>
              <th className="p-4 border-b">考场名称</th>
              <th className="p-4 border-b">考生人数</th>
              <th className="p-4 border-b text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
               <tr><td colSpan={4} className="p-8 text-center text-slate-400">请添加考场</td></tr>
            ) : (
              rooms.map((room, idx) => (
                <tr key={room.id} className="hover:bg-slate-50 border-b last:border-0">
                  <td className="p-4 text-slate-400">{idx + 1}</td>
                  <td className="p-4 font-bold text-slate-700">{room.name}</td>
                  <td className="p-4">{room.studentCount} 人</td>
                  <td className="p-4 text-right">
                    <button onClick={() => deleteRoom(room.id)} className="text-red-500 hover:text-red-700">
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
