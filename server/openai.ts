import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// Using Replit AI Integrations if available, otherwise fallback to user's OpenAI API key
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
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
  if (!process.env.OPENAI_API_KEY && !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    console.error("No OpenAI API key configured");
    throw new Error("OpenAI API key is not configured. Please set OPENAI_API_KEY in environment variables.");
  }

  // Validate input
  if (!base64Image || base64Image.length === 0) {
    throw new Error("Invalid image data provided");
  }

  try {
    console.log("Starting lesion analysis with OpenAI GPT-5...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert dermatology AI assistant. Analyze skin lesion images and classify them into one of four categories:
1. Benign - Non-cancerous, harmless lesions
2. Malignant - Potentially cancerous lesions requiring immediate attention
3. Rash - Inflammatory skin conditions, dermatitis
4. Infection - Bacterial, fungal, or viral skin infections

Provide a detailed analysis with confidence scores for each category. Respond with JSON in this exact format:
{
  "classification": "Benign|Malignant|Rash|Infection",
  "confidence": <integer 0-100 for primary classification>,
  "benignScore": <integer 0-100>,
  "malignantScore": <integer 0-100>,
  "rashScore": <integer 0-100>,
  "infectionScore": <integer 0-100>,
  "reasoning": "<brief clinical explanation>"
}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this skin lesion and provide classification with confidence scores.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2048,
    });

    console.log("OpenAI API response received successfully");

    if (!response.choices || response.choices.length === 0) {
      console.error("No choices in OpenAI response");
      throw new Error("Invalid response from OpenAI API");
    }

    const messageContent = response.choices[0].message.content;
    if (!messageContent) {
      console.error("No content in OpenAI message");
      throw new Error("Empty response from OpenAI API");
    }

    console.log("Parsing AI response...");
    const result = JSON.parse(messageContent);

    // Validate required fields
    if (!result.classification) {
      console.error("Missing classification in AI response:", result);
      throw new Error("AI response missing classification");
    }

    const analysisResult = {
      classification: result.classification || "Unknown",
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
    console.error("OpenAI API error details:", {
      message: error.message,
      status: error.status,
      type: error.type,
      code: error.code,
    });

    // Provide more specific error messages
    if (error.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your configuration.");
    } else if (error.status === 429) {
      throw new Error("OpenAI API rate limit exceeded. Please try again later.");
    } else if (error.status === 400) {
      throw new Error("Invalid request to OpenAI API. The image format may be unsupported.");
    } else if (error.message?.includes("JSON")) {
      throw new Error("Failed to parse AI response. Please try again.");
    }

    throw new Error(`Failed to analyze lesion image: ${error.message || "Unknown error"}`);
  }
}
