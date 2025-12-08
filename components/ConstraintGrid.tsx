
import React from 'react';
import { Exam, Teacher, Constraints } from '../types';

interface ConstraintGridProps {
  exams: Exam[];
  teachers: Teacher[];
  constraints: Constraints;
  setConstraints: (c: Constraints) => void;
}

export const ConstraintGrid: React.FC<ConstraintGridProps> = ({ exams, teachers, constraints, setConstraints }) => {
  
  const toggleConstraint = (examId: string, teacherId: string) => {
    const current = constraints[examId] || [];
    let updated;
    if (current.includes(teacherId)) {
      updated = current.filter(id => id !== teacherId);
    } else {
      updated = [...current, teacherId];
    }
    
    setConstraints({
      ...constraints,
      [examId]: updated
    });
  };

  if (exams.length === 0 || teachers.length === 0) {
    return <div className="text-center text-slate-500 py-10">请先添加考试和教师数据。</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">监考限制设置 (谁不能监考)</h2>
      <p className="text-slate-500 text-sm">点击表格中的单元格，将教师标记为该场考试 <span className="text-red-500 font-bold">无法监考</span>。</p>
      
      <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-3 border-b border-r text-left sticky left-0 bg-slate-50 z-10 w-48">考试科目 / 教师</th>
              {teachers.map(t => (
                <th key={t.id} className="p-3 border-b min-w-[100px] text-center font-medium text-slate-700">
                  <div className="truncate w-full" title={t.name}>{t.name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exams.map(exam => (
              <tr key={exam.id} className="hover:bg-slate-50">
                <td className="p-3 border-b border-r sticky left-0 bg-white font-medium z-10">
                  <div className="font-bold text-slate-800">{exam.subject}</div>
                  <div className="text-xs text-slate-500">{exam.date}</div>
                  <div className="text-xs text-slate-400">{exam.startTime}-{exam.endTime}</div>
                </td>
                {teachers.map(t => {
                  const isUnavailable = constraints[exam.id]?.includes(t.id);
                  return (
                    <td 
                      key={`${exam.id}-${t.id}`} 
                      onClick={() => toggleConstraint(exam.id, t.id)}
                      className={`p-1 border-b text-center cursor-pointer transition-colors ${
                        isUnavailable ? 'bg-red-50' : ''
                      }`}
                    >
                      <div className={`w-full h-full p-2 rounded ${
                        isUnavailable 
                          ? 'bg-red-100 text-red-600 font-bold' 
                          : 'text-slate-300 hover:bg-slate-100'
                      }`}>
                        {isUnavailable ? '不可监考' : '可用'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
