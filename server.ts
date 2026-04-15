import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

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

      const jsonText = response.data.output.choices[0].message.content.replace(/```json|```/g, "").trim();
      res.json(JSON.parse(jsonText));
    } catch (error: any) {
      console.error('Qwen Extraction Error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to extract info' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
