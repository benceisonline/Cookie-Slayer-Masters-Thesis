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
  "Use a professional tone."
];

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

// Listen on the configured port and bind to 0.0.0.0 for container access
app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log(`API server listening on port ${process.env.PORT || 3000}`);
});