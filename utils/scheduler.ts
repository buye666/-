
import { Exam, Teacher, Constraints, ScheduleResult, ScheduleEntry, InvigilationMode, Room } from "../types";

// Helper to check if two time ranges overlap
const isOverlapping = (startA: Date, endA: Date, startB: Date, endB: Date) => {
  return startA < endB && startB < endA;
};

const getExamDateTimes = (exam: Exam) => {
  const start = new Date(`${exam.date}T${exam.startTime}`);
  const end = new Date(`${exam.date}T${exam.endTime}`);
  return { start, end };
};

const normalizeStr = (str: string) => str ? str.trim().replace(/\s+/g, '').toLowerCase() : '';

export const generateSchedule = (
  exams: Exam[],
  rooms: Room[],
  teachers: Teacher[],
  constraints: Constraints,
  mode: InvigilationMode
): ScheduleResult => {
  // 1. Reset teacher stats for calculation
  const workingTeachers = teachers.map(t => ({ ...t, totalMinutesAssigned: 0 }));
  const schedule: ScheduleEntry[] = [];
  const unassignedTasks: { examId: string, roomId: string }[] = [];
  const hallwayAssignments: { [examId: string]: string } = {};
  const unassignedHallway: string[] = [];

  // 2. Sort exams by time
  const sortedExams = [...exams].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.startTime}`).getTime();
    const dateB = new Date(`${b.date}T${b.startTime}`).getTime();
    return dateA - dateB;
  });

  // 3. Assign Hallway Proctors FIRST (One per Exam ID)
  // Requirement: Hallway proctor preferrably teaches the subject, otherwise ANY teacher.
  for (const exam of sortedExams) {
      const { start: examStart, end: examEnd } = getExamDateTimes(exam);
      const unavailableTeacherIds = constraints[exam.id] || [];
      const examSubject = normalizeStr(exam.subject);

      // Define availability check
      const isTeacherAvailable = (t: Teacher) => {
          if (unavailableTeacherIds.includes(t.id)) return false;

          // Check overlap with any previous hallway assignment
          for (const [otherExamId, assignedTeacherId] of Object.entries(hallwayAssignments)) {
              if (assignedTeacherId === t.id) {
                  const otherExam = exams.find(e => e.id === otherExamId);
                  if (otherExam) {
                      const { start: oStart, end: oEnd } = getExamDateTimes(otherExam);
                      if (isOverlapping(examStart, examEnd, oStart, oEnd)) return false;
                  }
              }
          }
          return true;
      };

      // Strategy 1: Find subject-specific teachers
      const subjectTeachers = workingTeachers.filter(t => {
          const tSubject = normalizeStr(t.subject);
          return tSubject === examSubject || (tSubject && examSubject && (tSubject.includes(examSubject) || examSubject.includes(tSubject)));
      });

      // Try to find an available subject teacher
      let candidates = subjectTeachers.filter(isTeacherAvailable);

      // Strategy 2: If no subject teacher is available (none exist or all busy), try ANY available teacher
      if (candidates.length === 0) {
          candidates = workingTeachers.filter(isTeacherAvailable);
      }

      // Sort by load (balance workload)
      candidates.sort((a, b) => {
        if (a.totalMinutesAssigned === b.totalMinutesAssigned) {
            return Math.random() - 0.5;
        }
        return a.totalMinutesAssigned - b.totalMinutesAssigned;
      });

      if (candidates.length > 0) {
          const selected = candidates[0];
          hallwayAssignments[exam.id] = selected.id;
          selected.totalMinutesAssigned += exam.durationMinutes;
      } else {
          unassignedHallway.push(exam.id);
      }
  }

  // 4. Assign Room Proctors
  // Flatten exams into tasks (Exam + Room)
  const tasks: { exam: Exam, roomId: string }[] = [];
  
  for (const exam of sortedExams) {
    const examRoomIds = exam.roomIds && exam.roomIds.length > 0 ? exam.roomIds : [];
    for (const roomId of examRoomIds) {
      tasks.push({ exam, roomId });
    }
  }

  const requiredProctors = mode === InvigilationMode.DOUBLE ? 2 : 1;

  for (const task of tasks) {
    const { exam, roomId } = task;
    const { start: examStart, end: examEnd } = getExamDateTimes(exam);
    const unavailableTeacherIds = constraints[exam.id] || [];

    const availableCandidates = workingTeachers.filter(t => {
      // 1. Constraint check
      if (unavailableTeacherIds.includes(t.id)) return false;

      // 2. Check if this teacher is the Hallway Proctor for THIS exam or overlapping exams
      for (const [otherExamId, assignedTeacherId] of Object.entries(hallwayAssignments)) {
          if (assignedTeacherId === t.id) {
               const otherExam = exams.find(e => e.id === otherExamId);
               if (otherExam) {
                   const { start: oStart, end: oEnd } = getExamDateTimes(otherExam);
                   // Can't be proctor if they are hallway for any overlapping exam
                   if (isOverlapping(examStart, examEnd, oStart, oEnd) || otherExamId === exam.id) return false;
               }
          }
      }

      // 3. Check overlaps with already assigned room tasks
      const teacherAssignments = schedule.filter(s => s.teacherIds.includes(t.id));
      for (const assignment of teacherAssignments) {
        const assignedExam = exams.find(e => e.id === assignment.examId);
        if (!assignedExam) continue;
        
        const { start: assignedStart, end: assignedEnd } = getExamDateTimes(assignedExam);
        if (isOverlapping(examStart, examEnd, assignedStart, assignedEnd)) {
          return false;
        }
      }

      return true;
    });

    // Sort by load
    availableCandidates.sort((a, b) => {
        if (a.totalMinutesAssigned === b.totalMinutesAssigned) {
            return Math.random() - 0.5;
        }
        return a.totalMinutesAssigned - b.totalMinutesAssigned;
    });

    const selected = availableCandidates.slice(0, requiredProctors);

    if (selected.length < requiredProctors) {
      unassignedTasks.push({ examId: exam.id, roomId });
    }

    if (selected.length > 0) {
      schedule.push({
        examId: exam.id,
        roomId: roomId,
        teacherIds: selected.map(t => t.id)
      });

      selected.forEach(t => {
        t.totalMinutesAssigned += exam.durationMinutes;
      });
    }
  }

  return {
    schedule,
    unassignedTasks,
    hallwayAssignments,
    unassignedHallway,
    teacherStats: workingTeachers
  };
};
