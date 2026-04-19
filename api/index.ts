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

// Helper to make dashscope calls with region fallback
const callDashscope = async (endpoint: string, data: any) => {
  const key = getDashscopeKey();
  const domains = [
    'https://dashscope.aliyuncs.com/api/v1',
    'https://dashscope-intl.aliyuncs.com/api/v1' // Fallback for International accounts
  ];
  
  if (!key) {
    console.error(`DashScope ${endpoint}: KEY IS EMPTY`);
    throw new Error('API Key is missing');
  }

  let lastError: any = null;

  for (const baseUrl of domains) {
    try {
      console.log(`DashScope ${endpoint}: Attempting request to ${baseUrl}...`);
      const response = await axios.post(`${baseUrl}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15s timeout
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status;
      const message = error.response?.data?.message || '';
      
      console.error(`DashScope ${baseUrl}${endpoint} [${status || 'Error'}]: ${message || error.message}`);
      
      // If it's a 401, try the next domain. Otherwise, throw.
      if (status !== 401) {
        throw error;
      }
    }
  }

  throw lastError;
};

// Diagnostic Route with Region Check & Deep Character Analysis
app.get('/api/diag', async (req, res) => {
  const key = getDashscopeKey();
  let liveVerified = false;
  let verifiedRegion = null;
  let liveError = null;

  if (key) {
    const domains = ['Mainland', 'International'];
    const urls = ['https://dashscope.aliyuncs.com/api/v1', 'https://dashscope-intl.aliyuncs.com/api/v1'];
    
    for (let i = 0; i < urls.length; i++) {
      try {
        await axios.post(`${urls[i]}/services/aigc/text-generation/generation`, {
          model: 'qwen-max',
          input: { messages: [{ role: 'user', content: 'hi' }] },
          parameters: { max_tokens: 1 }
        }, {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        liveVerified = true;
        verifiedRegion = domains[i];
        break;
      } catch (error: any) {
        liveError = error.response?.data?.message || error.message;
      }
    }
  }

  // Deep inspection
  const prefixCodes = key.substring(0, 5).split('').map(c => c.charCodeAt(0));
  const suffixCodes = key.length > 5 ? key.substring(key.length - 5).split('').map(c => c.charCodeAt(0)) : [];

  res.json({
    buildVersion: '1.0.6 - Regional Fallback',
    hasKey: !!key,
    keyLength: key.length,
    prefix: key.substring(0, 5) || 'none',
    prefixCodes,
    suffixCodes,
    liveStatus: liveVerified ? 'VERIFIED' : 'FAILED',
    verifiedRegion,
    lastLiveError: liveError,
    activeStrategy: 'Dual-Region (Mainland + International)',
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
