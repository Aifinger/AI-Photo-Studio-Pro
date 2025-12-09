import { GoogleGenAI } from "@google/genai";
import { Gender } from "../types";

// Using the nano banana model as requested (mapped to gemini-2.5-flash-image)
const MODEL_NAME = 'gemini-2.5-flash-image';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateStyledImage(
  base64Image: string,
  gender: Gender,
  stylePromptSuffix: string
): Promise<string> {
  try {
    // Dynamically extract mimeType and base64 data
    const match = base64Image.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const cleanBase64 = match ? match[2] : base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Construct a concise and strong prompt
    const prompt = `Generate a photorealistic portrait of a ${gender} based on the input image.
    Target Style: ${stylePromptSuffix}.
    
    Strict Requirements:
    1. Preserve facial features of the reference person.
    2. High resolution, professional photography.
    3. Aspect ratio 3:4.
    4. Ensure the image is aesthetically pleasing and high quality.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
            {
                inlineData: {
                    mimeType: mimeType,
                    data: cleanBase64
                }
            },
            {
                text: prompt
            }
        ]
      },
      // Fix: Add imageConfig to enforce 3:4 aspect ratio as requested in prompt
      config: {
          imageConfig: {
              aspectRatio: "3:4"
          }
      }
    });

    // Extract image from response
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
        const parts = candidates[0].content.parts;
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
        }
    }

    throw new Error("No image data found in response");
    
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}