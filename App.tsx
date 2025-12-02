
import React, { useState } from 'react';
import { InvigilationMode, Exam, Teacher, Constraints, ScheduleResult, Room } from './types';
import { generateSchedule } from './utils/scheduler';
import { StepIndicator } from './components/StepIndicator';
import { ExamList } from './components/ExamList';
import { TeacherList } from './components/TeacherList';
import { RoomList } from './components/RoomList';
import { ConstraintGrid } from './components/ConstraintGrid';
import { ResultView } from './components/ResultView';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState<InvigilationMode>(InvigilationMode.SINGLE);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [constraints, setConstraints] = useState<Constraints>({});
  const [result, setResult] = useState<ScheduleResult | null>(null);

  const steps = ["模式设置", "考场管理", "考试管理", "教师管理", "限制设置", "生成结果"];

  const handleNext = () => {
    if (currentStep === 5) {
      // Run generation
      const generated = generateSchedule(exams, rooms, teachers, constraints, mode);
      setResult(generated);
    }
    setCurrentStep(prev => Math.min(prev + 1, 6));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">排考模式设置</h2>
            <div className="grid grid-cols-2 gap-6">
              <button 
                onClick={() => setMode(InvigilationMode.SINGLE)}
                className={`p-6 border-2 rounded-xl transition-all ${
                  mode === InvigilationMode.SINGLE 
                    ? 'border-primary bg-blue-50 text-primary ring-2 ring-blue-200' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-3xl mb-2">👤</div>
                <div className="font-bold text-lg">单人监考</div>
                <div className="text-sm text-slate-500 mt-2">每个考场安排一名监考老师。</div>
              </button>
              <button 
                onClick={() => setMode(InvigilationMode.DOUBLE)}
                className={`p-6 border-2 rounded-xl transition-all ${
                  mode === InvigilationMode.DOUBLE 
                    ? 'border-primary bg-blue-50 text-primary ring-2 ring-blue-200' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-3xl mb-2">👥</div>
                <div className="font-bold text-lg">双人监考</div>
                <div className="text-sm text-slate-500 mt-2">每个考场安排两名监考老师。</div>
              </button>
            </div>
            <p className="mt-8 text-slate-500 text-sm">
                请选择每场考试所需的监考人数，系统将根据此设置自动分配教师并平衡工作量。
            </p>
          </div>
        );
      case 2:
        return <RoomList rooms={rooms} setRooms={setRooms} />;
      case 3:
        return <ExamList exams={exams} setExams={setExams} rooms={rooms} />;
      case 4:
        return <TeacherList teachers={teachers} setTeachers={setTeachers} />;
      case 5:
        return <ConstraintGrid exams={exams} teachers={teachers} constraints={constraints} setConstraints={setConstraints} />;
      case 6:
        return result ? <ResultView result={result} exams={exams} teachers={teachers} rooms={rooms} mode={mode} /> : <div>正在生成排考表...</div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 max-w-[95%] mx-auto">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">智能排监考<span className="text-primary">系统</span></h1>
        <p className="text-slate-500 mt-2">AI 驱动的智能监考安排与工作量平衡工具</p>
      </header>

      <div className="w-full">
        <StepIndicator currentStep={currentStep} totalSteps={6} steps={steps} />
        
        <div className="mt-8 mb-20">
          {renderStep()}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 flex justify-center z-50 shadow-lg">
         <div className="w-full max-w-5xl flex justify-between">
            <button 
                onClick={handleBack}
                disabled={currentStep === 1}
                className="px-6 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
                上一步
            </button>
            {currentStep < 6 ? (
                <button 
                    onClick={handleNext}
                    disabled={
                      (currentStep === 2 && rooms.length === 0) ||
                      (currentStep === 3 && exams.length === 0) || 
                      (currentStep === 4 && teachers.length === 0)
                    }
                    className="px-8 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {currentStep === 5 ? '自动生成监考表' : '下一步'}
                </button>
            ) : (
                <button 
                    onClick={() => setCurrentStep(1)}
                    className="px-8 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 shadow-md transition"
                >
                    重新开始
                </button>
            )}
         </div>
      </div>
    </div>
  );
};

export default App;
