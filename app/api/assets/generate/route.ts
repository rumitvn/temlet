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
    const { prompt, description, language, topic, provider = "grok", order = 1, existingContent = [], previewItems = [] } = await req.json();
    
    // Debug logging
    console.log('=== AI GENERATE REQUEST DEBUG ===');
    console.log('Request body:', {
      prompt,
      description,
      language,
      topic,
      provider,
      order,
      existingContent,
      previewItems
    });
    
    if (!prompt || !language || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, language, topic' },
        { status: 400 }
      );
    }
    
    // Validate language
    if (!['vietnamese', 'english'].includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language. Supported: vietnamese, english' },
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

    const systemPrompt = `You are an expert content creator for educational children's videos. Create engaging SK3QLR (Short Kids 3 Question with Lesson and Reward) format content. 

IMPORTANT: Return ONLY valid JSON in the exact format specified. Do not include any explanatory text, markdown formatting, or additional content before or after the JSON. The response must start with { and end with }.

CRITICAL: Each content piece must be UNIQUE and DIFFERENT from any previous content for the same subject.`;

    // Build uniqueness instructions based on existing content
    let uniquenessInstructions = "";
    if (existingContent.length > 0 || previewItems.length > 0) {
      uniquenessInstructions = "\n\nUNIQUENESS REQUIREMENTS:";
      uniquenessInstructions += "\n- This is order " + order + " for subject '" + prompt + "'";
      
      if (existingContent.length > 0) {
        uniquenessInstructions += "\n- Existing content that you MUST AVOID repeating:";
        existingContent.forEach((item: any) => {
          uniquenessInstructions += `\n  ${item.filename} (Order ${item.order}):`;
          uniquenessInstructions += `\n    Intro: "${item.intro}"`;
          uniquenessInstructions += `\n    Quiz1: "${item.quiz1}"`;
          uniquenessInstructions += `\n    Quiz2: "${item.quiz2}"`;
          uniquenessInstructions += `\n    Quiz3: "${item.quiz3}"`;
          uniquenessInstructions += `\n    Lesson: "${item.lesson}"`;
          uniquenessInstructions += `\n    Reward: "${item.reward}"`;
        });
      }
      
      if (previewItems.length > 0) {
        uniquenessInstructions += "\n- Previous preview content that you MUST AVOID repeating:";
        previewItems.forEach((item: any) => {
          uniquenessInstructions += `\n  Order ${item.order}:`;
          uniquenessInstructions += `\n    Intro: "${item.intro}"`;
          uniquenessInstructions += `\n    Quiz1: "${item.quiz1}"`;
          uniquenessInstructions += `\n    Quiz2: "${item.quiz2}"`;
          uniquenessInstructions += `\n    Quiz3: "${item.quiz3}"`;
          uniquenessInstructions += `\n    Lesson: "${item.lesson}"`;
          uniquenessInstructions += `\n    Reward: "${item.reward}"`;
        });
      }
      
      uniquenessInstructions += "\n\nCRITICAL INSTRUCTIONS:";
      uniquenessInstructions += "\n- Create COMPLETELY DIFFERENT content from all previous versions";
      uniquenessInstructions += "\n- Use different questions, different facts, different approaches";
      uniquenessInstructions += "\n- Focus on different aspects of the subject";
      uniquenessInstructions += "\n- Vary the difficulty level and complexity";
      uniquenessInstructions += "\n- Do NOT repeat any of the questions, facts, or approaches shown above";
      uniquenessInstructions += "\n- Each quiz question must be unique and different from all previous ones";
      uniquenessInstructions += "\n- The lesson content must cover different educational points";
      uniquenessInstructions += "\n- The reward message must be different from previous versions";
    }

    const userPrompt = `Create educational content for a children's video about "${prompt}" in ${language} language, topic: ${topic}.${description ? `\n\nAdditional details: ${description}` : ''}${uniquenessInstructions}

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
- CRITICAL: Make this content UNIQUE and DIFFERENT from any previous content for this subject

Language: ${language}
Topic: ${topic}
Subject: ${prompt}
Order: ${order}

CRITICAL: Return ONLY the JSON object. Do not include any other text, explanations, or formatting.`;

    // Debug logging for prompts
    console.log('=== AI PROMPTS DEBUG ===');
    console.log('System Prompt:', systemPrompt);
    console.log('User Prompt:', userPrompt);
    console.log('Uniqueness Instructions:', uniquenessInstructions);

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
    
    // Extract JSON from the response (handle cases where AI adds extra text)
    let jsonContent = content;
    
    // Try to find JSON object in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
    
    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Attempted to parse:', jsonContent);
      
      // Try to clean up common JSON issues
      let cleanedContent = jsonContent
        .replace(/^[^{]*/, '') // Remove everything before first {
        .replace(/[^}]*$/, '') // Remove everything after last }
        .replace(/,\s*}/g, '}') // Remove trailing commas
        .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
      
      try {
        parsed = JSON.parse(cleanedContent);
      } catch (secondError) {
        console.error('Second JSON Parse Error:', secondError);
        console.error('Cleaned content:', cleanedContent);
        
        return NextResponse.json(
          { error: 'Failed to parse AI response. Please try again.' },
          { status: 500 }
        );
      }
    }
    
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