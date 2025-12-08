
import React, { useRef } from 'react';
import { ScheduleResult, Exam, Teacher, Room, InvigilationMode } from '../types';

interface ResultViewProps {
  result: ScheduleResult;
  exams: Exam[];
  teachers: Teacher[];
  rooms: Room[];
  mode: InvigilationMode;
  examTitle: string;
  gradeName: string;
}

export const ResultView: React.FC<ResultViewProps> = ({ 
  result, exams, teachers, rooms, mode, 
  examTitle, gradeName 
}) => {
  const tableRef = useRef<HTMLDivElement>(null);

  // 1. Organize Columns
  // Group exams by Date -> Session (AM/PM) -> Time Slot
  const sortedExams = [...exams].sort((a, b) => {
    return new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime();
  });

  const datesMap = new Map<string, Exam[]>();
  sortedExams.forEach(e => {
    if (!datesMap.has(e.date)) datesMap.set(e.date, []);
    datesMap.get(e.date)?.push(e);
  });

  const tableStructure = Array.from(datesMap.entries()).map(([date, dateExams]) => {
    const morningExams = dateExams.filter(e => parseInt(e.startTime.split(':')[0]) < 13);
    const afternoonExams = dateExams.filter(e => parseInt(e.startTime.split(':')[0]) >= 13);
    
    return {
      date,
      sessions: [
        { name: '上午', exams: morningExams },
        { name: '下午', exams: afternoonExams }
      ].filter(s => s.exams.length > 0)
    };
  });

  const getTeacherNames = (examId: string, roomId: string, index: number) => {
    const entry = result.schedule.find(s => s.examId === examId && s.roomId === roomId);
    if (!entry || !entry.teacherIds[index]) return '//'; 
    const t = teachers.find(tea => tea.id === entry.teacherIds[index]);
    return t ? t.name : '??';
  };

  const getHallwayTeacherName = (exam: Exam) => {
    const tid = result.hallwayAssignments[exam.id];
    if (!tid) return '待定(无学科教师)';
    const t = teachers.find(tea => tea.id === tid);
    return t ? t.name : '未知';
  };

  const loads = result.teacherStats.map(t => t.totalMinutesAssigned);
  const maxLoad = Math.max(...loads);
  const totalMinutes = loads.reduce((a, b) => a + b, 0);
  const avgLoad = teachers.length > 0 ? Math.round(totalMinutes / teachers.length) : 0;

  const isDouble = mode === InvigilationMode.DOUBLE;

  // Format date from YYYY-MM-DD to MM月DD日
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}月${d.getDate()}日`;
    } catch {
      return dateStr;
    }
  };

  const exportToExcel = () => {
    if (!tableRef.current) return;
    const table = tableRef.current.querySelector('table');
    if (!table) return;

    // Use a simple HTML blob for wide compatibility
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>监考安排表</x:Name>
            <x:WorksheetOptions>
            <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000000; padding: 8px; text-align: center; }
          .header { background-color: #f0f0f0; font-weight: bold; }
          .title { font-size: 18px; font-weight: bold; height: 40px; }
        </style>
      </head>
      <body>
        ${table.outerHTML}
      </body>
      </html>`;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `监考安排表_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Calculate total columns for Title colspan
  let totalTimeSlots = 0;
  tableStructure.forEach(day => day.sessions.forEach(s => s.exams.forEach(() => totalTimeSlots += (isDouble ? 2 : 1))));
  const totalCols = 3 + totalTimeSlots; // Grade + Room + Count + Slots

  return (
    <div className="space-y-8 animate-fade-in w-full">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
            <div className="text-sm text-slate-500 uppercase font-bold">总监考时长</div>
            <div className="text-2xl font-bold text-slate-800">{(totalMinutes / 60).toFixed(1)} 小时</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
            <div className="text-sm text-slate-500 uppercase font-bold">人均时长</div>
            <div className="text-2xl font-bold text-indigo-600">{(avgLoad / 60).toFixed(1)} 小时</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-slate-200">
            <div className="text-sm text-slate-500 uppercase font-bold">未分配任务</div>
            <div className={`text-2xl font-bold ${result.unassignedTasks.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {result.unassignedTasks.length} <span className="text-xs font-normal text-slate-400">个考场</span>
            </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-x-auto" ref={tableRef}>
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center min-w-max">
            <h3 className="font-bold text-slate-700 text-lg">考试安排及监考表</h3>
            <button 
                onClick={exportToExcel} 
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition-colors text-sm font-medium"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                导出表格
            </button>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-center border-collapse text-sm min-w-max border border-slate-300">
            <thead>
              {/* Row 0: Exam Title */}
              <tr className="bg-white">
                <th colSpan={totalCols} className="border border-slate-300 p-4 font-bold text-xl text-slate-900">
                    {examTitle}
                </th>
              </tr>

              {/* Row 1: Dates */}
              <tr className="bg-slate-100">
                <th rowSpan={isDouble ? 5 : 4} className="border border-slate-300 p-2 min-w-[60px]">年级</th>
                <th rowSpan={isDouble ? 5 : 4} className="border border-slate-300 p-2 min-w-[60px]">考室</th>
                <th rowSpan={isDouble ? 5 : 4} className="border border-slate-300 p-2 min-w-[60px]">人数</th>
                {tableStructure.map((day, i) => {
                  let colSpan = 0;
                  day.sessions.forEach(s => {
                    s.exams.forEach(() => {
                      colSpan += isDouble ? 2 : 1;
                    });
                  });
                  return (
                    <th key={i} colSpan={colSpan} className="border border-slate-300 p-2 font-bold text-slate-800 bg-slate-200 text-lg">
                      {formatDate(day.date)}
                    </th>
                  );
                })}
              </tr>

              {/* Row 2: Sessions */}
              <tr className="bg-slate-100">
                {tableStructure.map((day) => 
                  day.sessions.map((session, j) => {
                    let colSpan = 0;
                    session.exams.forEach(() => colSpan += isDouble ? 2 : 1);
                    return (
                      <th key={`${day.date}-${j}`} colSpan={colSpan} className="border border-slate-300 p-2 font-semibold text-base">
                        {session.name}
                      </th>
                    );
                  })
                )}
              </tr>

              {/* Row 3: Time */}
              <tr className="bg-slate-50">
                {tableStructure.map(day => 
                  day.sessions.map(session => 
                    session.exams.map(exam => (
                      <th key={exam.id} colSpan={isDouble ? 2 : 1} className="border border-slate-300 p-1 text-slate-700 font-mono">
                        {exam.startTime}-{exam.endTime}
                      </th>
                    ))
                  )
                )}
              </tr>

              {/* Row 4: Subject (Merged if double) */}
              <tr className="bg-slate-50">
                {tableStructure.map(day => 
                  day.sessions.map(session => 
                    session.exams.map(exam => (
                      <th key={exam.id} colSpan={isDouble ? 2 : 1} className="border border-slate-300 p-2 font-bold text-slate-900 bg-blue-50/50">
                        {exam.subject}
                      </th>
                    ))
                  )
                )}
              </tr>

              {/* Row 5: Proctor Headers (Only for Double Mode) */}
              {isDouble && (
                <tr className="bg-slate-50">
                  {tableStructure.map(day => 
                    day.sessions.map(session => 
                      session.exams.map(exam => (
                        <React.Fragment key={exam.id}>
                          <th className="border border-slate-300 p-1 text-xs text-slate-500 font-medium">甲监考</th>
                          <th className="border border-slate-300 p-1 text-xs text-slate-500 font-medium">乙监考</th>
                        </React.Fragment>
                      ))
                    )
                  )}
                </tr>
              )}
            </thead>
            
            <tbody>
              {rooms.map((room, idx) => (
                <tr key={room.id} className="hover:bg-slate-50">
                  {/* Merge Grade Column: Render only on first row, span entire table height (rooms + 1 for Hallway) */}
                  {idx === 0 && (
                      <td className="border border-slate-300 p-2 text-slate-900 font-medium bg-white" rowSpan={rooms.length + 1}>
                        <div className="whitespace-pre-wrap">{gradeName}</div>
                      </td>
                  )}
                  
                  <td className="border border-slate-300 p-2 font-bold">{room.name}</td>
                  <td className="border border-slate-300 p-2">{room.studentCount}</td>
                  
                  {tableStructure.map(day => 
                    day.sessions.map(session => 
                      session.exams.map(exam => {
                        const isActiveRoom = exam.roomIds?.includes(room.id);
                        if (!isActiveRoom) {
                           return (
                             <React.Fragment key={exam.id}>
                               <td className="border border-slate-300 p-2 bg-slate-100 text-slate-300" colSpan={isDouble ? 2 : 1}>//</td>
                             </React.Fragment>
                           );
                        }
                        if (isDouble) {
                          return (
                            <React.Fragment key={exam.id}>
                              <td className="border border-slate-300 p-2">{getTeacherNames(exam.id, room.id, 0)}</td>
                              <td className="border border-slate-300 p-2">{getTeacherNames(exam.id, room.id, 1)}</td>
                            </React.Fragment>
                          );
                        } else {
                          return (
                            <td key={exam.id} className="border border-slate-300 p-2">
                              {getTeacherNames(exam.id, room.id, 0)}
                            </td>
                          );
                        }
                      })
                    )
                  )}
                </tr>
              ))}
              
              {/* Hallway Row */}
              <tr className="bg-blue-50 border-t-2 border-slate-400">
                {/* No Grade Cell here because rowSpan covers it */}
                <td className="border border-slate-300 p-2 font-bold text-slate-700" colSpan={2}>楼道</td>
                {tableStructure.map(day => 
                  day.sessions.map(session => 
                    session.exams.map(exam => {
                      const hallwayName = getHallwayTeacherName(exam);
                      return (
                        <td key={exam.id} colSpan={isDouble ? 2 : 1} className="border border-slate-300 p-2 font-medium text-blue-800">
                          {hallwayName}
                        </td>
                      );
                    })
                  )
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-slate-200 print:hidden">
        <h3 className="font-bold text-slate-700 mb-4">监考工作量统计 (含楼道监考)</h3>
        <div className="space-y-3">
          {result.teacherStats
             .sort((a,b) => b.totalMinutesAssigned - a.totalMinutesAssigned)
             .map(t => {
                const percentage = maxLoad > 0 ? (t.totalMinutesAssigned / maxLoad) * 100 : 0;
                return (
                    <div key={t.id}>
                        <div className="flex justify-between text-sm mb-1">
                            <div>
                                <span className="font-medium mr-2">{t.name}</span>
                                {t.subject && <span className="text-xs text-slate-400">({t.subject})</span>}
                            </div>
                            <span className="font-mono text-slate-500">{(t.totalMinutesAssigned / 60).toFixed(1)} 小时</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div 
                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>
                );
             })
          }
        </div>
      </div>
    </div>
  );
};
