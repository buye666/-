import { GoogleGenAI, Type } from "@google/genai";
import { Exam, Teacher } from "../types";

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Initialize Google GenAI client
// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseExamsFromText = async (text: string): Promise<Exam[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `请从以下文本中提取考试安排：\n${text}`,
      config: {
        systemInstruction: '你是一个数据提取助手。请从用户的文本中提取考试信息。如果缺少年份，默认为当年。',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            exams: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING, description: "考试科目" },
                  date: { type: Type.STRING, description: "YYYY-MM-DD" },
                  startTime: { type: Type.STRING, description: "HH:mm" },
                  endTime: { type: Type.STRING, description: "HH:mm" },
                  durationMinutes: { type: Type.NUMBER, description: "考试时长(分钟)" },
                },
                required: ["subject", "date", "startTime", "endTime", "durationMinutes"],
              },
            },
          },
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    if (!result.exams || !Array.isArray(result.exams)) {
      console.warn("Unexpected JSON structure:", result);
      return [];
    }

    return result.exams.map((item: any) => ({
      ...item,
      id: generateId(),
    }));
  } catch (error) {
    console.error("解析考试信息失败:", error);
    alert("AI 解析失败，请检查网络或配置。");
    return [];
  }
};

export const parseTeachersFromText = async (text: string): Promise<Teacher[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `请从以下文本中提取教师名单：\n${text}`,
      config: {
        systemInstruction: '你是一个数据提取助手。请从用户的文本中提取教师名单。如果文本中未提及学科，请将学科留空。',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            teachers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "教师姓名" },
                  subject: { type: Type.STRING, description: "教学科目" },
                },
                required: ["name"],
              },
            },
          },
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    if (!result.teachers || !Array.isArray(result.teachers)) {
      console.warn("Unexpected JSON structure:", result);
      return [];
    }

    return result.teachers.map((p: any) => ({
      id: generateId(),
      name: p.name,
      subject: p.subject || '',
      totalMinutesAssigned: 0,
    }));
  } catch (error) {
    console.error("解析教师信息失败:", error);
    alert("AI 解析失败，请检查网络或配置。");
    return [];
  }
};
