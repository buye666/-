
import React, { useState } from 'react';
import { Teacher } from '../types';
import { parseTeachersFromText } from '../services/geminiService';

interface TeacherListProps {
  teachers: Teacher[];
  setTeachers: (teachers: Teacher[]) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const TeacherList: React.FC<TeacherListProps> = ({ teachers, setTeachers }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('');

  const handleManualAdd = () => {
    if (!newName.trim()) return;
    setTeachers([...teachers, {
      id: generateId(),
      name: newName.trim(),
      subject: newSubject.trim(),
      totalMinutesAssigned: 0
    }]);
    setNewName('');
    setNewSubject('');
  };

  const handleAIImport = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    try {
      const parsed = await parseTeachersFromText(importText);
      setTeachers([...teachers, ...parsed]);
      setShowImportModal(false);
      setImportText('');
    } catch (e) {
      alert("教师名单导入失败。");
    } finally {
      setIsImporting(false);
    }
  };

  const deleteTeacher = (id: string) => {
    setTeachers(teachers.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">监考教师管理</h2>
        <button 
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/></svg>
          AI 智能导入
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex gap-4 mb-2">
            <div className="flex-grow">
                <label className="text-xs text-slate-500 mb-1 block">姓名</label>
                <input 
                type="text" 
                placeholder="教师姓名" 
                className="border p-2 rounded w-full"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
                />
            </div>
            <div className="w-1/3">
                <label className="text-xs text-slate-500 mb-1 block">学科 (用于楼道监考分配)</label>
                <input 
                type="text" 
                placeholder="例如: 语文" 
                className="border p-2 rounded w-full"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
                />
            </div>
            <div className="flex items-end">
                <button 
                onClick={handleManualAdd}
                className="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-700 transition"
                >
                添加
                </button>
            </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">提示：系统会根据学科自动匹配楼道监考教师（例如语文考试分配语文老师）。</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {teachers.map(teacher => (
          <div key={teacher.id} className="bg-white p-3 rounded shadow-sm border border-slate-200 flex justify-between items-center group relative overflow-hidden">
            <div>
                <span className="font-medium text-slate-700 block">{teacher.name}</span>
                {teacher.subject && (
                    <span className="text-xs text-white bg-indigo-500 px-1.5 py-0.5 rounded-full inline-block mt-1">
                        {teacher.subject}
                    </span>
                )}
            </div>
            <button onClick={() => deleteTeacher(teacher.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        ))}
        {teachers.length === 0 && <div className="col-span-full text-center text-slate-500 py-8">暂无教师数据。</div>}
      </div>

      {/* AI Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold mb-2">AI 智能导入教师名单</h3>
            <p className="text-slate-500 text-sm mb-4">
              请粘贴教师名单。建议包含学科信息以实现精准排课。
              <br/>例如：<span className="font-mono bg-slate-100 p-1">张三(语文), 李四(数学), 王五(英语)</span>
            </p>
            <textarea 
              className="w-full h-40 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              placeholder="张三 语文, 李四 数学..."
              value={importText}
              onChange={e => setImportText(e.target.value)}
            ></textarea>
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
                {isImporting ? '处理中...' : '识别并添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
