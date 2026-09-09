import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

if (!apiKey) {
  console.warn(
    "⚠️ Gemini API key missing. Set GEMINI_API_KEY or GOOGLE_API_KEY in your environment for AI features.",
  );
}

const configuredModel = process.env.GEMINI_MODEL?.trim();
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "models/gemini-2.5-flash",
  "gemini-2.0-flash",
  "models/gemini-2.0-flash",
  "gemini-1.5-pro",
  "models/gemini-1.5-pro",
  "gemini-1.5-flash",
  "models/gemini-1.5-flash",
];

const MODEL_CANDIDATES = Array.from(
  new Set([
    ...(configuredModel && configuredModel.length > 0 ? [configuredModel] : []),
    ...FALLBACK_MODELS,
  ]),
);

const client = new GoogleGenAI({ apiKey });
const models = client.models;

type DebugResponse = {
  correctedCode: string;
  explanation: string;
  suggestions: string[];
};

type ComplexityResponse = {
  timeComplexity: string;
  spaceComplexity: string;
  analysis: string;
};

type ConceptResponse = {
  concepts: string[];
  recommendations: string[];
};

type JsonSchemaDefinition = {
  type: Type;
  properties?: Record<string, JsonSchemaDefinition>;
  items?: JsonSchemaDefinition;
  enum?: string[];
  required?: string[];
  description?: string;
};

const DEBUG_SCHEMA: JsonSchemaDefinition = {
  type: Type.OBJECT,
  required: ["correctedCode", "explanation", "suggestions"],
  properties: {
    correctedCode: { type: Type.STRING },
    explanation: { type: Type.STRING },
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
};

const COMPLEXITY_SCHEMA: JsonSchemaDefinition = {
  type: Type.OBJECT,
  required: ["timeComplexity", "spaceComplexity", "analysis"],
  properties: {
    timeComplexity: { type: Type.STRING },
    spaceComplexity: { type: Type.STRING },
    analysis: { type: Type.STRING },
  },
};

const CONCEPT_SCHEMA: JsonSchemaDefinition = {
  type: Type.OBJECT,
  required: ["concepts", "recommendations"],
  properties: {
    concepts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
};

async function generateJsonResponse<T>(prompt: string, schema: JsonSchemaDefinition): Promise<T> {
  try {
    if (!apiKey) {
      throw new Error("Gemini API key is not configured.");
    }

    const attemptErrors: string[] = [];
    for (const modelName of MODEL_CANDIDATES) {
      try {
        const response = await models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });

        const text = response.text?.trim() || "{}";

        try {
          return JSON.parse(text);
        } catch (parseError) {
          throw new Error(
            `Model '${modelName}' responded with non-JSON payload: ${text.substring(0, 120)}...`,
          );
        }
      } catch (error) {
        const message = (error as Error).message || String(error);
        attemptErrors.push(`${modelName}: ${message}`);

        if (/404/.test(message) || /not found/i.test(message)) {
          console.warn(
            `⚠️ Gemini model '${modelName}' unavailable. Attempting fallback...`,
          );
          continue;
        }

        throw new Error("Failed to generate Gemini response: " + message);
      }
    }

    throw new Error(
      "Failed to generate Gemini response after trying models: " +
        attemptErrors.join(" | "),
    );
  } catch (error) {
    throw new Error("Failed to generate Gemini response: " + (error as Error).message);
  }
}

export async function debugCode(
  code: string,
  language: string,
  error?: string,
): Promise<DebugResponse> {
  const prompt = `Analyze the following ${language} code and provide debugging assistance. ${
    error ? `The error message is: ${error}` : "Look for potential bugs, errors, or improvements."
  }

Code:
\`\`\`${language}
${code}
\`\`\`

Respond strictly with JSON using this exact shape:
{
  "correctedCode": "the fixed version of the code",
  "explanation": "detailed explanation of what was wrong and how it was fixed",
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}`;

  const response = await generateJsonResponse<DebugResponse>(prompt, DEBUG_SCHEMA);

  return {
    correctedCode: response.correctedCode || code,
    explanation: response.explanation || "No issues found.",
    suggestions: Array.isArray(response.suggestions) ? response.suggestions : [],
  };
}

export async function analyzeComplexity(
  code: string,
  language: string,
): Promise<ComplexityResponse> {
  const prompt = `Analyze the time and space complexity of the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Respond strictly with JSON using this exact shape:
{
  "timeComplexity": "Big-O notation for time complexity",
  "spaceComplexity": "Big-O notation for space complexity",
  "analysis": "detailed explanation of the complexity analysis"
}`;

  const response = await generateJsonResponse<ComplexityResponse>(prompt, COMPLEXITY_SCHEMA);

  return {
    timeComplexity: response.timeComplexity || "O(1)",
    spaceComplexity: response.spaceComplexity || "O(1)",
    analysis: response.analysis || "Analysis not available.",
  };
}

export async function detectConcepts(
  code: string,
  language: string,
): Promise<ConceptResponse> {
  const prompt = `Analyze the following ${language} code and identify the programming concepts, algorithms, and data structures being used:

\`\`\`${language}
${code}
\`\`\`

Respond strictly with JSON using this exact shape:
{
  "concepts": ["concept1", "concept2", "concept3"],
  "recommendations": ["practice problem 1", "practice problem 2", "practice problem 3"]
}`;

  const response = await generateJsonResponse<ConceptResponse>(prompt, CONCEPT_SCHEMA);

  return {
    concepts: Array.isArray(response.concepts) ? response.concepts : [],
    recommendations: Array.isArray(response.recommendations)
      ? response.recommendations
      : [],
  };
}
