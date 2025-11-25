
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
    Task: Create a robust, single-file HTML5 game based on the user's description.
    Genre: ${genre}
    Description: "${prompt}"
    
    Technical Requirements:
    1. Output ONE single HTML file.
    2. ALL CSS must be in a <style> tag in the <head>.
    3. ALL JS must be in a <script> tag in the <body>.
    4. NO external assets (images/sounds). Use Canvas API for graphics.
    5. Mobile-friendly: Add touch controls/buttons.
    6. Implement a 'P' key pause and a Pause UI overlay.
    7. Use Web Audio API for sound effects (Oscillators).
    8. Define window.GAME_CONFIG at the top with tweakable variables.
    9. Define window.initGame() to start/restart.
    10. CRITICAL: Start the game loop automatically upon window load.
    11. CRITICAL: CSS must include "body { margin: 0; overflow: hidden; background: #111; color: #fff; }" to be visible.
    12. Do NOT use ES modules (import/export). Use standard <script> tags.
    
    Output Format (CRITICAL):
    - Provide the HTML code inside <<<HTML_START>>> and <<<HTML_END>>> delimiters.
    - Provide the Controls JSON inside <<<JSON_START>>> and <<<JSON_END>>> delimiters.
    - Do NOT include any other text or markdown outside these blocks.
  `;

  let lastError: any;
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          systemInstruction: 'You are a coding engine. Output ONLY valid HTML code and JSON data wrapped in the requested delimiters.',
          maxOutputTokens: 8192,
          temperature: 0.7,
          // Use 'BLOCK_NONE' to prevent silent refusals for games involving combat/shooting
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' as any },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' as any },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' as any },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' as any },
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

      // Robust Parsing using Delimiters with Fallback strategies
      let html = "";
      let controls: GameControl[] = [];
      
      // Use Regex to find delimiters to handle potential whitespace variations (e.g. <<< HTML_START >>>)
      const htmlStartRegex = /<<<\s*HTML_START\s*>>>/;
      const htmlEndRegex = /<<<\s*HTML_END\s*>>>/;
      const jsonStartRegex = /<<<\s*JSON_START\s*>>>/;
      const jsonEndRegex = /<<<\s*JSON_END\s*>>>/;

      const htmlStartMatch = text.match(htmlStartRegex);
      const htmlEndMatch = text.match(htmlEndRegex);

      if (htmlStartMatch && htmlStartMatch.index !== undefined) {
          const startIndex = htmlStartMatch.index + htmlStartMatch[0].length;
          if (htmlEndMatch && htmlEndMatch.index !== undefined && htmlEndMatch.index > startIndex) {
              html = text.substring(startIndex, htmlEndMatch.index).trim();
          } else {
              // If end tag is missing (truncation), take everything after start
              html = text.substring(startIndex).trim();
          }
      } 
      
      // 2. Fallback: Look for standard HTML structure if delimiter extraction failed or returned empty
      if (!html) {
          // Remove markdown code block wrappers if present (start and end)
          const cleanText = text.replace(/```html/gi, '').replace(/```/g, '');
          
          // Find the START of the HTML document
          let startIdx = cleanText.search(/<!DOCTYPE html>/i);
          if (startIdx === -1) startIdx = cleanText.search(/<html/i);
          
          if (startIdx !== -1) {
              // Find the END of the HTML document
              const endIdx = cleanText.search(/<\/html>/i);
              
              if (endIdx !== -1) {
                  // Perfect match found
                  html = cleanText.substring(startIdx, endIdx + 7);
              } else {
                  // Truncated response: take everything from start to end of string
                  html = cleanText.substring(startIdx);
              }
          }
      }

      // 3. Extract JSON Controls
      const jsonStartMatch = text.match(jsonStartRegex);
      const jsonEndMatch = text.match(jsonEndRegex);

      if (jsonStartMatch && jsonStartMatch.index !== undefined && jsonEndMatch && jsonEndMatch.index !== undefined) {
          const startIndex = jsonStartMatch.index + jsonStartMatch[0].length;
          const jsonStr = text.substring(startIndex, jsonEndMatch.index).trim();
          try {
              controls = JSON.parse(jsonStr);
          } catch (e) {
              console.warn("Controls JSON parse failed", e);
          }
      } else {
          // Try to find JSON block in markdown or just brackets
           const jsonMdMatch = text.match(/\[\s*\{.*\}\s*\]/s);
           if (jsonMdMatch) {
               try { controls = JSON.parse(jsonMdMatch[0].trim()); } catch(e) {}
           }
      }
      
      if (!controls || controls.length === 0) {
           controls = [{ icon: 'other', label: 'Play', keyName: 'Game' }];
      }

      // Final Check and Repair
      if (!html || html.length < 50) {
         // Deep fallback: If the text contains <script> or <canvas> but no DOCTYPE, wrap it.
         if (text.includes('<canvas') || text.includes('<script')) {
            html = `<!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>body { margin: 0; background: #000; color: #fff; overflow: hidden; }</style>
            </head>
            <body>
              ${text.replace(/```/g, '')}
            </body>
            </html>`;
         } else {
            console.warn("Failed to extract HTML. Raw response:", text.substring(0, 200) + "...");
            throw new Error("INVALID_FORMAT"); 
         }
      } else {
          // Ensure structure is valid for download
          if (!html.toLowerCase().includes('<!doctype html>')) {
              html = `<!DOCTYPE html>\n${html}`;
          }
          // Repair truncated HTML by appending closing tags if missing
          if (!html.toLowerCase().includes('</html>')) {
              html += '\n</body>\n</html>';
          }
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
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' as any },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' as any },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' as any },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' as any },
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
