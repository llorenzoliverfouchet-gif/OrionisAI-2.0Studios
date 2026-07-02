// server.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // v2 compatible require
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not set. /api/generate will fail without it.');
}

// POST /api/generate
// Body: { messages: [{role: 'system'|'user'|'assistant', content: '...'}, ...] }
app.post('/api/generate', async (req, res) => {
  try {
    const messages = req.body.messages;
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 800,
        temperature: 0.6
      })
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return res.status(resp.status).json({ error: data || 'OpenAI error' });
    }

    const text = data?.choices?.[0]?.message?.content ?? '';
    res.json({ text, raw: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running: http://localhost:${port}`);
  console.log(`Serving files from ${path.join(__dirname, 'public')}`);
});
