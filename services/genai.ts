
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
    
    // Special instruction for male facial preservation
    const facialFidelityInstruction = gender === 'male' 
      ? "STRICTLY preserve the original face. The facial features, structure, and identity of the man in the input photo must remain UNCHANGED and IDENTICAL. Do not beautify, refine, or alter his face in any way."
      : "Preserve the facial features and identity of the person in the reference image while applying the style.";

    // Construct a concise and strong prompt
    const prompt = `Generate a photorealistic portrait of a ${gender} based on the input image.
    Target Style: ${stylePromptSuffix}.
    
    Strict Requirements:
    1. ${facialFidelityInstruction}
    2. High resolution, professional photography quality.
    3. Maintain aspect ratio 3:4.
    4. Ensure the lighting and environment match the target style while keeping the person recognizable.`;

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
