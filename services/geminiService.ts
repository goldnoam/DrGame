
import { GoogleGenAI } from "@google/genai";
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
        - INCLUDE SOUND SETTINGS:
          - \`soundVolume\` (number 0.0 to 1.0)
          - \`soundEnabled\` (boolean)
          - \`soundType\` (string: 'sine', 'square', 'sawtooth', 'triangle')
    9.  MOBILE SUPPORT (MANDATORY):
        - Add touch event listeners (touchstart, touchend) for controls.
        - If the game uses keys (WASD/Arrows), render on-screen virtual buttons for mobile users.
        - Prevent default touch actions (scrolling/zooming) on the game canvas.
    10. If the request is unsafe, generate a simple "Pong" game.

    OUTPUT FORMAT INSTRUCTIONS:
    You must output two distinct sections.
    
    SECTION 1: THE GAME CODE
    Wrap the complete HTML code (including <style> and <script>) inside these delimiters:
    <<<HTML_START>>>
    ... your html code ...
    <<<HTML_END>>>

    SECTION 2: THE CONTROLS JSON
    Wrap the controls metadata JSON inside these delimiters:
    <<<JSON_START>>>
    [
      { "icon": "arrows", "label": "Move" },
      { "icon": "space", "label": "Jump" }
    ]
    <<<JSON_END>>>
    
    Do NOT output any other text before or after these blocks.
  `;

  let lastError: any;
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          systemInstruction: 'You are "Dr. Game", an expert game developer. You write clean, bug-free, single-file HTML5 code.',
          maxOutputTokens: 8192,
          temperature: 0.6, 
          // Removed responseMimeType: 'application/json' to allow robust text blocks
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ]
        }
      });

      if (response.candidates && response.candidates[0]?.finishReason === 'SAFETY') {
        throw new Error('SAFETY_ERROR');
      }

      let text = response.text || "";
      if (!text && response.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = response.candidates[0].content.parts[0].text;
      }

      if (!text) {
        throw new Error('EMPTY_RESPONSE');
      }

      // Robust Parsing using Delimiters
      const htmlMatch = text.match(/<<<HTML_START>>>([\s\S]*?)<<<HTML_END>>>/);
      const jsonMatch = text.match(/<<<JSON_START>>>([\s\S]*?)<<<JSON_END>>>/);

      let html = "";
      let controls: GameControl[] = [];

      if (htmlMatch && htmlMatch[1]) {
          html = htmlMatch[1].trim();
      } else {
          // Fallback regex for standard HTML block if delimiters missed
          const fallbackHtml = text.match(/<!DOCTYPE html>[\s\S]*?<\/html>/i) || text.match(/<html[\s\S]*?<\/html>/i);
          if (fallbackHtml) {
             html = fallbackHtml[0];
          }
      }

      if (jsonMatch && jsonMatch[1]) {
          try {
              controls = JSON.parse(jsonMatch[1].trim());
          } catch (e) { 
              console.warn("Controls JSON parse failed, using default"); 
          }
      } else {
          // Default controls if missing
           controls = [{ icon: 'other', label: 'Play', keyName: 'Game' }];
      }

      if (!html) {
         throw new Error("INVALID_FORMAT"); // Generated text didn't contain valid code block
      }

      return { html, controls };

    } catch (error: any) {
      console.warn(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;
      
      if (error.message === 'SAFETY_ERROR' || error.message === 'API_KEY_MISSING') {
        throw error;
      }
      
      // Exponential Backoff
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
