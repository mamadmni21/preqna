import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const transcribeClinicalAudio = async (base64Audio: string, mimeType: string) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Transcribe this clinical audio recording and generate a structured clinical report.
    Return the information in JSON format with the following keys:
    - transcription: string
    - soapNotes: {
        subjective: string,
        objective: string,
        assessment: string,
        plan: string
      }
    - clinicalChecklist: string[] (List of key medical observations or actions)
    - structuredInfo: {
        symptoms: string[],
        findings: string[],
        diagnosis: string,
        treatment: string
      }

    Ensure the JSON is valid and only return the JSON object.
  `;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Audio,
        },
      },
    ]);
    const response = await result.response;
    const jsonText = response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return null;
  }
};

export const extractClinicalInfo = async (text: string) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Extract structured clinical information from the following medical text.
    Text: "${text}"

    Return the information in JSON format with the following keys:
    - symptoms: string[]
    - findings: string[]
    - diagnosis: string
    - treatment: string
    - soap: {
        subjective: string,
        objective: string,
        assessment: string,
        plan: string
      }

    Ensure the JSON is valid and only return the JSON object.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error extracting clinical info:", error);
    return null;
  }
};
