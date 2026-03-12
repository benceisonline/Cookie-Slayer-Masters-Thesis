// Make sure you run 'ollama run gemma3:4b' first

import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { Ollama } from 'ollama';

const app = express();
app.use(express.json());

// Configure express-rate-limit (30 per minute)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: { error: "Our API is currently overloaded. Please wait." }
});

// Automatic Modifiers List
const promptModifiers = [
  "Use a professional tone."
];

// Initialize Ollama client (allow override via OLLAMA_HOST)
const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });

// The API Endpoint
app.post('/ask', limiter, async (req, res) => {
  const { prompt } = req.body;

  // Validation
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  // Automatic Assembly
  const finalPrompt = `${prompt}\n\n[Instructions: ${promptModifiers.join(" ")}]`;

  try {
    const response = await ollama.generate({
      model: 'gemma3:4b',
      prompt: finalPrompt,
    });

    res.json({ 
      response: response.response 
    });
  } catch (error) {
    res.status(500).json({ error: `Ollama Error: ${error.message}` });
  }
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log(`Local Middleman active on http://0.0.0.0:${process.env.PORT || 3000}`));