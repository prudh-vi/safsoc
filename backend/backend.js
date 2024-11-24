import express from 'express';
import OpenAI from 'openai';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize OpenAI with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const port = process.env.PORT || 5123;

// Store chat history and messages
let chatHistory = [];
let lastMessageId = 0;

app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Chat Safety Monitor Server is running");
});

// Get messages endpoint
app.get('/api/messages', (req, res) => {
  const afterId = parseInt(req.query.lastMessageId) || 0;
  const newMessages = chatHistory.filter(msg => msg.id > afterId);
  res.json({
    messages: newMessages,
    lastMessageId: lastMessageId
  });
});

// Send message endpoint
app.post('/api/messages', async (req, res) => {
  try {
    const { user, message } = req.body;
    
    // Create new message object
    const newMessage = {
      id: ++lastMessageId,
      user,
      message,
      timestamp: new Date(),
    };
    
    // Add message to chat history
    chatHistory.push(newMessage);

    // Check message safety
    const safetyAnalysis = await analyzeSafety(message);
    
    res.json({
      success: true,
      message: newMessage,
      safetyAnalysis
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function analyzeSafety(message) {
  console.log("Analyzing message safety:", message);
  
  const messages = [
    {
      "role": "system",
      "content": `You are a chat safety monitor. Your tasks:
        1. Analyze messages for personal information (names, addresses, phone numbers, etc.)
        2. Detect sensitive data (financial details, passwords)
        3. Identify unsafe sharing practices
        4. Flag potentially harmful content
        5. If message is safe, respond with "SAFE"
        6. If unsafe, provide a brief specific warning about what information should not be shared`
    },
    {
      "role": "user",
      "content": message
    }
  ];

  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      temperature: 0.3,
      max_tokens: 150,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    console.log("Safety analysis:", chat.choices[0].message.content);
    return chat.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

app.listen(port, () => {
  console.log("Chat Safety Monitor Server")
})