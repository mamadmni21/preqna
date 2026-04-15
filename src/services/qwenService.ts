import axios from 'axios';

export const transcribeSimpleAudio = async (base64Audio: string, mimeType: string) => {
  try {
    const response = await axios.post('/api/qwen/transcribe', {
      base64Audio,
      mimeType,
      prompt: "Transcribe this audio recording accurately. Support English, French, Arabic, Vietnamese, Indonesian, and Malay. Return only the transcription text."
    });
    return response.data.text;
  } catch (error) {
    console.error("Error transcribing with Qwen proxy:", error);
    return null;
  }
};

export const transcribeClinicalAudio = async (base64Audio: string, mimeType: string) => {
  try {
    const response = await axios.post('/api/qwen/transcribe', {
      base64Audio,
      mimeType,
      prompt: `
        Transcribe this clinical audio recording and generate a structured clinical report.
        Return the information in JSON format with the following keys:
        - transcription: string
        - soapNotes: {
            subjective: string,
            objective: string,
            assessment: string,
            plan: string
          }
        - clinicalChecklist: string[]
        - structuredInfo: {
            symptoms: string[],
            findings: string[],
            diagnosis: string,
            treatment: string
          }
        Ensure the JSON is valid and only return the JSON object.
      `
    });
    
    const jsonText = response.data.text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error clinical transcription with Qwen proxy:", error);
    return null;
  }
};

export const extractClinicalInfo = async (text: string) => {
  try {
    const response = await axios.post('/api/qwen/extract', {
      text,
      prompt: `
        Extract structured clinical information from the following medical text.
        Text: "{text}"

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
      `
    });
    return response.data;
  } catch (error) {
    console.error("Error extracting clinical info with Qwen proxy:", error);
    return null;
  }
};
