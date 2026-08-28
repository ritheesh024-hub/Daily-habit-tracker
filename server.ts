import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import path from 'path';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Middleware for parsing JSON payloads up to 15MB (for base64 food images)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// In-memory rate limiting map: ip/token -> timestamp[]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_REQUESTS = 30; // Max 30 scans per 10 minutes per client

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(clientId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitMap.set(clientId, validTimestamps);
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(clientId, validTimestamps);
  return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [clientId, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      rateLimitMap.delete(clientId);
    } else {
      rateLimitMap.set(clientId, valid);
    }
  }
}, 5 * 60 * 1000);

// Helper to sanitize OpenAI API Key and Model configuration
function getOpenAIConfig(): { apiKey: string | null; model: string } {
  let rawKey = (process.env.OPENAI_API_KEY || '').trim();
  let rawModel = (process.env.OPENAI_MODEL || '').trim();

  // If OPENAI_MODEL contains an API key starting with sk-, recover key and reset model
  if (rawModel.startsWith('sk-')) {
    if (!rawKey) {
      rawKey = rawModel;
    }
    rawModel = 'gpt-4o-mini';
  }

  // If OPENAI_API_KEY was mistakenly put as a model name (e.g. gpt-4o-mini)
  if (rawKey.startsWith('gpt-') || rawKey.startsWith('o1') || rawKey.startsWith('o3')) {
    if (!rawModel || rawModel.startsWith('sk-')) {
      rawModel = rawKey;
      rawKey = '';
    }
  }

  const model = rawModel && !rawModel.startsWith('sk-') ? rawModel : 'gpt-4o-mini';
  const apiKey = rawKey.length > 0 ? rawKey : null;

  return { apiKey, model };
}

// Lazy OpenAI client initialization
let openaiClient: OpenAI | null = null;
let currentOpenAIKey: string | null = null;
function getOpenAIClient(): OpenAI | null {
  const { apiKey } = getOpenAIConfig();
  if (!apiKey) return null;
  if (!openaiClient || currentOpenAIKey !== apiKey) {
    openaiClient = new OpenAI({ apiKey });
    currentOpenAIKey = apiKey;
  }
  return openaiClient;
}

// Lazy Google Gemini client initialization
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: geminiKey });
  }
  return geminiClient;
}

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const { apiKey, model } = getOpenAIConfig();
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasOpenAIKey: Boolean(apiKey),
    defaultOpenAIModel: model,
    hasGeminiKey: hasGemini,
  });
});

