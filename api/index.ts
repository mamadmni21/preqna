import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

const DASHSCOPE_API_KEY = (process.env.DASHSCOPE_API_KEY || '').trim().replace(/^Bearer\s+/i, '');

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
    console.error('DASHSCOPE_API_KEY is missing');
    return res.status(500).json({ error: 'AI Services are not configured. Please set DASHSCOPE_API_KEY in the environment.' });
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

    if (response.data.output && response.data.output.choices) {
      const result = response.data.output.choices[0].message.content[0].text.trim();
      res.json({ text: result });
    } else {
      console.error('Unexpected Alibaba Response:', response.data);
      res.status(500).json({ error: response.data.message || 'AI model error' });
    }
  } catch (error: any) {
    const errMsg = error.response?.data?.message || error.message;
    console.error('Qwen Transcription Error:', errMsg);
    res.status(500).json({ error: `Transcription failed: ${errMsg}` });
  }
});

app.post('/api/qwen/extract', async (req, res) => {
  const { text, prompt } = req.body;

  if (!DASHSCOPE_API_KEY) {
    return res.status(500).json({ error: 'AI Services are not configured.' });
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

    if (response.data.output && response.data.output.choices) {
      const jsonText = response.data.output.choices[0].message.content.replace(/```json|```/g, "").trim();
      res.json(JSON.parse(jsonText));
    } else {
      res.status(500).json({ error: response.data.message || 'Extraction failed' });
    }
  } catch (error: any) {
    const errMsg = error.response?.data?.message || error.message;
    console.error('Qwen Extraction Error:', errMsg);
    res.status(500).json({ error: `Extraction failed: ${errMsg}` });
  }
});

// Catch-all for API
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

export default app;
