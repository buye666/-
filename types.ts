
export enum InvigilationMode {
  SINGLE = 'SINGLE',
  DOUBLE = 'DOUBLE'
}

export interface Room {
  id: string;
  name: string; // e.g., "401"
  studentCount: number; // e.g., 40
}

export interface Exam {
  id: string;
  subject: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  roomIds: string[]; // List of room IDs this exam takes place in
}

export interface Teacher {
  id: string;
  name: string;
  subject: string; // New field for Hallway proctor logic
  totalMinutesAssigned: number;
}

// Map of ExamID -> Set of TeacherIDs who CANNOT attend that exam
export interface Constraints {
  [examId: string]: string[]; 
}

export interface ScheduleEntry {
  examId: string;
  roomId: string;
  teacherIds: string[];
}

export interface ScheduleResult {
  schedule: ScheduleEntry[];
  unassignedTasks: { examId: string, roomId: string }[];
  // examId -> teacherId for hallway
  hallwayAssignments: { [examId: string]: string };
  unassignedHallway: string[];
  teacherStats: Teacher[];
}
