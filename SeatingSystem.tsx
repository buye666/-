
import React, { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, RefreshCw, Download, Users, CheckCircle, ArrowUp, ArrowDown, LayoutGrid, Tag, GraduationCap, School, Save, FolderOpen, LogOut, Plus, Trash2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { readExcelFile, generateExamArrangement, exportDetailedExcel, exportSeatLabels, exportClassExcel, exportAllClassesExcel, getUniqueValues } from './utils';
import { ProcessedStudent, AppConfig, SchoolType, SeatingRoom } from './types';

interface SeatingSystemProps {
    onBack: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

function SeatingSystem({ onBack }: SeatingSystemProps) {
  // --- State ---
  const [step, setStep] = useState<number>(0); // 0 = Mode Select
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  
  // Mapping State
  const [mapping, setMapping] = useState({
    name: '',
    class: '',
    grade: '', 
    subject: '', 
    examId: '', 
    remarks: '' 
  });

  // Advanced Configuration State
  const [appConfig, setAppConfig] = useState<AppConfig>({
    schoolType: 'senior', 
    examName: '25秋2024级一阶考试', 
    seatingRooms: [], // Explicit room list
    japaneseKeyword: '日语',
    japaneseTargetRoom: '', // Should match a room location name
    subjectOrder: []
  });

  // Room Management State
  const [newRoomLoc, setNewRoomLoc] = useState('');
  const [newRoomCap, setNewRoomCap] = useState('30');
  
  // Processed Data
  const [processedData, setProcessedData] = useState<ProcessedStudent[]>([]);
  const [selectedClassForExport, setSelectedClassForExport] = useState<string>('');
  
  // Pagination State
  const [previewPage, setPreviewPage] = useState(1);
  const PREVIEW_PAGE_SIZE = 10;

  // --- Handlers ---

  const selectMode = (type: SchoolType) => {
      setAppConfig(prev => ({ 
          ...prev, 
          schoolType: type,
          examName: type === 'senior' ? '高中部考试安排' : '初中部考试安排' 
      }));
      setStep(1);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      try {
        const { data, headers } = await readExcelFile(file);
        if (data.length === 0) {
            alert("文件似乎为空。");
            return;
        }
        setRawData(data);
        setHeaders(headers);
        
        // Auto-guess mapping
        const newMapping = { ...mapping };
        headers.forEach(k => {
            const kLower = k.toLowerCase();
            if (k.includes('名') || kLower.includes('name')) newMapping.name = k;
            if (k.includes('班') || kLower.includes('class')) newMapping.class = k;
            // Prevent mapping "序号" (Index) to ExamID, prefer explicit ID or Custom Exam No
            if ((k.includes('号') || kLower.includes('id')) && !k.includes('序号')) newMapping.examId = k;
            
            if (appConfig.schoolType === 'senior') {
                if (k.includes('科') || kLower.includes('subject')) newMapping.subject = k;
                if (k.includes('备') || k.includes('注') || kLower.includes('remark')) newMapping.remarks = k;
            } else {
                if (k.includes('年级') || kLower.includes('grade')) newMapping.grade = k;
            }
        });
        setMapping(newMapping);
        setStep(2);
      } catch (err) {
        console.error(err);
        alert("读取文件出错，请确保是有效的 Excel 文件。");
      }
    }
  };

  useEffect(() => {
    if (appConfig.schoolType === 'senior' && mapping.subject && rawData.length > 0) {
        const subjects = getUniqueValues(rawData, mapping.subject);
        if (appConfig.subjectOrder.length === 0 || appConfig.subjectOrder.length !== subjects.length) {
            setAppConfig(prev => ({
                ...prev,
                subjectOrder: subjects.map(s => ({ name: s, forceNewRoom: true }))
            }));
        }
    }
  }, [mapping.subject, rawData, appConfig.schoolType]);

  const moveSubject = (index: number, direction: 'up' | 'down') => {
      const newOrder = [...appConfig.subjectOrder];
      if (direction === 'up' && index > 0) {
          [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      } else if (direction === 'down' && index < newOrder.length - 1) {
          [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      setAppConfig({...appConfig, subjectOrder: newOrder});
  };

  const toggleSubjectForceRoom = (index: number) => {
      const newOrder = [...appConfig.subjectOrder];
      newOrder[index].forceNewRoom = !newOrder[index].forceNewRoom;
      setAppConfig({...appConfig, subjectOrder: newOrder});
  };

  // --- Room Handlers ---
  const addSingleRoom = () => {
      if (!newRoomLoc.trim()) return;
      const cap = parseInt(newRoomCap) || 30;
      const newRoom: SeatingRoom = {
          id: generateId(),
          location: newRoomLoc.trim(),
          capacity: cap
      };
      setAppConfig(prev => ({ ...prev, seatingRooms: [...prev.seatingRooms, newRoom] }));
      setNewRoomLoc('');
      
      // Auto-increment guess for next room
      const numPart = parseInt(newRoomLoc);
      if(!isNaN(numPart)) setNewRoomLoc((numPart + 1).toString());
  };

  const deleteRoom = (id: string) => {
      setAppConfig(prev => ({
          ...prev,
          seatingRooms: prev.seatingRooms.filter(r => r.id !== id)
      }));
  };

  const handleSaveConfig = () => {
    try {
      const configKey = `exam_config_${appConfig.schoolType}`;
      const dataToSave = { mapping, appConfig };
      localStorage.setItem(configKey, JSON.stringify(dataToSave));
      alert("配置已保存到本地存储！");
    } catch (error) {
      alert("保存配置失败。");
    }
  };

  const handleLoadConfig = () => {
    try {
      const configKey = `exam_config_${appConfig.schoolType}`;
      const savedData = localStorage.getItem(configKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.appConfig && parsed.appConfig.schoolType === appConfig.schoolType) {
          setMapping(parsed.mapping);
          setAppConfig(parsed.appConfig);
          alert("配置已加载！");
        } else {
          alert("配置不匹配。");
        }
      } else {
        alert("未找到配置。");
      }
    } catch (error) {
      alert("加载配置失败。");
    }
  };

  const handleProcess = () => {
    if (!mapping.name || !mapping.class) {
        alert("请先完成必要的列映射。");
        return;
    }
    if (appConfig.schoolType === 'senior' && !mapping.subject) {
        alert("请选择选科列。");
        return;
    }
    if (appConfig.seatingRooms.length === 0) {
        alert("请至少添加一个考场！");
        return;
    }
    
    // Simple validation
    if (rawData.some(r => !r[mapping.name])) {
        alert("存在缺失姓名的行，请检查 Excel。");
        return;
    }

    const result = generateExamArrangement(rawData, mapping, appConfig);
    setProcessedData(result);
    setPreviewPage(1); // Reset page on new generation
    
    const classes = getUniqueValues(result, mapping.class);
    if (classes.length > 0) setSelectedClassForExport(classes[0]);
    setStep(3);
  };

  const exportGeneralExcel = () => {
      exportDetailedExcel(processedData, mapping, appConfig.examName, `${appConfig.examName}-考试安排表`, appConfig);
  };

  const exportLabels = () => {
      exportSeatLabels(processedData, mapping, appConfig.examName, `${appConfig.examName}-桌贴`, appConfig);
  };

  // Pagination Logic
  const totalPages = Math.ceil(processedData.length / PREVIEW_PAGE_SIZE);
  const paginatedData = processedData.slice(
      (previewPage - 1) * PREVIEW_PAGE_SIZE,
      previewPage * PREVIEW_PAGE_SIZE
  );
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
       <div className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="text-indigo-600" />
                    考生排座子系统
                </h1>
            </div>
            <button onClick={onBack} className="text-slate-500 hover:text-red-600 flex items-center gap-1 text-sm font-medium">
                <LogOut className="w-4 h-4" /> 返回大厅
            </button>
       </div>

       <div className="flex-grow p-6 flex flex-col items-center">
            {/* Steps Visual */}
            <div className="flex items-center space-x-4 mb-8 text-sm font-medium">
                {[0, 1, 2, 3].map((s) => (
                    <div key={s} className={`flex items-center ${step >= s ? 'text-indigo-600' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mr-2 ${step >= s ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'}`}>
                            {s === 0 ? 'M' : s}
                        </div>
                        <span className="hidden sm:inline">
                            {s === 0 && '模式'}
                            {s === 1 && '导入'}
                            {s === 2 && '设置'}
                            {s === 3 && '结果'}
                        </span>
                        {s < 3 && <div className="w-8 h-px bg-slate-300 mx-2"></div>}
                    </div>
                ))}
            </div>

            <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
                {/* Step 0: Mode Select */}
                {step === 0 && (
                    <div className="flex-grow flex flex-col items-center justify-center p-10 space-y-8">
                        <h2 className="text-2xl font-bold text-slate-800">请选择学校类型</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-2xl">
                            <button 
                                onClick={() => selectMode('senior')}
                                className="group p-8 border-2 border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center"
                            >
                                <GraduationCap className="w-16 h-16 text-slate-400 group-hover:text-indigo-600 mb-4 transition-colors" />
                                <h3 className="text-xl font-bold text-slate-700 group-hover:text-indigo-700">高中模式 (Senior)</h3>
                                <p className="text-center text-slate-500 mt-2 text-sm">
                                    支持选科走班排考<br/>日语特殊考场处理
                                </p>
                            </button>
                            <button 
                                onClick={() => selectMode('junior')}
                                className="group p-8 border-2 border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all flex flex-col items-center"
                            >
                                <School className="w-16 h-16 text-slate-400 group-hover:text-emerald-600 mb-4 transition-colors" />
                                <h3 className="text-xl font-bold text-slate-700 group-hover:text-emerald-700">初中模式 (Junior)</h3>
                                <p className="text-center text-slate-500 mt-2 text-sm">
                                    支持按年级分层排考<br/>行政班级管理
                                </p>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 1: Upload */}
                {step === 1 && (
                    <div className="flex-grow flex flex-col items-center justify-center p-10 text-center">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                            <Upload className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">上传考生名单</h2>
                        <p className="text-slate-500 mb-8 max-w-md">请上传 Excel 文件 (.xlsx, .xls)。文件中应包含姓名、班级、考号等信息。</p>
                        
                        <label className="relative cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5" />
                            <span>选择 Excel 文件</span>
                            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        </label>
                    </div>
                )}

                {/* Step 2: Settings */}
                {step === 2 && (
                    <div className="flex-grow flex flex-col p-0">
                        <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-indigo-900">排考设置</h3>
                                <p className="text-xs text-indigo-600">已加载: {fileName} ({rawData.length} 条记录)</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleLoadConfig} className="text-xs flex items-center gap-1 bg-white px-3 py-1.5 rounded border hover:bg-slate-50 text-indigo-600">
                                    <FolderOpen className="w-3 h-3" /> 读取配置
                                </button>
                                <button onClick={handleSaveConfig} className="text-xs flex items-center gap-1 bg-white px-3 py-1.5 rounded border hover:bg-slate-50 text-indigo-600">
                                    <Save className="w-3 h-3" /> 保存配置
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto p-6 space-y-8">
                            {/* 1. Mapping Section */}
                            <section>
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <LayoutGrid className="w-4 h-4" /> 列名映射 (必填)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">姓名列 <span className="text-red-500">*</span></label>
                                        <select className="w-full border rounded p-2 text-sm" value={mapping.name} onChange={e => setMapping({...mapping, name: e.target.value})}>
                                            <option value="">请选择...</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">班级列 <span className="text-red-500">*</span></label>
                                        <select className="w-full border rounded p-2 text-sm" value={mapping.class} onChange={e => setMapping({...mapping, class: e.target.value})}>
                                            <option value="">请选择...</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">自定义考号/ID列</label>
                                        <select className="w-full border rounded p-2 text-sm" value={mapping.examId} onChange={e => setMapping({...mapping, examId: e.target.value})}>
                                            <option value="">请选择...</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    {appConfig.schoolType === 'senior' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">选科列 <span className="text-red-500">*</span></label>
                                                <select className="w-full border rounded p-2 text-sm" value={mapping.subject} onChange={e => setMapping({...mapping, subject: e.target.value})}>
                                                    <option value="">请选择...</option>
                                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">备注列 (用于识别日语)</label>
                                                <select className="w-full border rounded p-2 text-sm" value={mapping.remarks} onChange={e => setMapping({...mapping, remarks: e.target.value})}>
                                                    <option value="">请选择...</option>
                                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                            </div>
                                        </>
                                    )}
                                    {appConfig.schoolType === 'junior' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">年级列 (可选)</label>
                                            <select className="w-full border rounded p-2 text-sm" value={mapping.grade} onChange={e => setMapping({...mapping, grade: e.target.value})}>
                                                <option value="">请选择...</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <hr className="border-slate-100" />

                            {/* 2. Basic Config (Exam Name only now) */}
                            <section>
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Tag className="w-4 h-4" /> 考试信息
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">考试名称 (显示在表头)</label>
                                        <input type="text" className="w-full border rounded p-2 text-sm" value={appConfig.examName} onChange={e => setAppConfig({...appConfig, examName: e.target.value})} />
                                    </div>
                                    {appConfig.schoolType === 'senior' && (
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-slate-600 mb-1">日语识别关键词</label>
                                                <input type="text" className="w-full border rounded p-2 text-sm" placeholder="例如：日语" value={appConfig.japaneseKeyword} onChange={e => setAppConfig({...appConfig, japaneseKeyword: e.target.value})} />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-slate-600 mb-1">日语目标考场</label>
                                                <select 
                                                    className="w-full border rounded p-2 text-sm" 
                                                    value={appConfig.japaneseTargetRoom} 
                                                    onChange={e => setAppConfig({...appConfig, japaneseTargetRoom: e.target.value})}
                                                >
                                                    <option value="">请选择日语考场...</option>
                                                    {appConfig.seatingRooms.map(r => (
                                                        <option key={r.id} value={r.location}>{r.location} (容量: {r.capacity})</option>
                                                    ))}
                                                </select>
                                                {appConfig.japaneseTargetRoom === "" && appConfig.seatingRooms.length > 0 && (
                                                    <p className="text-xs text-red-400 mt-1">请先在下方添加考场，再选择日语考场</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* 3. Room Management (New!) */}
                            <section>
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <School className="w-4 h-4" /> 考场配置管理 (请按顺序添加)
                                </h4>
                                
                                <div className="mb-4">
                                    {/* Add Single Room */}
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <h5 className="font-bold text-slate-700 text-sm mb-3">添加单个考场</h5>
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1">
                                                <label className="text-xs text-slate-500 block mb-1">考场位置/名称</label>
                                                <input type="text" placeholder="例: 101" className="w-full border rounded p-2 text-sm" value={newRoomLoc} onChange={e => setNewRoomLoc(e.target.value)} />
                                            </div>
                                            <div className="w-24">
                                                <label className="text-xs text-slate-500 block mb-1">容纳人数</label>
                                                <input type="number" className="w-full border rounded p-2 text-sm" value={newRoomCap} onChange={e => setNewRoomCap(e.target.value)} />
                                            </div>
                                            <button onClick={addSingleRoom} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Room List Display */}
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-100 text-slate-600 font-medium">
                                            <tr>
                                                <th className="p-3 w-16 text-center">序号</th>
                                                <th className="p-3">考场位置/名称</th>
                                                <th className="p-3">容纳人数</th>
                                                <th className="p-3 text-right">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {appConfig.seatingRooms.length === 0 ? (
                                                <tr><td colSpan={4} className="p-6 text-center text-slate-400">暂未配置考场，请在上方添加。</td></tr>
                                            ) : (
                                                appConfig.seatingRooms.map((room, idx) => (
                                                    <tr key={room.id} className="hover:bg-slate-50">
                                                        <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                                                        <td className="p-3 font-bold text-slate-700">{room.location}</td>
                                                        <td className="p-3">{room.capacity} 人</td>
                                                        <td className="p-3 text-right">
                                                            <button onClick={() => deleteRoom(room.id)} className="text-red-400 hover:text-red-600">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                    {appConfig.seatingRooms.length > 0 && (
                                        <div className="bg-slate-50 p-2 text-xs text-right text-slate-500">
                                            总容纳人数: <span className="font-bold text-indigo-600">{appConfig.seatingRooms.reduce((sum, r) => sum + r.capacity, 0)}</span> 人
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* 4. Subject Order (Senior Only) */}
                            {appConfig.schoolType === 'senior' && appConfig.subjectOrder.length > 0 && (
                                <section>
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4" /> 学科排序与换场策略
                                    </h4>
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                                        {appConfig.subjectOrder.map((subj, idx) => (
                                            <div key={subj.name} className="flex items-center justify-between bg-white p-2 rounded shadow-sm border border-slate-200">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 font-mono">{idx + 1}</span>
                                                    <span className="font-medium text-slate-700">{subj.name}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={subj.forceNewRoom} 
                                                            onChange={() => toggleSubjectForceRoom(idx)}
                                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <span>强制换新考场</span>
                                                    </label>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => moveSubject(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30">
                                                            <ArrowUp className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => moveSubject(idx, 'down')} disabled={idx === appConfig.subjectOrder.length - 1} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30">
                                                            <ArrowDown className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="p-6 border-t bg-slate-50 flex justify-between">
                            <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 font-medium">上一步</button>
                            <button onClick={handleProcess} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" /> 开始自动排座
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Result */}
                {step === 3 && (
                     <div className="flex-grow flex flex-col p-0">
                         <div className="bg-emerald-50 px-6 py-6 border-b border-emerald-100 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-emerald-100 p-3 rounded-full">
                                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-emerald-900">排座完成!</h2>
                                    <p className="text-emerald-700 text-sm">
                                        共处理 {processedData.length} 名考生，
                                        分配了 {new Set(processedData.map(s => s._roomNumber)).size} 个考场。
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setStep(2)} className="bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4" /> 返回设置
                            </button>
                         </div>
                         
                         <div className="flex-grow overflow-y-auto p-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <button onClick={exportGeneralExcel} className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex items-center gap-4 group text-left">
                                    <div className="bg-indigo-50 p-4 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                        <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">导出详细安排表</h3>
                                        <p className="text-sm text-slate-500">Excel 格式，包含考场、座位号、备注等所有信息。</p>
                                    </div>
                                </button>
                                
                                <button onClick={exportLabels} className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex items-center gap-4 group text-left">
                                    <div className="bg-emerald-50 p-4 rounded-lg group-hover:bg-emerald-100 transition-colors">
                                        <Tag className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">导出桌贴/门贴</h3>
                                        <p className="text-sm text-slate-500">双栏排版，适配 A4 打印，按考场分页。</p>
                                    </div>
                                </button>
                             </div>

                             {/* Class Export Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                                <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Users className="w-5 h-5 text-orange-500" />
                                            班级分发列表
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            筛选特定班级考生名单，用于分发给各班班主任或张贴。
                                        </p>
                                    </div>
                                    
                                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                        {/* Batch Export All */}
                                        <button 
                                            onClick={() => {
                                                exportAllClassesExcel(
                                                    processedData, 
                                                    mapping, 
                                                    appConfig.examName, 
                                                    `${appConfig.examName}-全校班级分发列表`,
                                                    appConfig
                                                );
                                            }}
                                            className="bg-white border border-orange-200 hover:bg-orange-50 text-orange-600 px-4 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap justify-center"
                                        >
                                            <FileSpreadsheet className="w-4 h-4" /> 批量导出所有班级
                                        </button>

                                        {/* Single Class Export */}
                                        <div className="flex gap-2">
                                            <select 
                                                className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-grow md:w-48 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                value={selectedClassForExport}
                                                onChange={e => setSelectedClassForExport(e.target.value)}
                                            >
                                                {getUniqueValues(processedData, mapping.class).map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                            <button 
                                                onClick={() => {
                                                    if(!selectedClassForExport) return;
                                                    exportClassExcel(
                                                        processedData, 
                                                        mapping, 
                                                        selectedClassForExport, 
                                                        appConfig.examName, 
                                                        `${appConfig.examName}-${selectedClassForExport}-名单`,
                                                        appConfig
                                                    );
                                                }}
                                                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
                                            >
                                                <Download className="w-4 h-4" /> 导出单班
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                             <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                 <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                                     <h3 className="font-bold text-slate-700">数据预览</h3>
                                     <div className="flex gap-3">
                                         <button 
                                            onClick={() => setStep(2)} 
                                            className="text-sm text-slate-600 hover:text-indigo-600 font-medium px-3 py-1 border border-transparent hover:border-slate-300 rounded transition-all"
                                         >
                                            返回设置
                                         </button>
                                         <button onClick={() => setStep(0)} className="text-sm text-slate-500 hover:text-red-600 font-medium px-2">
                                            重新开始
                                         </button>
                                     </div>
                                 </div>
                                 <div className="overflow-x-auto">
                                     <table className="w-full text-sm text-left">
                                         <thead className="bg-slate-50 text-slate-500 font-medium">
                                             <tr>
                                                 <th className="p-3">姓名</th>
                                                 <th className="p-3">班级</th>
                                                 <th className="p-3">考室</th>
                                                 <th className="p-3">座位</th>
                                                 {appConfig.schoolType === 'senior' && <th className="p-3">选科</th>}
                                                 {appConfig.schoolType === 'senior' && <th className="p-3">备注</th>}
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-slate-100">
                                             {paginatedData.map((row, i) => (
                                                 <tr key={i} className="hover:bg-slate-50">
                                                     <td className="p-3 font-medium text-slate-800">{row[mapping.name]}</td>
                                                     <td className="p-3 text-slate-600">{row[mapping.class]}</td>
                                                     <td className="p-3 text-indigo-600 font-bold">{row._roomNumber} <span className="text-xs font-normal text-slate-400">({row._roomLocation})</span></td>
                                                     <td className="p-3 font-mono">{row._seatNumber}</td>
                                                     {appConfig.schoolType === 'senior' && <td className="p-3 text-slate-600">{row[mapping.subject]}</td>}
                                                     {appConfig.schoolType === 'senior' && <td className="p-3 text-xs text-slate-500">{row._formattedRemarks}</td>}
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                     
                                     {/* Pagination Controls */}
                                     {totalPages > 1 && (
                                         <div className="flex justify-between items-center p-4 border-t bg-slate-50">
                                             <span className="text-xs text-slate-500">
                                                 显示 {((previewPage - 1) * PREVIEW_PAGE_SIZE) + 1} - {Math.min(previewPage * PREVIEW_PAGE_SIZE, processedData.length)} 条，共 {processedData.length} 条
                                             </span>
                                             <div className="flex items-center gap-2">
                                                 <button
                                                     onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                                                     disabled={previewPage === 1}
                                                     className="p-1.5 border bg-white rounded hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                                                 >
                                                     <ChevronLeft className="w-4 h-4" />
                                                 </button>
                                                 <span className="text-xs text-slate-600 font-medium px-2">
                                                     第 {previewPage} / {totalPages} 页
                                                 </span>
                                                 <button
                                                     onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))}
                                                     disabled={previewPage === totalPages}
                                                     className="p-1.5 border bg-white rounded hover:bg-slate-100 disabled:opacity-50 text-slate-600"
                                                 >
                                                     <ChevronRight className="w-4 h-4" />
                                                 </button>
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             </div>
                         </div>
                     </div>
                )}
            </div>
       </div>
    </div>
  );
}

export default SeatingSystem;
