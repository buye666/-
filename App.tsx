
import React, { useState } from 'react';
import { Users, ClipboardList, GraduationCap, School } from 'lucide-react';
import SeatingSystem from './SeatingSystem';
import ProctorSystem from './ProctorSystem';

type ActiveSystem = 'home' | 'seating' | 'proctor';

function App() {
  const [activeSystem, setActiveSystem] = useState<ActiveSystem>('home');

  if (activeSystem === 'seating') {
    return <SeatingSystem onBack={() => setActiveSystem('home')} />;
  }

  if (activeSystem === 'proctor') {
    return <ProctorSystem onBack={() => setActiveSystem('home')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
              <School className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">智能考务管理系统 <span className="text-xs font-normal text-slate-400 ml-1">v3.0</span></h1>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-slate-800 mb-4">欢迎使用智能考务系统</h2>
          <p className="text-lg text-slate-500">请选择您需要使用的子系统</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Card 1: Seating System */}
          <button 
            onClick={() => setActiveSystem('seating')}
            className="group relative bg-white p-10 rounded-3xl shadow-lg border border-slate-200 hover:border-indigo-500 hover:shadow-2xl transition-all flex flex-col items-center text-center overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
            <div className="bg-indigo-50 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users className="w-16 h-16 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">考生排座系统</h3>
            <p className="text-slate-500 leading-relaxed">
              导入考生名单，支持高中选科走班与初中年级管理。自动分配考场、座位，支持日语特殊考场，一键生成门贴、桌贴与班级分发表。
            </p>
            <div className="mt-8 px-6 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              进入系统 &rarr;
            </div>
          </button>

          {/* Card 2: Proctor System */}
          <button 
            onClick={() => setActiveSystem('proctor')}
            className="group relative bg-white p-10 rounded-3xl shadow-lg border border-slate-200 hover:border-emerald-500 hover:shadow-2xl transition-all flex flex-col items-center text-center overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
            <div className="bg-emerald-50 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
              <ClipboardList className="w-16 h-16 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">监考排表系统</h3>
            <p className="text-slate-500 leading-relaxed">
              智能分配监考任务，支持单人/双人监考模式。自动平衡教师工作量，处理楼道监考分配，并可设置特定教师的监考回避限制。
            </p>
            <div className="mt-8 px-6 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              进入系统 &rarr;
            </div>
          </button>
        </div>
      </main>

      <footer className="py-6 text-center text-slate-400 text-sm">
        作者：不野
      </footer>
    </div>
  );
}

export default App;
