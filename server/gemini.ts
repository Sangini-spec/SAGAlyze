import { GoogleGenAI, Type } from "@google/genai";

// Using Replit's AI Integrations service for Gemini - this was set up per user request to replace OpenAI
// Supported models: gemini-2.5-flash (fast), gemini-2.5-pro (advanced reasoning)
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
});

interface LesionAnalysisResult {
  classification: string;
  confidence: number;
  benignScore: number;
  malignantScore: number;
  rashScore: number;
  infectionScore: number;
  reasoning: string;
}

export async function analyzeLesionImage(base64Image: string): Promise<LesionAnalysisResult> {
  // Validate API key is configured
  if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY || !process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
    console.error("No Gemini API configuration found");
    throw new Error("Gemini API is not configured. Please set up the Gemini integration.");
  }

  // Validate input
  if (!base64Image || base64Image.length === 0) {
    throw new Error("Invalid image data provided");
  }

  try {
    console.log("Starting lesion analysis with Google Gemini 2.5 Flash...");
    
    const prompt = `You are an expert dermatology AI assistant. Analyze this skin lesion image and classify it into one of four categories:

1. Benign - Non-cancerous, harmless lesions
2. Malignant - Potentially cancerous lesions requiring immediate attention
3. Rash - Inflammatory skin conditions, dermatitis
4. Infection - Bacterial, fungal, or viral skin infections

Provide a detailed analysis with confidence scores for each category.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { 
            inlineData: { 
              mimeType: "image/jpeg", 
              data: base64Image 
            } 
          }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classification: { 
              type: Type.STRING,
              description: "Must be one of: Benign, Malignant, Rash, Infection"
            },
            confidence: { 
              type: Type.INTEGER,
              description: "Confidence score 0-100 for the primary classification"
            },
            benignScore: { 
              type: Type.INTEGER,
              description: "Probability score 0-100 that the lesion is benign"
            },
            malignantScore: { 
              type: Type.INTEGER,
              description: "Probability score 0-100 that the lesion is malignant"
            },
            rashScore: { 
              type: Type.INTEGER,
              description: "Probability score 0-100 that the lesion is a rash"
            },
            infectionScore: { 
              type: Type.INTEGER,
              description: "Probability score 0-100 that the lesion is an infection"
            },
            reasoning: { 
              type: Type.STRING,
              description: "Brief clinical explanation for the classification"
            }
          },
          required: ["classification", "confidence", "benignScore", "malignantScore", "rashScore", "infectionScore", "reasoning"]
        }
      }
    });

    console.log("Gemini API response received successfully");

    // Get the response text - in Gemini SDK this is a property (getter)
    const responseText = response.text;
    console.log("Response text type:", typeof responseText);
    if (responseText && typeof responseText === 'string') {
      console.log("Response text preview:", responseText.substring(0, Math.min(100, responseText.length)));
    }
    
    if (!responseText || typeof responseText !== 'string') {
      console.error("Invalid response text from Gemini - type:", typeof responseText);
      throw new Error("Empty or invalid response from Gemini API");
    }

    console.log("Parsing AI response...");
    const result = JSON.parse(responseText);

    // Validate required fields
    if (!result.classification) {
      console.error("Missing classification in AI response:", result);
      throw new Error("AI response missing classification");
    }

    // Validate classification is one of the expected values
    const validClassifications = ["Benign", "Malignant", "Rash", "Infection"];
    if (!validClassifications.includes(result.classification)) {
      console.error("Invalid classification value:", result.classification);
      // Try to map to a valid classification
      const normalized = result.classification.charAt(0).toUpperCase() + result.classification.slice(1).toLowerCase();
      if (validClassifications.includes(normalized)) {
        result.classification = normalized;
      } else {
        throw new Error(`Invalid classification: ${result.classification}. Must be one of: ${validClassifications.join(", ")}`);
      }
    }

    const analysisResult = {
      classification: result.classification,
      confidence: Math.max(0, Math.min(100, Math.round(result.confidence || 0))),
      benignScore: Math.max(0, Math.min(100, Math.round(result.benignScore || 0))),
      malignantScore: Math.max(0, Math.min(100, Math.round(result.malignantScore || 0))),
      rashScore: Math.max(0, Math.min(100, Math.round(result.rashScore || 0))),
      infectionScore: Math.max(0, Math.min(100, Math.round(result.infectionScore || 0))),
      reasoning: result.reasoning || "Analysis completed",
    };

    console.log("Lesion analysis completed:", analysisResult.classification);
    return analysisResult;
  } catch (error: any) {
    console.error("Gemini API error details:", {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
    });

    // Provide more specific error messages
    if (error.status === 401 || error.message?.includes("401")) {
      throw new Error("Invalid Gemini API configuration. Please check your setup.");
    } else if (error.status === 429 || error.message?.includes("429") || error.message?.toLowerCase().includes("rate limit")) {
      throw new Error("Gemini API rate limit exceeded. Please try again later.");
    } else if (error.status === 400 || error.message?.includes("400")) {
      throw new Error("Invalid request to Gemini API. The image format may be unsupported.");
    } else if (error.message?.includes("JSON")) {
      throw new Error("Failed to parse AI response. Please try again.");
    }

    throw new Error(`Failed to analyze lesion image: ${error.message || "Unknown error"}`);
  }
}
