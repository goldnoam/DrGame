
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

  // Simplified prompt structure to ensure model adherence
  const fullPrompt = `
    Role: You are an expert game developer.
    Task: Create a single-file HTML5 game based on the user's description.
    Genre: ${genre}
    Description: "${prompt}"
    
    Technical Requirements:
    1. Output complete HTML with embedded CSS and JS.
    2. Use Canvas API. No external assets.
    3. Mobile-friendly: Add touch controls/buttons.
    4. Implement a 'P' key pause and a Pause UI overlay.
    5. Use Web Audio API for sound effects.
    6. Define window.GAME_CONFIG at the top with tweakable variables (speed, colors, sound settings).
    7. Define window.initGame() to start/restart.
    
    Output Format:
    - Put HTML code between <<<HTML_START>>> and <<<HTML_END>>>
    - Put Controls JSON between <<<JSON_START>>> and <<<JSON_END>>> (e.g., [{"icon":"arrows","label":"Move"}])
  `;

  let lastError: any;
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          systemInstruction: 'You are a coding expert. Always output valid HTML within the specified delimiters.',
          maxOutputTokens: 8192,
          temperature: 0.7, // Slightly higher temp for creativity, but not too high
          // Use permissive safety settings to prevent "EMPTY_RESPONSE" on benign game violence (e.g. shooting)
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
          // Fallback regex for standard HTML block if delimiters missed or model ignored instructions
          const fallbackHtml = text.match(/<!DOCTYPE html>[\s\S]*?<\/html>/i) || text.match(/<html[\s\S]*?<\/html>/i);
          if (fallbackHtml) {
             html = fallbackHtml[0];
          } else {
             // Second fallback: check for markdown code blocks
             const mdMatch = text.match(/```html([\s\S]*?)```/);
             if (mdMatch) html = mdMatch[1].trim();
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
         // If we still have no HTML, log the raw text to see what happened (for debugging)
         console.warn("Failed to extract HTML. Raw response:", text.substring(0, 200) + "...");
         throw new Error("INVALID_FORMAT"); 
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
