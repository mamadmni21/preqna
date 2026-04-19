import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';

const dashscopeClient = axios.create({
  baseURL: 'https://dashscope.aliyuncs.com/api/v1',
  headers: {
    'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Qwen Proxy Routes
app.post('/api/qwen/transcribe', async (req, res) => {
  const { base64Audio, mimeType, prompt } = req.body;
  
  if (!DASHSCOPE_API_KEY) {
    return res.status(500).json({ error: 'DASHSCOPE_API_KEY is missing on server' });
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
              { text: prompt || "Transcribe this audio recording accurately." }
            ]
          }
        ]
      }
    });

    if (!response.data.output || !response.data.output.choices) {
        throw new Error('Invalid response from DashScope');
    }

    const result = response.data.output.choices[0].message.content[0].text.trim();
    res.json({ text: result });
  } catch (error: any) {
    console.error('Qwen Transcription Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

app.post('/api/qwen/extract', async (req, res) => {
  const { text, prompt } = req.body;

  if (!DASHSCOPE_API_KEY) {
    return res.status(500).json({ error: 'DASHSCOPE_API_KEY is missing on server' });
  }

  try {
    const response = await dashscopeClient.post('/services/aigc/text-generation/generation', {
      model: 'qwen-max',
      input: {
        messages: [
          {
            role: 'user',
            content: prompt.replace('{text}', text)
          }
        ]
      },
      parameters: {
        result_format: 'message'
      }
    });

    if (!response.data.output || !response.data.output.choices) {
        throw new Error('Invalid response from DashScope');
    }

    const content = response.data.output.choices[0].message.content;
    const jsonText = content.replace(/```json|```/g, "").trim();
    res.json(JSON.parse(jsonText));
  } catch (error: any) {
    console.error('Qwen Extraction Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to extract info' });
  }
});

// Catch-all for API
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

export default app;
