
import * as XLSX from 'xlsx';
import { ProcessedStudent, AppConfig, SubjectConfig } from './types';

// Fisher-Yates Shuffle
export const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Helper to center align all cells in a worksheet
const setAllCellsCentered = (ws: XLSX.WorkSheet) => {
    if (!ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) continue;
            
            // Ensure style object exists
            if (!ws[cellAddress].s) ws[cellAddress].s = {};
            
            // Set alignment to center
            ws[cellAddress].s.alignment = {
                vertical: 'center',
                horizontal: 'center',
                wrapText: true
            };
        }
    }
};

export const readExcelFile = (file: File): Promise<{ data: any[], headers: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // 1. Get Data
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        // 2. Get Headers reliably (even if data columns are empty)
        const headers: string[] = [];
        if (sheet['!ref']) {
            const range = XLSX.utils.decode_range(sheet['!ref']);
            // Iterate over the first row (R=0) from Start Col to End Col
            const R = range.s.r; 
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = { c: C, r: R };
                const cellRef = XLSX.utils.encode_cell(cellAddress);
                const cell = sheet[cellRef];
                if (cell && cell.v) {
                    headers.push(String(cell.v).trim());
                }
            }
        }

        resolve({ data: jsonData, headers });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const getUniqueValues = (data: any[], key: string): string[] => {
  const values = new Set<string>();
  data.forEach(item => {
    if (item[key]) values.add(String(item[key]).trim());
  });
  return Array.from(values).sort();
};

