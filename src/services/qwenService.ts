import axios from 'axios';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';

const dashscopeClient = axios.create({
  baseURL: 'https://dashscope.aliyuncs.com/api/v1',
  headers: {
    'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

export const transcribeSimpleAudio = async (base64Audio: string, mimeType: string) => {
  if (!DASHSCOPE_API_KEY) {
    console.error("DASHSCOPE_API_KEY is missing");
    return null;
  }

  try {
    // Using Qwen-Audio-Turbo for transcription
    const response = await dashscopeClient.post('/services/aigc/multimodal-generation/generation', {
      model: 'qwen-audio-turbo',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { audio: `data:${mimeType};base64,${base64Audio}` },
              { text: "Transcribe this audio recording accurately. Support English, French, Arabic, Vietnamese, Indonesian, and Malay. Return only the transcription text." }
            ]
          }
        ]
      }
    });

    return response.data.output.choices[0].message.content[0].text.trim();
  } catch (error) {
    console.error("Error transcribing with Qwen:", error);
    return null;
  }
};

export const transcribeClinicalAudio = async (base64Audio: string, mimeType: string) => {
  if (!DASHSCOPE_API_KEY) {
    console.error("DASHSCOPE_API_KEY is missing");
    return null;
  }

  try {
    const response = await dashscopeClient.post('/services/aigc/multimodal-generation/generation', {
      model: 'qwen-audio-turbo',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { audio: `data:${mimeType};base64,${base64Audio}` },
              { text: `
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
              ` }
            ]
          }
        ]
      }
    });

    const jsonText = response.data.output.choices[0].message.content[0].text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error clinical transcription with Qwen:", error);
    return null;
  }
};

export const extractClinicalInfo = async (text: string) => {
  if (!DASHSCOPE_API_KEY) {
    console.error("DASHSCOPE_API_KEY is missing");
    return null;
  }

  try {
    const response = await dashscopeClient.post('/services/aigc/text-generation/generation', {
      model: 'qwen-max',
      input: {
        messages: [
          {
            role: 'user',
            content: `
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
            `
          }
        ]
      },
      parameters: {
        result_format: 'message'
      }
    });

    const jsonText = response.data.output.choices[0].message.content.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error extracting clinical info with Qwen:", error);
    return null;
  }
};
