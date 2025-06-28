import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateCode = async (
    fileName: string, 
    fileContent: string, 
    instructions: string, 
    line: number,
    onChunk: (chunk: string) => void
) => {
    const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: `The file name is ${fileName}`
                    },
                    {
                        text: `Here is the file content:\n${fileContent}.`
                    },
                    {
                        text: `Additional instructions:\n${instructions}.`
                    },
                    {
                        text: `The code to insert should be syntactically correct and should not cause any errors when inserted at line ${line}.`
                    }
                ]
            },
        ],
        config: {
            systemInstruction: "You are an expert coding assistant who reads from an existing code file and suggests code to add. You are given the code file content. You may be given additional instructions to follow strictly while generating code. Generate correct, readable, efficient code that follows best practices. Only return the code — no explanation. When you generate code, ensure it is syntactically correct and can be inserted at the specified line without causing errors. If you are unsure about the code, ask for clarification. Don't include extra backticks or formatting in your response.",
        },
    });

    for await (const chunk of stream) {
    onChunk(chunk.text || "");
  }
    // for await (const chunk of response) {
    //     return chunk.text;
    // }
    // return response.text;
};
