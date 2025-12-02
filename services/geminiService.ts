
import { GoogleGenAI, Type } from "@google/genai";
import { Exam, Teacher } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export const parseExamsFromText = async (text: string): Promise<Exam[]> => {
  if (!apiKey) throw new Error("API Key is missing");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `从以下文本中提取考试信息。请返回一个 JSON 数组。
      日期格式必须是 YYYY-MM-DD。
      开始和结束时间格式必须是 HH:mm (24小时制)。
      请计算 durationMinutes (持续分钟数)。
      
      文本内容: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING, description: "考试科目名称" },
              date: { type: Type.STRING, description: "YYYY-MM-DD 格式的日期" },
              startTime: { type: Type.STRING, description: "HH:mm 格式的开始时间" },
              endTime: { type: Type.STRING, description: "HH:mm 格式的结束时间" },
              durationMinutes: { type: Type.NUMBER, description: "考试时长(分钟)" },
            },
            required: ["subject", "date", "startTime", "endTime", "durationMinutes"],
          },
        },
      },
    });

    const rawData = JSON.parse(response.text || "[]");
    return rawData.map((item: any) => ({
      ...item,
      id: generateId(),
    }));
  } catch (error) {
    console.error("Error parsing exams:", error);
    throw new Error("AI 解析考试信息失败");
  }
};

export const parseTeachersFromText = async (text: string): Promise<Teacher[]> => {
  if (!apiKey) throw new Error("API Key is missing");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `从以下文本中提取教师姓名和他们任教的学科。请返回一个 JSON 数组。
      如果文本中没有明确提到学科，请尝试根据上下文推断，或者留空字符串。
      
      文本内容: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "教师姓名" },
              subject: { type: Type.STRING, description: "任教学科 (例如: 语文, 数学)" }
            },
            required: ["name"]
          },
        },
      },
    });

    const parsed: { name: string, subject?: string }[] = JSON.parse(response.text || "[]");
    return parsed.map(p => ({
      id: generateId(),
      name: p.name,
      subject: p.subject || '',
      totalMinutesAssigned: 0
    }));
  } catch (error) {
    console.error("Error parsing teachers:", error);
    throw new Error("AI 解析教师信息失败");
  }
};
