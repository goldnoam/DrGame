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
    2.  Do NOT use external CSS or JS files unless they are common CDNs. Prefer vanilla JS and Canvas API.
    3.  The game must be fully playable with keyboard or mouse controls.
    4.  Style the game to look polished and modern.
    5.  Include a "Restart" button logic if the game ends.
    6.  MANDATORY PAUSE FEATURE:
        - Toggle pause with 'P' key.
        - Visual "Pause" button in top UI.
        - "PAUSED" overlay.
    7.  Synthetic Sound Effects using Web Audio API (OscillatorNode). No external audio files.
    8.  EXPOSE CONFIGURATION (MANDATORY for Level Editor):
        - Define a global object \`window.GAME_CONFIG\` at the VERY TOP of your script.
        - Put ALL tweakable values here: player speed, colors (hex), gravity, enemy count/speed, AND the LEVEL DATA (array/grid) if applicable.
        - Define \`window.initGame()\` function that uses \`window.GAME_CONFIG\` to start/restart the game.
        - Example: \`window.GAME_CONFIG = { playerSpeed: 5, enemyCount: 10, themeColor: "#ff0000", map: [...] };\`
    9.  MOBILE SUPPORT (MANDATORY):
        - Add touch event listeners (touchstart, touchend) for controls.
        - If the game uses keys (WASD/Arrows), render on-screen virtual buttons for mobile users.
        - Prevent default touch actions (scrolling/zooming) on the game canvas.
    10. If the request is unsafe, generate a simple "Pong" game.

    Return JSON with:
    - "html": Full HTML string.
    - "controls": Array of { "icon": "arrows"|"wasd"|"mouse"|"click"|"space"|"other", "label": string, "keyName"?: string }.
  `;

  let lastError: any;
  // Retry mechanism with backoff
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          maxOutputTokens: 8192,
          temperature: 0.5, // Lower temperature for more stability
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
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ]
        }
      });

      // Check safety first
      if (response.candidates && response.candidates[0]?.finishReason === 'SAFETY') {
        throw new Error('SAFETY_ERROR');
      }

      // Extract text aggressively
      let text = response.text;
      if (!text && response.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = response.candidates[0].content.parts[0].text;
      }

      if (!text) {
        // If still empty, it might be a transient model issue, throw to trigger retry
        throw new Error('EMPTY_RESPONSE');
      }

      // Parse JSON
      let jsonStr = text.trim();
      const firstOpen = jsonStr.indexOf('{');
      const lastClose = jsonStr.lastIndexOf('}');
      
      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        jsonStr = jsonStr.substring(firstOpen, lastClose + 1);
      }
      
      try {
        const json = JSON.parse(jsonStr);
        if (!json.html) throw new Error("Invalid JSON structure");
        return json as GameGenerationResponse;
      } catch (parseError) {
        console.warn("JSON Parse failed, attempting fallback regex...");
        // Fallback: Try to extract HTML directly if JSON failed but text exists
        const htmlMatch = text.match(/<html[\s\S]*?<\/html>/i) || text.match(/<!DOCTYPE html[\s\S]*?<\/html>/i);
        if (htmlMatch) {
            return {
                html: htmlMatch[0],
                controls: [{ icon: 'other', label: 'Check Game UI', keyName: '?' }]
            };
        }
        throw parseError;
      }

    } catch (error: any) {
      console.warn(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;
      
      if (error.message === 'SAFETY_ERROR' || error.message === 'API_KEY_MISSING') {
        throw error; // Don't retry these
      }
      
      // Add delay before retry (Exponential Backoff: 2s, 4s, 6s)
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('FAILED_AFTER_RETRIES');
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
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ]
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