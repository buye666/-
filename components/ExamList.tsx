
import React, { useState } from 'react';
import { Exam, Room } from '../types';
import { parseExamsFromText } from '../services/geminiService';

interface ExamListProps {
  exams: Exam[];
  setExams: (exams: Exam[]) => void;
  rooms: Room[];
  // New props for config
  examTitle: string;
  setExamTitle: (title: string) => void;
  gradeName: string;
  setGradeName: (name: string) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const ExamList: React.FC<ExamListProps> = ({ 
  exams, setExams, rooms, 
  examTitle, setExamTitle, gradeName, setGradeName 
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  
  // New exam state
  const [newExam, setNewExam] = useState<Partial<Exam>>({
    date: '', startTime: '', endTime: '', subject: ''
  });
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  
  // AI Import room selection state
  const [importSelectedRoomIds, setImportSelectedRoomIds] = useState<string[]>([]);
  
  // Initialize room selection with all rooms whenever rooms change
  React.useEffect(() => {
    if (selectedRoomIds.length === 0 && rooms.length > 0) {
      setSelectedRoomIds(rooms.map(r => r.id));
    }
  }, [rooms.length]);

  const handleManualAdd = () => {
    if (!newExam.subject || !newExam.date || !newExam.startTime || !newExam.endTime) return;
    if (selectedRoomIds.length === 0) {
      alert("请至少选择一个考场");
      return;
    }
    
    // Simple duration calc
    const start = new Date(`2000-01-01T${newExam.startTime}`);
    const end = new Date(`2000-01-01T${newExam.endTime}`);
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;

    if (durationMinutes <= 0) {
      alert("结束时间必须晚于开始时间");
      return;
    }

    setExams([...exams, {
      id: generateId(),
      subject: newExam.subject!,
      date: newExam.date!,
      startTime: newExam.startTime!,
      endTime: newExam.endTime!,
      durationMinutes,
      roomIds: [...selectedRoomIds]
    }]);
    
    // Reset form but keep last date/time for convenience
    setNewExam(prev => ({ ...prev, subject: '' }));
  };

  const openImportModal = () => {
    // Initialize import room selection with currently selected rooms from manual view, or all
    if (selectedRoomIds.length > 0) {
        setImportSelectedRoomIds([...selectedRoomIds]);
    } else {
        setImportSelectedRoomIds(rooms.map(r => r.id));
    }
    setShowImportModal(true);
  };

  const handleAIImport = async () => {
    if (!importText.trim()) return;
    if (importSelectedRoomIds.length === 0) {
        alert("请至少在导入窗口中选择一个考场");
        return;
    }

    setIsImporting(true);
    try {
      const parsed = await parseExamsFromText(importText);
      // Automatically assign selected rooms to imported exams
      const examsWithRooms = parsed.map(e => ({
        ...e,
        roomIds: [...importSelectedRoomIds]
      }));
      setExams([...exams, ...examsWithRooms]);
      setShowImportModal(false);
      setImportText('');
    } catch (e) {
      alert("导入失败，请检查您的输入格式或 API Key。");
    } finally {
      setIsImporting(false);
    }
  };

  const deleteExam = (id: string) => {
    setExams(exams.filter(e => e.id !== id));
  };

  const toggleRoomSelection = (roomId: string) => {
    if (selectedRoomIds.includes(roomId)) {
      setSelectedRoomIds(selectedRoomIds.filter(id => id !== roomId));
    } else {
      setSelectedRoomIds([...selectedRoomIds, roomId]);
    }
  };
  
  const toggleImportRoomSelection = (roomId: string) => {
    if (importSelectedRoomIds.includes(roomId)) {
      setImportSelectedRoomIds(importSelectedRoomIds.filter(id => id !== roomId));
    } else {
      setImportSelectedRoomIds([...importSelectedRoomIds, roomId]);
    }
  };

  const selectAllRooms = () => setSelectedRoomIds(rooms.map(r => r.id));
  const selectFirstNRooms = (n: number) => setSelectedRoomIds(rooms.slice(0, n).map(r => r.id));

  const selectAllImportRooms = () => setImportSelectedRoomIds(rooms.map(r => r.id));
  const clearImportRooms = () => setImportSelectedRoomIds([]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">考试管理</h2>
        <button 
          onClick={openImportModal}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/></svg>
          AI 智能导入
        </button>
      </div>

      {/* Basic Config */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            监考表基础信息
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="text-xs text-slate-500 mb-1 block">监考表名称 (显示在表头)</label>
                <input 
                    type="text" 
                    className="border p-2 rounded w-full text-sm font-medium"
                    value={examTitle}
                    onChange={e => setExamTitle(e.target.value)}
                    placeholder="例如：2025年秋季期末考试监考表"
                />
            </div>
            <div>
                <label className="text-xs text-slate-500 mb-1 block">年级名称 (显示在表格左侧)</label>
                <input 
                    type="text" 
                    className="border p-2 rounded w-full text-sm font-medium"
                    value={gradeName}
                    onChange={e => setGradeName(e.target.value)}
                    placeholder="例如：高三"
                />
            </div>
        </div>
      </div>

      {/* Manual Input Form */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 space-y-4">
        <h3 className="text-sm font-bold text-slate-700 mb-2">添加单场考试</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="text-xs text-slate-500 mb-1 block">考试科目</label>
            <input 
              type="text" 
              placeholder="例如: 数学" 
              className="border p-2 rounded w-full"
              value={newExam.subject}
              onChange={e => setNewExam({...newExam, subject: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">日期</label>
            <input 
              type="date" 
              className="border p-2 rounded w-full"
              value={newExam.date}
              onChange={e => setNewExam({...newExam, date: e.target.value})}
            />
          </div>
          <div className="flex gap-2">
            <div className="w-full">
              <label className="text-xs text-slate-500 mb-1 block">开始</label>
              <input 
                type="time" 
                className="border p-2 rounded w-full"
                value={newExam.startTime}
                onChange={e => setNewExam({...newExam, startTime: e.target.value})}
              />
            </div>
            <div className="w-full">
              <label className="text-xs text-slate-500 mb-1 block">结束</label>
              <input 
                type="time" 
                className="border p-2 rounded w-full"
                value={newExam.endTime}
                onChange={e => setNewExam({...newExam, endTime: e.target.value})}
              />
            </div>
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleManualAdd}
              className="bg-slate-800 text-white rounded hover:bg-slate-700 transition w-full py-2"
            >
              添加考试
            </button>
          </div>
        </div>

        {/* Room Selection */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-slate-700">选择考场 (已选: {selectedRoomIds.length} 个)</label>
            <div className="flex gap-2 text-xs">
              <button onClick={selectAllRooms} className="text-indigo-600 hover:underline">全选</button>
              <span className="text-slate-300">|</span>
              <button onClick={() => selectFirstNRooms(Math.ceil(rooms.length / 2))} className="text-slate-500 hover:text-indigo-600">前一半</button>
              <button onClick={() => setSelectedRoomIds([])} className="text-slate-500 hover:text-red-500">清空</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {rooms.length === 0 && <span className="text-sm text-red-400">请先在"考场管理"中添加考场</span>}
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => toggleRoomSelection(room.id)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  selectedRoomIds.includes(room.id)
                    ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {room.name} ({room.studentCount}人)
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
        {exams.length === 0 ? (
          <div className="p-8 text-center text-slate-500">暂无考试安排。</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-sm uppercase">
              <tr>
                <th className="p-4 border-b">科目</th>
                <th className="p-4 border-b">日期/时间</th>
                <th className="p-4 border-b">考场数</th>
                <th className="p-4 border-b text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(exam => (
                <tr key={exam.id} className="hover:bg-slate-50 border-b last:border-0">
                  <td className="p-4 font-medium">
                    {exam.subject}
                    <div className="text-xs text-slate-400 font-normal">{exam.durationMinutes} 分钟</div>
                  </td>
                  <td className="p-4 text-sm">
                    <div>{exam.date}</div>
                    <div className="text-slate-500">{exam.startTime} - {exam.endTime}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {exam.roomIds?.length || 0} 个考场
                    </span>
                    <div className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">
                      {exam.roomIds?.map(rid => rooms.find(r => r.id === rid)?.name).join(', ')}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => deleteExam(exam.id)} className="text-red-500 hover:text-red-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* AI Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 flex flex-col max-h-[90vh]">
            <h3 className="text-lg font-bold mb-2">AI 智能识别考试信息</h3>
            <p className="text-slate-500 text-sm mb-4">
              请粘贴考试安排文本。识别出的考试将应用到下方选择的考场中。
            </p>
            
            <textarea 
              className="w-full h-32 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none mb-4"
              placeholder="例如：6月20日上午9点到11点考高等数学，下午2点到4点考大学英语..."
              value={importText}
              onChange={e => setImportText(e.target.value)}
            ></textarea>

            {/* Import Room Selection */}
            <div className="flex-grow overflow-hidden flex flex-col border rounded-lg p-3 bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-700">即将分配到的考场 (已选: {importSelectedRoomIds.length} 个)</label>
                    <div className="flex gap-2 text-xs">
                    <button onClick={selectAllImportRooms} className="text-indigo-600 hover:underline">全选</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={clearImportRooms} className="text-slate-500 hover:text-red-500">清空</button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 overflow-y-auto">
                    {rooms.length === 0 && <span className="text-sm text-red-400">请先在"考场管理"中添加考场</span>}
                    {rooms.map(room => (
                    <button
                        key={room.id}
                        onClick={() => toggleImportRoomSelection(room.id)}
                        className={`px-3 py-1 text-xs rounded border transition-colors ${
                            importSelectedRoomIds.includes(room.id)
                            ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                    >
                        {room.name}
                    </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
              >
                取消
              </button>
              <button 
                onClick={handleAIImport}
                disabled={isImporting}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isImporting ? '分析中...' : '智能识别并添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
