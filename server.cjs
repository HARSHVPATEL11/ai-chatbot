const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("AI Backend Server is Running 🚀");
});

app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    console.log("Messages received:", messages);

    if (!messages || messages.length === 0) {
      return res.status(400).json({
        error: "Messages are required",
      });
    }

    const contents = messages.map((msg) => ({
      role: msg.role === "ai" ? "model" : "user",
      parts: [
        {
          text: String(msg.text || ""),
        },
      ],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: contents,
    });

    console.log("AI Response:", response.text);

    res.json({
      reply: response.text,
    });

  } catch (error) {
    console.error("Gemini Error:", error);

    res.status(500).json({
      error: error.message || "AI response failed",
    });
  }
});

app.listen(5000, () => {
  console.log("AI Backend Server Running 🚀");
  console.log("http://localhost:5000");
});