import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Grok API configuration
const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const GROK_API_KEY = process.env.GROK_API_KEY;

interface SK3QLRContent {
  key: string;
  order: number;
  intro: {
    text: string;
    voice: string;
  };
  quiz_1: {
    question: {
      text: string;
      voice: string;
    };
    options: string[];
    answer: {
      position: number;
      voice: string;
    };
  };
  quiz_2: {
    question: {
      text: string;
      voice: string;
    };
    options: string[];
    answer: {
      position: number;
      voice: string;
    };
  };
  quiz_3: {
    question: {
      text: string;
      voice: string;
    };
    options: string[];
    answer: {
      position: number;
      voice: string;
    };
  };
  lesson: {
    voice: string;
  };
  reward: {
    voice: string;
  };
}

// POST /api/assets/generate - Generate AI content
export async function POST(req: NextRequest) {
  try {
    const { prompt, language, topic, provider = "grok" } = await req.json();
    
    if (!prompt || !language || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, language, topic' },
        { status: 400 }
      );
    }
    
    // Validate language
    if (!['vietnamese', 'english', 'spanish'].includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language. Supported: vietnamese, english, spanish' },
        { status: 400 }
      );
    }
    
    // Validate topic
    if (!['animals', 'plants', 'science', 'history'].includes(topic)) {
      return NextResponse.json(
        { error: 'Invalid topic. Supported: animals, plants, science, history' },
        { status: 400 }
      );
    }

    const key = prompt.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const order = 1;

    const systemPrompt = `You are an expert content creator for educational children's videos. Create engaging SK3QLR (Short Kids 3 Question with Lesson and Reward) format content. Always output valid JSON only in the exact format specified.`;

    const userPrompt = `Create educational content for a children's video about "${prompt}" in ${language} language, topic: ${topic}.

Video Format: SK3QLR (Short Kids 3 Question with Lesson and Reward) - 45 seconds total
- Intro: 1 second
- Quiz 1: 8 seconds (4 options)
- Quiz 2: 8 seconds (2 options) 
- Quiz 3: 8 seconds (4 image options)
- Lesson: 8 seconds
- Reward: 5 seconds

Generate content in this exact JSON format:
{
  "key": "${key}",
  "order": ${order},
  "intro": {
    "text": "Title text for intro",
    "voice": "Voice script for intro"
  },
  "quiz_1": {
    "question": {
      "text": "Question text",
      "voice": "Voice script for question"
    },
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "answer": {
      "position": 2,
      "voice": "Voice script for correct answer"
    }
  },
  "quiz_2": {
    "question": {
      "text": "Question text",
      "voice": "Voice script for question"
    },
    "options": ["Option 1", "Option 2"],
    "answer": {
      "position": 1,
      "voice": "Voice script for correct answer"
    }
  },
  "quiz_3": {
    "question": {
      "text": "Question text",
      "voice": "Voice script for question"
    },
    "options": ["animal1", "animal2", "animal3", "animal4"],
    "answer": {
      "position": 3,
      "voice": "Voice script for correct answer"
    }
  },
  "lesson": {
    "voice": "Educational lesson voice script"
  },
  "reward": {
    "voice": "Reward voice script"
  }
}

Requirements:
- Make content engaging and educational for children
- Use appropriate vocabulary for the target age group
- Ensure questions are relevant to the topic and subject
- Make answer positions logical and varied
- Keep voice scripts natural and conversational
- For quiz_3, use animal names that can be represented by images (e.g., "elephant", "shark", "eagle", "deer")
- Ensure all content is factually accurate and educational

Language: ${language}
Topic: ${topic}
Subject: ${prompt}`;

    let content = "";

    if (provider === "grok") {
      // Use Grok API
      if (!GROK_API_KEY) {
        throw new Error("GROK_API_KEY is not configured");
      }

      const grokResponse = await fetch(GROK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "grok-3-latest",
          stream: false,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!grokResponse.ok) {
        throw new Error(`Grok API error: ${grokResponse.status}`);
      }

      const grokData = await grokResponse.json();
      content = grokData.choices[0].message.content || "";
    } else {
      // Use OpenAI (default)
      const chat = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      content = chat.choices[0].message.content || "";
    }

    console.log('AI Generated Content: ', content);
    
    // Parse the JSON response
    const parsed = JSON.parse(content);
    
    return NextResponse.json({
      success: true,
      content: parsed,
      fileName: `${parsed.key}_${parsed.order}.json`
    });
  } catch (error) {
    console.error('Error generating AI content:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
} 