export const generateExamArrangement = (
  data: any[],
  mapping: Record<string, string>, // key: internalId, value: excelHeader
  config: AppConfig
): ProcessedStudent[] => {
  // 1. Map data to internal structure
  let students: ProcessedStudent[] = data.map((row, index) => ({
    ...row,
    _originalIndex: index,
  }));

  const isSenior = config.schoolType === 'senior';
  let groupedData: Record<string, ProcessedStudent[]> = {};
  let orderToUse: SubjectConfig[] = [];

  if (isSenior) {
      // --- Senior Mode ---
      // 2. Randomize total order first (mixes classes etc.)
      students = shuffleArray(students);
      
      const subjectKey = mapping['subject'];
      
      // 3. Group by Subject
      students.forEach(student => {
        const subject = String(student[subjectKey] || '未分类').trim();
        if (!groupedData[subject]) {
          groupedData[subject] = [];
        }
        groupedData[subject].push(student);
      });

      orderToUse = config.subjectOrder.length > 0 
        ? config.subjectOrder 
        : Object.keys(groupedData).sort().map(s => ({ name: s, forceNewRoom: true }));
  } else {
      // --- Junior Mode ---
      const gradeKey = mapping['grade'];

      if (gradeKey) {
          // If Grade column is selected: Group by Grade FIRST
          students.forEach(student => {
              const grade = String(student[gradeKey] || '未分类').trim();
              if (!groupedData[grade]) {
                  groupedData[grade] = [];
              }
              groupedData[grade].push(student);
          });

          // Shuffle INSIDE each grade group (Keep grades separate)
          Object.keys(groupedData).forEach(grade => {
              groupedData[grade] = shuffleArray(groupedData[grade]);
          });

          // Sort Grades (e.g. 2022级, 2023级 or 7, 8, 9)
          const sortedGrades = Object.keys(groupedData).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
          
          // Treat each grade as a "Subject" that forces a new room
          orderToUse = sortedGrades.map(g => ({ name: g, forceNewRoom: true }));

      } else {
          // No Grade column: Shuffle everyone together
          students = shuffleArray(students);
          groupedData['全科'] = students;
          orderToUse = [{ name: '全科', forceNewRoom: false }];
      }
  }

  // 4. Assign Rooms
  // We now strictly use config.seatingRooms list
  const rooms = config.seatingRooms || [];
  let currentRoomIndex = 0;
  let currentSeatInRoom = 0;
  
  const finalArrangement: ProcessedStudent[] = [];
  const japaneseStudents: ProcessedStudent[] = []; 
  // Track IDs of students already added to Japanese list to prevent duplicates if they appear in multiple subjects
  const processedJapaneseIds = new Set<string>();

  const remarksKey = mapping['remarks']; 

  // Helper to get current room info
  const getCurrentRoom = () => {
    if (currentRoomIndex < rooms.length) {
        return rooms[currentRoomIndex];
    }
    // Overflow room
    return {
        id: `overflow-${currentRoomIndex}`,
        location: `备用考场${currentRoomIndex + 1}`,
        capacity: 30 // Default for overflow
    };
  };

  // Pre-calculate Japanese target room index (Sequence)
  let japaneseRoomIndex = -1;
  if (isSenior && config.japaneseTargetRoom) {
      japaneseRoomIndex = rooms.findIndex(r => r.location.trim() === config.japaneseTargetRoom.trim());
  }

  orderToUse.forEach((subjConfig) => {
    const studentsInSubject = groupedData[subjConfig.name];
    if (!studentsInSubject || studentsInSubject.length === 0) return;

    // Force New Room Logic
    if (subjConfig.forceNewRoom && currentSeatInRoom > 0) {
        currentRoomIndex++;
        currentSeatInRoom = 0;
    }

    studentsInSubject.forEach(student => {
        let room = getCurrentRoom();
        
        // Check if room is full
        if (currentSeatInRoom >= room.capacity) {
            currentRoomIndex++;
            currentSeatInRoom = 0;
            room = getCurrentRoom();
        }

        // --- Japanese Logic (Senior Only) ---
        let generatedRemark = "";
        let isJapanese = false;

        if (isSenior) {
            const originalRemark = remarksKey && student[remarksKey] ? String(student[remarksKey]) : "";
            if (originalRemark) generatedRemark = originalRemark;
            
            if (config.japaneseKeyword && config.japaneseTargetRoom) {
                 if (originalRemark.includes(config.japaneseKeyword)) {
                     isJapanese = true;
                     if (japaneseRoomIndex !== -1) {
                        generatedRemark = `考日语去${japaneseRoomIndex + 1}号考场`;
                     } else {
                        // Fallback only if index not found
                        const targetRoomName = config.japaneseTargetRoom;
                        const suffix = /^\d+$/.test(targetRoomName) ? '号考场' : '';
                        generatedRemark = `考日语去${targetRoomName}${suffix}`;
                     }
                 }
            }
        }

        student._roomNumber = currentRoomIndex + 1;
        student._roomLocation = room.location;
        student._seatNumber = currentSeatInRoom + 1;
        student._formattedRemarks = generatedRemark;
        
        finalArrangement.push(student);
        
        if (isJapanese) {
            // Deduplication Check
            const uniqueKey = student[mapping.examId] || student[mapping.name] || student._originalIndex;
            
            if (!processedJapaneseIds.has(uniqueKey)) {
                processedJapaneseIds.add(uniqueKey);
                
                const japStudent = { ...student };
                // Capture the main seating position for sorting in the Japanese room
                japStudent._originalRoom = currentRoomIndex + 1;
                japStudent._originalSeat = currentSeatInRoom + 1;
                japaneseStudents.push(japStudent);
            }
        }

        currentSeatInRoom++;
    });
  });

  // 5. Japanese Room Entries
  if (isSenior && japaneseStudents.length > 0 && config.japaneseTargetRoom) {
      // Use found index or fallback to 999
      let targetRoomNum = japaneseRoomIndex >= 0 ? japaneseRoomIndex + 1 : 999;
      let targetRoomLoc = japaneseRoomIndex >= 0 ? rooms[japaneseRoomIndex].location : config.japaneseTargetRoom;
      
      // Sort japanese students by original position (Previous Room Order)
      japaneseStudents.sort((a, b) => {
          if ((a._originalRoom || 0) !== (b._originalRoom || 0)) {
              return (a._originalRoom || 0) - (b._originalRoom || 0);
          }
          return (a._originalSeat || 0) - (b._originalSeat || 0);
      });

      japaneseStudents.forEach((s, idx) => {
          s._roomNumber = targetRoomNum;
          s._roomLocation = targetRoomLoc;
          s._seatNumber = idx + 1;
          s._formattedRemarks = "仅在这里考日语"; 
          finalArrangement.push(s);
      });
  }

  return finalArrangement;
};

