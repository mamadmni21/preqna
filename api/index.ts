import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

// Ensure environment variables are loaded for the API function
dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

// Robust key discovery logic with 'Seek-and-Sanitize'
const getDashscopeKey = () => {
  const envKey = process.env.DASHSCOPE_API_KEY || process.env.VITE_DASHSCOPE_API_KEY || '';
  if (!envKey || envKey === 'undefined' || envKey === 'null') return '';

  let key = envKey.trim();
  
  // Strategy: Remove quotes
  key = key.replace(/^["']|["']$/g, '');

  // Strategy: Identify the core key if embedded in shell commands
  const skMatch = key.match(/sk-[a-zA-Z0-9\-\_\.]+/i);
  if (skMatch) {
    key = skMatch[0];
  }

  // Final trim and safety check (don't over-sanitize here to avoid breaking valid but unusual keys)
  key = key.trim();
  
  return key;
};

// Helper to make dashscope calls
const callDashscope = async (endpoint: string, data: any) => {
  const key = getDashscopeKey();
  
  if (!key) {
    console.error(`DashScope ${endpoint}: KEY IS EMPTY`);
  } else {
    const signature = `${key.substring(0, 5)}...${key.substring(key.length - 3)}`;
    console.log(`DashScope ${endpoint}: Attempting Multi-Header Auth with key ${signature}`);
  }

  try {
    const response = await axios.post(`https://dashscope.aliyuncs.com/api/v1${endpoint}`, data, {
      headers: {
        'Authorization': `Bearer ${key}`,
        'X-DashScope-ApiKey': key,      // Alternative for multimodal
        'dashscope-api-key': key,       // Common mapping for Alibaba SDKs
        'Content-Type': 'application/json'
      }
    });
    return response;
  } catch (error: any) {
    const status = error.response?.status || 'Network Error';
    const errorData = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error(`DashScope ${endpoint} [${status}]:`, errorData);
    throw error;
  }
};

// Diagnostic Route with Deep Character Analysis
app.get('/api/diag', async (req, res) => {
  const key = getDashscopeKey();
  let liveVerified = false;
  let liveError = null;

  if (key) {
    try {
      await callDashscope('/services/aigc/text-generation/generation', {
        model: 'qwen-max',
        input: { messages: [{ role: 'user', content: 'hi' }] },
        parameters: { max_tokens: 1 }
      });
      liveVerified = true;
    } catch (error: any) {
      liveError = error.response?.data?.message || error.message;
    }
  }

  // Generate character metadata for remote debugging
  const charCodes = key.substring(0, 8).split('').map(c => c.charCodeAt(0));

  res.json({
    buildVersion: '1.0.5 - Triple-Header Auth',
    hasKey: !!key,
    keyLength: key.length,
    prefix: key.substring(0, 5) || 'none',
    suffix: key.length > 5 ? `...${key.substring(key.length - 3)}` : 'none',
    prefixCharCodes: charCodes,
    liveStatus: liveVerified ? 'VERIFIED' : 'FAILED',
    liveError,
    activeHeaders: ['Authorization', 'X-DashScope-ApiKey', 'dashscope-api-key'],
    searched: ['DASHSCOPE_API_KEY', 'VITE_DASHSCOPE_API_KEY']
  });
});

// Qwen Proxy Routes
app.post('/api/qwen/transcribe', async (req, res) => {
  const { base64Audio, mimeType, prompt } = req.body;
  
  if (!getDashscopeKey()) {
    console.error('DASHSCOPE_API_KEY is missing');
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

// Catch-all for API
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

export default app;
