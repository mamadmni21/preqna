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

  // Improved key discovery logic
  const getDashscopeKey = () => {
    let key = process.env.DASHSCOPE_API_KEY || process.env.VITE_DASHSCOPE_API_KEY || '';
    // Maximum sanitization: Keep ONLY printable ASCII, remove quotes and prefixes
    key = key.trim();
    key = key.replace(/[^\x21-\x7E]/g, ''); // Remove all non-printable/whitespace-like ASCII
    key = key.replace(/^["']|["']$/g, ''); // Remove outer quotes
    key = key.replace(/^Bearer\s+/i, ''); // Remove accidental Bearer prefix
    return key.trim();
  };

  // Helper to make dashscope calls
  const callDashscope = async (endpoint: string, data: any) => {
    const key = getDashscopeKey();

    if (!key) {
      console.error(`DashScope ${endpoint}: KEY IS EMPTY`);
    } else {
      console.log(`DashScope ${endpoint}: Key length=${key.length}, prefix=${key.substring(0, 4)}`);
    }

    try {
      const response = await axios.post(`https://dashscope.aliyuncs.com/api/v1${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${key}`,
          'X-DashScope-ApiKey': key, // Send both for maximum compatibility
          'Content-Type': 'application/json'
        }
      });
      return response;
    } catch (error: any) {
      if (error.response) {
        console.error(`DashScope ${endpoint} Error (${error.response.status}):`, JSON.stringify(error.response.data));
      } else {
        console.error(`DashScope ${endpoint} Network Error:`, error.message);
      }
      throw error;
    }
  };

  // Diagnostic Route
  app.get('/api/diag', (req, res) => {
    const key = getDashscopeKey();
    res.json({
      envKeys: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY')),
      hasKey: !!key,
      keyLength: key.length,
      prefix: key.substring(0, 4) || 'none',
      suffix: key.length > 4 ? `...${key.substring(key.length - 4)}` : 'none',
      searched: ['DASHSCOPE_API_KEY', 'VITE_DASHSCOPE_API_KEY']
    });
  });

  // Qwen Proxy Routes
  app.post('/api/qwen/transcribe', async (req, res) => {
    const { base64Audio, mimeType, prompt } = req.body;
    
    if (!getDashscopeKey()) {
      return res.status(500).json({ error: 'AI Services are not configured. Please set DASHSCOPE_API_KEY in the environment.' });
    }

    try {
      const response = await callDashscope('/services/aigc/multimodal-generation/generation', {
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

    if (!getDashscopeKey()) {
      return res.status(500).json({ error: 'AI Services are not configured.' });
    }

    try {
      const response = await callDashscope('/services/aigc/text-generation/generation', {
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
