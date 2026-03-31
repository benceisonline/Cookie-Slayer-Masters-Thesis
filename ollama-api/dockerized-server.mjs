import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { Ollama } from 'ollama'; // Import the constructor

const app = express();

// Capture raw body for fallback parsing/debugging. Use raw parser to avoid
// express.json throwing on invalid JSON (e.g. unescaped control chars).
app.use(express.raw({ type: '*/*', limit: '1mb', verify: (req, res, buf) => {
  try { req.rawBody = buf && buf.toString(); } catch (_) { req.rawBody = undefined; }
} }));

// Helper to sanitize incoming prompts into plain text
function sanitizePrompt(s) {
  if (typeof s !== 'string') s = String(s || '');
  // Remove control chars except common whitespace, then normalize whitespace
  s = s.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]+/g, ' ');
  // Replace any remaining newlines/tabs with a single space
  s = s.replace(/[\r\n\t]+/g, ' ');
  // Collapse multiple whitespace into single space and trim
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

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
  'You have the following options: "Shopping", "Social", "Entertainment", "Productivity", "Health", "Finance", "Government". Reply with exactly one of these options that is most fitting for this website with no additional text.'
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
  // Extract prompt: try JSON parse of raw body, otherwise use raw text
  let prompt = undefined;
  const raw = typeof req.rawBody === 'string' ? req.rawBody : (Buffer.isBuffer(req.body) ? req.body.toString() : undefined);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.prompt === 'string') prompt = parsed.prompt;
    } catch (_) {
      // invalid JSON — fall back to raw text
    }
    if (!prompt) prompt = raw;
  }

  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  // Sanitize incoming prompt to plain text
  prompt = sanitizePrompt(prompt);

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
  // Extract prompt: try JSON parse of raw body, otherwise use raw text
  let prompt = undefined;
  const raw = typeof req.rawBody === 'string' ? req.rawBody : (Buffer.isBuffer(req.body) ? req.body.toString() : undefined);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.prompt === 'string') prompt = parsed.prompt;
    } catch (_) {
      // invalid JSON — fall back to raw text
    }
    if (!prompt) prompt = raw;
  }

  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  // Sanitize incoming prompt to plain text
  prompt = sanitizePrompt(prompt);

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