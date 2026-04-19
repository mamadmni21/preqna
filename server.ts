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

  // Diagnostic: Log all available environment keys (not values)
  console.log('Available environment variables:', Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY')));
  console.log('Checking specifically for DASHSCOPE_API_KEY:', !!process.env.DASHSCOPE_API_KEY);

  const DASHSCOPE_API_KEY = (process.env.DASHSCOPE_API_KEY || '').trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '');

  // Log key info for debugging (Safe logging)
  if (DASHSCOPE_API_KEY) {
    console.log(`DASHSCOPE_API_KEY loaded. Length: ${DASHSCOPE_API_KEY.length}, Starts with: ${DASHSCOPE_API_KEY.substring(0, 4)}...`);
  } else {
    console.warn('DASHSCOPE_API_KEY is currently empty in environment.');
  }

  const dashscopeClient = axios.create({
    baseURL: 'https://dashscope.aliyuncs.com/api/v1',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  // Diagnostic Route
  app.get('/api/diag', (req, res) => {
    res.json({
      envKeys: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY')),
      hasKey: !!process.env.DASHSCOPE_API_KEY,
      keyLength: process.env.DASHSCOPE_API_KEY?.length || 0,
      prefix: process.env.DASHSCOPE_API_KEY?.substring(0, 4) || 'none'
    });
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
