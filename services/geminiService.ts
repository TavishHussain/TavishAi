import { Message } from "../types";

const API_KEY = import.meta.env.VITE_API_KEY;

export const getAIResponse = async (
  prompt: string,
  history: Message[],
  userName: string,
  image?: string
) => {
  const firstName = userName.split(" ")[0] || "User";

  const contents: any[] = [
    {
      role: "user",
      parts: [
        {
          text: `You are TAVISH AI, a premium digital assistant created by Tavish Hussain. Always address the user as ${firstName}.`
        }
      ]
    },
    ...history.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    })),
    {
      role: "user",
      parts: [{ text: prompt }]
    }
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 512
        }
      })
    }
  );

  const data = await res.json();

  console.log("Gemini raw response:", data);

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    `Sorry ${firstName}, I could not generate a response.`
  );
};