// Advanced Export matching the screenshots
export const exportDetailedExcel = (
    data: ProcessedStudent[], 
    mapping: Record<string, string>,
    title: string,
    fileName: string,
    config: AppConfig
) => {
    const isSenior = config.schoolType === 'senior';

    // Columns: 序号 | 自定义考号 | 姓名 | 班级 | (选科) | 考室 | 考室位置 | 座位号 | (备注)
    let headers = ["序号", "自定义考号", "姓名", "班级"];
    if (isSenior) headers.push("选科");
    headers.push("考室", "考室位置", "座位号");
    if (isSenior) headers.push("备注");
    
    const sortedData = [...data].sort((a, b) => {
        if ((a._roomNumber || 0) !== (b._roomNumber || 0)) return (a._roomNumber || 0) - (b._roomNumber || 0);
        return (a._seatNumber || 0) - (b._seatNumber || 0);
    });

    const rows = sortedData.map((s, index) => {
        const row = [
            index + 1,
            s[mapping.examId] || s[mapping.id] || "",
            s[mapping.name] || "",
            s[mapping.class] || ""
        ];
        if (isSenior) row.push(s[mapping.subject] || "");
        
        row.push(
            s._roomNumber,
            s._roomLocation,
            s._seatNumber
        );

        if (isSenior) row.push(s._formattedRemarks || "");
        return row;
    });

    const wsData = [
        [title], 
        headers, 
        ...rows  
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Apply Center Alignment
    setAllCellsCentered(ws);

    const totalCols = headers.length;
    if(!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });

    const wscols = [
        { wch: 6 },  // 序号
        { wch: 15 }, // 考号
        { wch: 10 }, // 姓名
        { wch: 12 }, // 班级
    ];
    if (isSenior) wscols.push({ wch: 15 }); // 选科
    wscols.push({ wch: 8 });  // 考室
    wscols.push({ wch: 10 }); // 位置
    wscols.push({ wch: 8 });  // 座位
    if (isSenior) wscols.push({ wch: 25 }); // 备注

    ws['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, "考试安排");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// Export Seat Labels
export const exportSeatLabels = (
    data: ProcessedStudent[],
    mapping: Record<string, string>,
    examName: string,
    fileName: string,
    config: AppConfig
) => {
    const rooms: Record<number, ProcessedStudent[]> = {};
    data.forEach(s => {
        const r = s._roomNumber || 0;
        if (!rooms[r]) rooms[r] = [];
        rooms[r].push(s);
    });

    const sortedRooms = Object.keys(rooms).map(Number).sort((a, b) => a - b);
    
    const wsData: any[][] = [];
    const merges: any[] = [];
    let currentRow = 0;

    sortedRooms.forEach(roomNum => {
        const students = rooms[roomNum];
        students.sort((a, b) => (a._seatNumber || 0) - (b._seatNumber || 0));

        const location = students[0]?._roomLocation || "";
        
        const roomTitle = `${examName} 第${roomNum}考室 (${location})`;
        wsData.push([roomTitle, "", "", "", "", "", "", "", ""]);
        
        merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 8 } });
        currentRow++;

        const headers = ["座位号", "考号", "姓名", "班级", "", "座位号", "考号", "姓名", "班级"];
        wsData.push(headers);
        currentRow++;

        const half = Math.ceil(students.length / 2);
        const leftCol = students.slice(0, half);
        const rightCol = students.slice(half);

        for (let i = 0; i < half; i++) {
            const left = leftCol[i];
            const right = rightCol[i]; 

            const rowData = [
                left?._seatNumber || "",
                left?.[mapping.examId] || left?.[mapping.id] || "",
                left?.[mapping.name] || "",
                left?.[mapping.class] || "",
                "", // Gap
                right?._seatNumber || "",
                right?.[mapping.examId] || right?.[mapping.id] || "",
                right?.[mapping.name] || "",
                right?.[mapping.class] || ""
            ];
            wsData.push(rowData);
            currentRow++;
        }
        wsData.push([]);
        currentRow++;
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Custom styles for Seat Labels
    if (ws['!ref']) {
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        // 1. Set Row Heights to 29pt
        const rowProps = [];
        for(let i=range.s.r; i<=range.e.r; ++i) {
            rowProps.push({ hpt: 29 });
        }
        ws['!rows'] = rowProps;

        // 2. Set Cell Styles: Center, SimSun (宋体), Size 20
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellAddress]) continue;
                
                if (!ws[cellAddress].s) ws[cellAddress].s = {};
                
                ws[cellAddress].s.alignment = {
                    vertical: 'center',
                    horizontal: 'center',
                    wrapText: true
                };
                
                ws[cellAddress].s.font = {
                    name: '宋体',
                    sz: 20
                };
            }
        }
    }

    ws['!merges'] = merges;
    ws['!cols'] = [
        { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 2 },
        { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, "考场座签");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// Helper for generating class data sheet
const prepareClassSheetData = (data: ProcessedStudent[], mapping: Record<string, string>, className: string, examName: string, config: AppConfig) => {
    const classData = data.filter(s => String(s[mapping.class]).trim() === className);
    // Sort by Room then Seat Number
    classData.sort((a, b) => {
        if ((a._roomNumber || 0) !== (b._roomNumber || 0)) return (a._roomNumber || 0) - (b._roomNumber || 0);
        return (a._seatNumber || 0) - (b._seatNumber || 0);
    });

    const isSenior = config.schoolType === 'senior';

    let headers = ["序号", "姓名", "考号"];
    if (isSenior) {
        headers.push("科目");
    }
    headers.push("考室", "考室位置", "座位号", "备注");

    const rows = classData.map((s, index) => {
        const row = [
            index + 1,
            s[mapping.name] || "",
            s[mapping.examId] || "",
        ];

        if (isSenior) {
            row.push(s[mapping.subject] || "");
        }

        row.push(
            s._roomNumber,
            s._roomLocation || "", // Add location
            s._seatNumber,
            s._formattedRemarks || ""
        );
        return row;
    });

    const wsData = [
        [`${examName} - ${className} 考生名单`],
        headers,
        ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Apply Center Alignment
    setAllCellsCentered(ws);

    const totalCols = headers.length;
    if(!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });
    
    // Adjust column widths
    const wscols = [
        { wch: 6 }, // Idx
        { wch: 10 }, // Name
        { wch: 15 }, // ID
    ];
    if (isSenior) wscols.push({ wch: 15 }); // Subject
    wscols.push({ wch: 8 }); // Room Num
    wscols.push({ wch: 12 }); // Room Loc
    wscols.push({ wch: 8 }); // Seat
    wscols.push({ wch: 20 }); // Remarks

    ws['!cols'] = wscols;

    return ws;
};

// Export Single Class List
export const exportClassExcel = (
    data: ProcessedStudent[],
    mapping: Record<string, string>,
    className: string,
    examName: string,
    fileName: string,
    config: AppConfig
) => {
    const ws = prepareClassSheetData(data, mapping, className, examName, config);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, className);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// Export All Classes List (Batch)
export const exportAllClassesExcel = (
    data: ProcessedStudent[],
    mapping: Record<string, string>,
    examName: string,
    fileName: string,
    config: AppConfig
) => {
    const classes = getUniqueValues(data, mapping.class);
    const workbook = XLSX.utils.book_new();

    classes.forEach(cls => {
        const ws = prepareClassSheetData(data, mapping, cls, examName, config);
        XLSX.utils.book_append_sheet(workbook, ws, cls);
    });

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
