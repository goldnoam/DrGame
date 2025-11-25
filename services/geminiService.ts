import { GoogleGenAI, Type } from "@google/genai";
import { GameControl, GameGenerationResponse } from '../types';

const getApiKey = () => {
  // Defensive check for process to avoid ReferenceError in browser
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  // If undefined or empty, return empty string which will be caught later
  return '';
};

export const generateGameCode = async (prompt: string, genre: string): Promise<GameGenerationResponse> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API_KEY_MISSING');
    }

    const ai = new GoogleGenAI({ apiKey });

    const fullPrompt = `
      You are an expert game developer known as "Dr. Game". 
      Your task is to create a complete, playable, single-file HTML5 game based on the user's description.
      
      Genre: ${genre}
      User Description: "${prompt}"
      
      Requirements:
      1.  Output MUST be a valid HTML string containing all necessary CSS (in <style>) and JavaScript (in <script>).
      2.  Do NOT use external CSS or JS files unless they are common CDNs (like Tailwind via CDN or a specific library if requested). Prefer vanilla JS and Canvas API for performance and simplicity.
      3.  The game must be fully playable with keyboard or mouse controls as appropriate.
      4.  Style the game to look polished and modern. If no specific theme is requested, use a dark, neon, or retro arcade aesthetic.
      5.  Include a "Restart" button within the game UI logic if the game ends.
      6.  IMPLEMENT A PAUSE FEATURE:
          - Allow pausing/resuming via the 'P' key.
          - Include a visible "Pause" button in the game UI (top corner).
          - Show a semi-transparent overlay with text "PAUSED" when the game is paused.
          - The game loop (requestAnimationFrame) must stop updates or skip logic while paused.
      7.  Ensure the canvas or game container fits within the window but is responsive.
      8.  If the user's request is not safe or violates policies, generate a simple "Pong" game instead.
      9.  Incorporate sound effects using the Web Audio API (OscillatorNode) if appropriate for the genre. Do NOT use external audio files. Create synthetic sounds for actions (e.g., jump, shoot, score, game over). Handle AudioContext autoplay policy by resuming it on the first user interaction (click or key press).

      Return the response in JSON format with two fields:
      - "html": The full HTML code for the game.
      - "controls": An array of objects describing the controls used in the game. Each object should have:
          - "icon": One of "arrows", "wasd", "mouse", "click", "space", "other".
          - "label": Short description of the action (e.g., "Move", "Shoot").
          - "keyName": (Optional) Specific key name if "icon" is "other" (e.g., "R", "P").
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        maxOutputTokens: 8192, 
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            html: { type: Type.STRING },
            controls: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  icon: { type: Type.STRING, enum: ["arrows", "wasd", "mouse", "click", "space", "other"] },
                  label: { type: Type.STRING },
                  keyName: { type: Type.STRING }
                },
                required: ["icon", "label"]
              }
            }
          },
          required: ["html", "controls"]
        }
      }
    });

    // Check if the model refused to generate due to safety
    if (response.candidates && response.candidates[0].finishReason !== 'STOP') {
      if (response.candidates[0].finishReason === 'SAFETY') {
        throw new Error('SAFETY_ERROR');
      }
    }

    const text = response.text || '';
    if (!text) {
        throw new Error('EMPTY_RESPONSE');
    }

    // Robust JSON cleaning/extraction
    let jsonStr = text.trim();
    // Attempt to extract JSON from code blocks or mixed text
    const firstOpen = jsonStr.indexOf('{');
    const lastClose = jsonStr.lastIndexOf('}');
    
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      jsonStr = jsonStr.substring(firstOpen, lastClose + 1);
    }
    
    // Fallback: cleanup common markdown patterns if regex is still needed
    // (though the substring method usually handles the wrapping markdown chars)
    
    const json = JSON.parse(jsonStr);
    return json as GameGenerationResponse;

  } catch (error: any) {
    console.error("Error generating game:", error);
    if (error.message === 'SAFETY_ERROR') {
      throw new Error('SAFETY_ERROR');
    }
    if (error.message === 'API_KEY_MISSING') {
      throw new Error('API_KEY_MISSING');
    }
    throw error;
  }
};

export const generateGamePreview = async (prompt: string, genre: string): Promise<string> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API_KEY_MISSING');
    }
    const ai = new GoogleGenAI({ apiKey });

    const fullPrompt = `Generate a gameplay screenshot for a browser game.
    Genre: ${genre}
    Description: ${prompt}
    Style: Polished, colorful, arcade style. High quality interface.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
            if (part.inlineData && part.inlineData.data) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("No image generated");
  } catch (error: any) {
    console.error("Error generating preview:", error);
    if (error.message === 'API_KEY_MISSING') {
      throw new Error('API_KEY_MISSING');
    }
    throw error;
  }
};