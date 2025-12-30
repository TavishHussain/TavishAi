import { Message } from "../types";

const API_KEY = import.meta.env.VITE_API_KEY;

export const getAIResponse = async (
  prompt: string,
  history: Message[],
  userName: string
) => {
  const firstName = userName.split(" ")[0] || "User";

  const contents = [
    {
      role: "user",
      parts: [
        {
          text: `You are TAVISH AI, created by Tavish Hussain. Always address the user as ${firstName}.`
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${API_KEY}`,
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

  if (data.error) {
    return `API Error: ${data.error.message}`;
  }

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    `Sorry ${firstName}, I could not generate a response.`
  );
};
