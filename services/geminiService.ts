import { Message } from "../types";

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_API_KEY missing");
}

export const getAIResponse = async (
  prompt: string,
  history: Message[],
  userName: string,
  image?: string
) => {
  const firstName = userName.split(" ")[0] || "User";

  const contents = history.map(msg => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.text }]
  }));

  const currentParts: any[] = [{ text: prompt }];

  if (image) {
    const matches = image.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      currentParts.push({
        inlineData: {
          mimeType: matches[1],
          data: matches[2],
        },
      });
    }
  }

  contents.push({ role: "user", parts: currentParts });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [
            {
              text: `You are TAVISH AI, a premium digital assistant created by Tavish Hussain. Always address the user as ${firstName}.`,
            },
          ],
        },
        generationConfig: {
          temperature: 0.6,
        },
      }),
    }
  );

  const data = await res.json();

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    `Sorry ${firstName}, I could not generate a response.`
  );
};
