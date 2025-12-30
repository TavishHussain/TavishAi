import { Message } from "../types";

export const getAIResponse = async (
  prompt: string,
  history: Message[],
  userName: string
) => {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      history,
      userName,
    }),
  });

  const data = await res.json();
  return data.text;
};
