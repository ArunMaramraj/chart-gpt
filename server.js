// Import necessary packages
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const session = require('express-session'); // Import express-session

const app = express();
const PORT = 3000;

// Middleware for parsing JSON data
app.use(bodyParser.json());

// Session middleware for contextual memory
app.use(session({
  secret: 'your-secret-key', // Replace with a strong secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Use true if your site is served over HTTPS
}));

// Serve static files (for frontend)
app.use(express.static('public'));

// Your Gemini API key (Replace with your actual key)
const GEMINI_API_KEY = 'AIzaSyBabTbA_rBKMcZ9tIUoLX2m_7sYNL_ZYto';  // Replace with your actual Gemini API key

// Predefined instruction text to prepend
const instructionText = `
You are an assistant to help the user build diagrams with Mermaid.js. 
You should return only the Mermaid.js code. 
Do not include the \`\`\`mermaid\` block at the beginning or the closing \`\`\` at the end. 
Only return the Mermaid.js code in plain text without any additional explanations or text.
The text color of the flowchart is black. 
For example, if the prompt is "generate an algorithm explaining the steps of photosynthesis," you should return the Mermaid.js code for the diagram without any other formatting.
Also, do not use parentheses \`(\` or \`) \` in the code. Only use square brackets \`[and]\` for nodes or labels.
Code (no \`\`\` mermaid or \`\`\`):
`;

const extra = 'give an algorithm explaining the steps';

// POST endpoint to generate flowchart
app.post('/generate', async (req, res) => {
  let { prompt } = req.body;  // Extract the prompt from the request body

  if (!prompt || prompt.trim() === '') {
    return res.status(400).json({ error: 'Prompt cannot be empty!' });
  }

  // If a previous flowchart exists, append it to the current request
  if (req.session.previousFlowchart) {
    prompt = req.session.previousFlowchart + ' ' + prompt; // Add context from previous flowchart
  }

  // Store the user's prompt in session memory
  req.session.userPrompt = prompt;  // Save the prompt temporarily in the session

  // Prepend the instruction text to the user's prompt
  const fullPrompt = instructionText + extra + prompt;

  try {
    // Initialize Google Generative AI model with API key
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Call the Gemini API to generate content
    const result = await model.generateContent(fullPrompt);

    // Log the result for debugging (optional)
    console.log(result.response.text());

    const mermaidcode = result.response.text();

    console.log(mermaidcode);

    // Save the generated Mermaid code to session memory for context
    req.session.previousFlowchart = mermaidcode; // Store the flowchart for future reference

    // Return the generated Mermaid.js code as the response
    res.json({ mermaidCode : mermaidcode });

  } catch (error) {
    console.error("Error during Gemini API call:", error.message);
    res.status(500).json({ error: 'Failed to generate flowchart. Please try again later.' });
  }
});

// Endpoint to retrieve the last prompt or memory (if needed)
app.get('/memory', (req, res) => {
  if (req.session.userPrompt) {
    return res.json({ userPrompt: req.session.userPrompt });
  } else {
    return res.json({ message: 'No memory found for this session.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