// Food Nutrition Scanning API
app.post('/api/scan-food', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const clientId = authHeader ? authHeader.slice(0, 40) : (req.ip || 'anonymous');

    // Check rate limit
    if (!checkRateLimit(clientId)) {
      res.status(429).json({
        error: 'Food analysis request limit reached. Please wait a few minutes before trying again.',
      });
      return;
    }

    const { imageBase64, mimeType = 'image/jpeg', userPromptNotes } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'Please provide a valid food image for analysis.' });
      return;
    }

    // Clean up base64 string if it includes data URL prefix
    let cleanBase64 = imageBase64;
    let detectedMime = mimeType;
    if (imageBase64.startsWith('data:')) {
      const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        detectedMime = match[1];
        cleanBase64 = match[2];
      }
    }

    // Validate image format
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic'];
    if (!allowedMimeTypes.includes(detectedMime.toLowerCase())) {
      res.status(400).json({
        error: 'Unsupported image format. Please upload a JPG, PNG, or WEBP photo.',
      });
      return;
    }

    // Check approximate file size (base64 length * 0.75)
    const approxBytes = cleanBase64.length * 0.75;
    if (approxBytes > 12 * 1024 * 1024) {
      res.status(400).json({
        error: 'Image is too large. Please select an image under 10MB.',
      });
      return;
    }

    // Execution Strategy: Try OpenAI first if configured, seamlessly fallback to Google Gemini
    const { apiKey: openAIKey, model: configuredModel } = getOpenAIConfig();
    const openai = getOpenAIClient();
    const gemini = getGeminiClient();

    if (!openAIKey && !gemini) {
      res.status(503).json({
        error:
          'AI Vision is not configured on the server. Please add an API key in the project settings or add food items manually.',
      });
      return;
    }

    const systemPrompt = `You are a supportive, knowledgeable food and nutrition estimation assistant for a habit-tracking app.
Your task is to analyze the provided food photo:
1. Identify all clearly visible food items, beverages, and ingredients.
2. Provide a realistic estimated portion size (e.g., "1 cup (approx. 150g)", "1 medium fillet (approx. 180g)", "1 bowl", "1 slice").
3. Estimate nutritional macronutrients for each food: calories (kcal), protein (g), carbohydrates (g), fat (g), dietary fiber (g), and sugar (g).
4. Calculate the combined total nutrition across all detected foods.
5. Provide a confidence level ("high", "medium", "low").
6. Provide 1 to 3 general, supportive, encouraging lifestyle or balance suggestions (e.g., "Consider adding leafy greens for added dietary fiber and micronutrients", "Good balance of lean protein and complex carbs").
   IMPORTANT RULES FOR SUGGESTIONS:
   - Keep suggestions general, practical, and positive.
   - Do NOT provide extreme dieting advice, weight loss targets, body shape critique, or restrictive eating rules.
   - Do NOT label any food as "bad", "toxic", or "forbidden".
7. IF THE IMAGE DOES NOT CONTAIN FOOD or is too blurry/unclear to identify:
   - Set "isFood": false
   - Set "confidence": "low"
   - Set "foods": []
   - Set "total": { "calories": 0, "proteinGrams": 0, "carbsGrams": 0, "fatGrams": 0, "fiberGrams": 0, "sugarGrams": 0 }
   - Set "unidentifiedReason": "Food could not be identified confidently. Please provide a clearer or closer photo of the meal."
   - Set "suggestions": ["Try taking a photo with good lighting and clear view of the plate."]

OUTPUT FORMAT: You MUST return a valid, parseable JSON object matching this exact schema:
{
  "isFood": true,
  "confidence": "high",
  "unidentifiedReason": null,
  "foods": [
    {
      "name": "Food Name",
      "estimatedPortion": "Portion description",
      "calories": 250,
      "proteinGrams": 15,
      "carbsGrams": 30,
      "fatGrams": 8,
      "fiberGrams": 3,
      "sugarGrams": 2
    }
  ],
  "total": {
    "calories": 250,
    "proteinGrams": 15,
    "carbsGrams": 30,
    "fatGrams": 8,
    "fiberGrams": 3,
    "sugarGrams": 2
  },
  "suggestions": [
    "General supportive suggestion"
  ]
}`;

    const userPromptContent = userPromptNotes
      ? `Analyze this food image. Additional user context: "${userPromptNotes}". Estimate nutrition breakdown.`
      : 'Analyze this food photo and provide an estimated nutritional breakdown in JSON.';

    let responseContent: string | null = null;
    let providerUsed = 'unknown';

    // Helper to call OpenAI with model fallback
    const executeOpenAI = async (modelName: string): Promise<string | null> => {
      if (!openai) return null;
      const completion = await openai.chat.completions.create({
        model: modelName,
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPromptContent },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${detectedMime};base64,${cleanBase64}`,
                  detail: 'auto',
                },
              },
            ],
          },
        ],
      });
      return completion.choices[0]?.message?.content || null;
    };

    // Helper to call Google Gemini with robust fallback across current models
    const executeGemini = async (): Promise<{ content: string; model: string } | null> => {
      if (!gemini) return null;
      const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
      
      for (const gModel of candidateModels) {
        try {
          const response = await gemini.models.generateContent({
            model: gModel,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: detectedMime,
                      data: cleanBase64,
                    },
                  },
                  {
                    text: `${systemPrompt}\n\nUser Context:\n${userPromptContent}`,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          });
          if (response.text) {
            return { content: response.text, model: gModel };
          }
        } catch (geminiErr: any) {
          console.warn(`Gemini model ${gModel} failed:`, geminiErr?.message || geminiErr);
        }
      }
      return null;
    };

    // Try OpenAI if configured
    if (openai && openAIKey) {
      try {
        responseContent = await executeOpenAI(configuredModel);
        if (responseContent) {
          providerUsed = `openai:${configuredModel}`;
        }
      } catch (openAiErr: any) {
        console.warn(`OpenAI call with model ${configuredModel} failed:`, openAiErr?.message || openAiErr);

        // If primary model failed (e.g. 404 or bad model name), try gpt-4o-mini
        if (
          configuredModel !== 'gpt-4o-mini' &&
          (openAiErr?.status === 404 ||
            openAiErr?.code === 'model_not_found' ||
            openAiErr?.message?.includes('model'))
        ) {
          try {
            console.log('Retrying with gpt-4o-mini...');
            responseContent = await executeOpenAI('gpt-4o-mini');
            if (responseContent) {
              providerUsed = 'openai:gpt-4o-mini';
            }
          } catch (retryErr: any) {
            console.warn('OpenAI fallback to gpt-4o-mini failed:', retryErr?.message || retryErr);
          }
        }
      }
    }

    // If OpenAI was not configured or threw an error (such as 429 quota exceeded), fallback to Gemini
    if (!responseContent && gemini) {
      try {
        console.log('Using Google Gemini fallback for food analysis...');
        const geminiResult = await executeGemini();
        if (geminiResult) {
          responseContent = geminiResult.content;
          providerUsed = `gemini:${geminiResult.model}`;
        }
      } catch (geminiErr: any) {
        console.error('Gemini vision analysis failed:', geminiErr?.message || geminiErr);
      }
    }

    if (!responseContent) {
      res.status(502).json({
        error: 'Unable to analyze image at this time. Please try again.',
      });
      return;
    }

    // Parse and sanitize JSON result
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseContent);
    } catch (parseErr) {
      console.error('Failed to parse OpenAI JSON output:', responseContent);
      res.status(502).json({
        error: 'Received an invalid response format from AI. Please try again.',
      });
      return;
    }

    // Ensure all numeric values are clean and formatted
    const sanitizeNum = (val: any): number => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, Math.round(num * 10) / 10);
    };

    const isFood = parsedResult.isFood !== false;
    const rawFoods = Array.isArray(parsedResult.foods) ? parsedResult.foods : [];

    const sanitizedFoods = rawFoods.map((f: any) => ({
      name: String(f.name || 'Food Item').trim(),
      estimatedPortion: String(f.estimatedPortion || '1 serving').trim(),
      calories: Math.round(sanitizeNum(f.calories)),
      proteinGrams: sanitizeNum(f.proteinGrams),
      carbsGrams: sanitizeNum(f.carbsGrams),
      fatGrams: sanitizeNum(f.fatGrams),
      fiberGrams: sanitizeNum(f.fiberGrams),
      sugarGrams: sanitizeNum(f.sugarGrams),
    }));

    // Compute or sanitize totals
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    let totalSugar = 0;

    if (sanitizedFoods.length > 0) {
      for (const food of sanitizedFoods) {
        totalCalories += food.calories;
        totalProtein += food.proteinGrams;
        totalCarbs += food.carbsGrams;
        totalFat += food.fatGrams;
        totalFiber += food.fiberGrams;
        totalSugar += food.sugarGrams;
      }
    } else if (parsedResult.total) {
      totalCalories = Math.round(sanitizeNum(parsedResult.total.calories));
      totalProtein = sanitizeNum(parsedResult.total.proteinGrams);
      totalCarbs = sanitizeNum(parsedResult.total.carbsGrams);
      totalFat = sanitizeNum(parsedResult.total.fatGrams);
      totalFiber = sanitizeNum(parsedResult.total.fiberGrams);
      totalSugar = sanitizeNum(parsedResult.total.sugarGrams);
    }

    const sanitizedTotal = {
      calories: Math.round(totalCalories),
      proteinGrams: Math.round(totalProtein * 10) / 10,
      carbsGrams: Math.round(totalCarbs * 10) / 10,
      fatGrams: Math.round(totalFat * 10) / 10,
      fiberGrams: Math.round(totalFiber * 10) / 10,
      sugarGrams: Math.round(totalSugar * 10) / 10,
    };

    const confidence = ['high', 'medium', 'low'].includes(parsedResult.confidence)
      ? parsedResult.confidence
      : 'medium';

    const suggestions = Array.isArray(parsedResult.suggestions)
      ? parsedResult.suggestions
          .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
          .slice(0, 3)
      : [];

    const finalResponse = {
      isFood,
      confidence,
      unidentifiedReason: parsedResult.unidentifiedReason || null,
      foods: sanitizedFoods,
      total: sanitizedTotal,
      suggestions:
        suggestions.length > 0
          ? suggestions
          : ['Enjoy your meal! Remember to stay hydrated throughout the day.'],
      modelUsed: providerUsed,
    };

    res.json(finalResponse);
  } catch (err: any) {
    console.error('Scan Food API Error:', err?.message || err);

    // Handle OpenAI specific error statuses
    if (err?.status === 429 || err?.message?.includes('rate_limit') || err?.code === 'rate_limit_exceeded') {
      res.status(429).json({
        error: 'Food analysis is temporarily unavailable. Please try again later.',
      });
      return;
    }

    if (err?.status === 401 || err?.code === 'invalid_api_key') {
      res.status(503).json({
        error: 'OpenAI API key is invalid. Please check your OPENAI_API_KEY environment variable.',
      });
      return;
    }

    if (err?.status === 400 && err?.message?.includes('image')) {
      res.status(400).json({
        error: 'The uploaded image could not be processed. Please try another image.',
      });
      return;
    }

    res.status(500).json({
      error: 'An unexpected error occurred while analyzing the food image. Please try again.',
    });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Asset Serving
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
