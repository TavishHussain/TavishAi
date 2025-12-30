
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIResponse = async (
  prompt: string, 
  history: Message[], 
  userName: string,
  image?: string
) => {
  const firstName = userName.split(' ')[0] || 'User';
  
  try {
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const currentParts: any[] = [{ text: prompt }];
    
    if (image) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        currentParts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        });
      }
    }

    contents.push({ role: 'user', parts: currentParts });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: `You are TAVISH AI, a world-class premium digital assistant. You were created and developed by Tavish Hussain. If anyone asks who created you, who developed you, or who is behind this project, you must clearly state that you were created by Tavish Hussain. You are refined, intelligent, and highly cultured. Always address the user as ${firstName}. Provide professional, accurate, and sophisticated responses.`,
        temperature: 0.6,
      }
    });

    return response.text || "I apologize, but I am unable to process your query at this time.";
  } catch (error) {
    console.error("Tavish Engine Error:", error);
    return `I apologize, ${firstName}, but I encountered a disruption in my processing layers. Please try rephrasing your request.`;
  }
};
