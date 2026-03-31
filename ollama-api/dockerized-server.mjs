import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { Ollama } from 'ollama'; // Import the constructor

const app = express();
app.use(express.json());

// Initialize the client pointing to the Docker service name (read from env)
const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://ollama:11434' });

// Configure express-rate-limit (30 per minute)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: { error: "Our API is currently overloaded. Please wait." }
});

// Automatic Modifiers List
const promptModifiers = [
  "Answer in a single sentence.",
  "Answer in English."
];

// Categorization modifiers: return only one of the listed categories
const categorizeModifiers = [
  'You have the following options: "Shopping", "Social", "Entertainment", "Productivity", "Health", "Finance", "Government". Reply with exactly one of these options with no additional text.'
];

// Allowed categories and helper to extract one from model output
const ALLOWED_CATEGORIES = ["Shopping", "Social", "Entertainment", "Productivity", "Health", "Finance", "Government"];

function extractCategory(rawText) {
  if (!rawText) return null;
  let s = String(rawText || '').trim();

  // Remove surrounding quotes and typographic quotes
  s = s.replace(/^["'`\u2018\u2019\u201C\u201D]+|["'`\u2018\u2019\u201C\u201D]+$/g, '').trim();

  // Try direct whole-string match (case-insensitive)
  for (const cat of ALLOWED_CATEGORIES) {
    if (s.localeCompare(cat, undefined, { sensitivity: 'accent' }) === 0) return cat;
  }

  // Look for any allowed category as a standalone token inside the text
  for (const cat of ALLOWED_CATEGORIES) {
    const esc = cat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${esc}\\b`, 'i');
    if (re.test(s)) return cat;
  }

  // Split into lines/segments and check each piece
  const parts = s.split(/[\n\r,;]+/).map(p => p.trim()).filter(Boolean);
  for (const p of parts) {
    for (const cat of ALLOWED_CATEGORIES) {
      if (p.toLowerCase() === cat.toLowerCase()) return cat;
    }
  }

  return null;
}

app.post('/ask', limiter, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const finalPrompt = `${prompt}\n\n[Instructions: ${promptModifiers.join(" ")}]`;

  try {
    // The 'ollama' instance here now uses the custom host defined above
    const response = await ollama.generate({
      model: 'qwen2.5:0.5b',
      prompt: finalPrompt,
    });

    res.json({ response: response.response });
  } catch (error) {
    res.status(500).json({ error: `Ollama Error: ${error.message}` });
  }
});

// New endpoint: categorize a prompt into one of the predefined categories
app.post('/categorize', limiter, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const finalPrompt = `${prompt}\n\n[Instructions: ${categorizeModifiers.join(' ')}]`;

  try {
    const response = await ollama.generate({
      model: 'qwen2.5:0.5b',
      prompt: finalPrompt,
    });

    // Normalize the model output to one of the allowed categories if possible
    const raw = response && response.response ? response.response : '';
    const category = extractCategory(typeof raw === 'string' ? raw : JSON.stringify(raw));
    res.json({ category });
  } catch (error) {
    res.status(500).json({ error: `Ollama Error: ${error.message}` });
  }
});

// Listen on the configured port and bind to 0.0.0.0 for container access
app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log(`API server listening on port ${process.env.PORT || 3000}`);
});