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
    const { prompt, description, language, topic, provider = "grok", order = 1, existingContent = [], previewItems = [], availableInputs = [] } = await req.json();
    
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
      previewItems,
      availableInputs
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

CRITICAL: Each content piece must be UNIQUE and DIFFERENT from any previous content for the same subject.

IMPORTANT QUIZ_3 GUIDELINES:
- Quiz_3 should NEVER ask "Con nào là [subject]?" - this is too repetitive and boring
- Instead, ask educational questions about different animals, habitats, characteristics, or behaviors
- Make quiz_3 about learning something new, not just identifying the main subject
- Use the available inputs list to create diverse, educational questions`;

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
      uniquenessInstructions += "\n- The reward message must follow this progression based on order number:";
      uniquenessInstructions += "\n  * Order 1: \"[Animal Name] Thường\" (e.g., \"Cá sấu Thường\")";
      uniquenessInstructions += "\n  * Order 2: \"[Animal Name] Hiếm\" (e.g., \"Cá sấu Hiếm\")";
      uniquenessInstructions += "\n  * Order 3: \"[Animal Name] Tinh Anh\" (e.g., \"Cá sấu Tinh Anh\")";
      uniquenessInstructions += "\n  * Order 4: \"[Animal Name] Huyền thoại\" (e.g., \"Cá sấu Huyền thoại\")";
      uniquenessInstructions += "\n  * Order 5: \"[Animal Name] Siêu cấp\" (e.g., \"Cá sấu Siêu cấp\")";
      uniquenessInstructions += "\n  * Order 6+: Continue with creative variations like \"Siêu phàm\", \"Thần thánh\", etc.";
      uniquenessInstructions += "\n- IMPORTANT: The reward voice should ONLY contain the reward name, NOT congratulatory text";
    }

    const userPrompt = `Create educational content for a children's video about "${prompt}" in ${language} language, topic: ${topic}.${description ? `\n\nAdditional details: ${description}` : ''}${availableInputs.length > 0 ? `\n\nAvailable inputs for quiz_3: ${availableInputs.join(', ')}` : ''}${uniquenessInstructions}

Video Format: SK3QLR (Short Kids 3 Question with Lesson and Reward) - 45 seconds total
- Intro: 1 second
- Quiz 1: 8 seconds (4 options)
- Quiz 2: 8 seconds (2 options) 
- Quiz 3: 8 seconds (4 image options - select from available inputs)
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
      "text": "Con nào sống dưới nước?",
      "voice": "Hãy chọn con vật sống dưới nước nhé!"
    },
    "options": ["shark", "eagle", "elephant", "dolphin"], // Select 4 items from available inputs list
    "answer": {
      "position": 1,
      "voice": "Đúng rồi! Cá mập sống dưới nước!"
    }
  },
  "lesson": {
    "voice": "Educational lesson voice script"
  },
  "reward": {
    "voice": "Cá sấu Huyền thoại"
  }
}

Requirements:
- Make content engaging and educational for children
- Use appropriate vocabulary for the target age group
- Ensure questions are relevant to the topic and subject
- Make answer positions logical and varied
- Keep voice scripts natural and conversational
- For quiz_3, select ONLY 4 items from the provided available inputs list
- Quiz_3 should be diverse and educational - ask about different animals, habitats, characteristics, or behaviors
- Examples of good quiz_3 questions:
  * "Con nào sống dưới nước?" (Which one lives in water?)
  * "Con nào có cánh và biết bay?" (Which one has wings and can fly?)
  * "Con nào có vảy?" (Which one has scales?)
  * "Con nào là động vật ăn cỏ?" (Which one is a herbivore?)
  * "Con nào sống ở sa mạc?" (Which one lives in the desert?)
- Avoid repetitive questions like "Con nào là [subject]?" - make it educational about different animals
- If no available inputs are provided, use animal names that can be represented by images (e.g., "elephant", "shark", "eagle", "deer")
- Ensure all content is factually accurate and educational
- CRITICAL: Make this content UNIQUE and DIFFERENT from any previous content for this subject
- REWARD PROGRESSION: The reward voice must follow this exact progression based on order number:
  * Order 1: "[Animal Name] Thường" (e.g., "Cá sấu Thường")
  * Order 2: "[Animal Name] Hiếm" (e.g., "Cá sấu Hiếm") 
  * Order 3: "[Animal Name] Tinh Anh" (e.g., "Cá sấu Tinh Anh")
  * Order 4: "[Animal Name] Huyền thoại" (e.g., "Cá sấu Huyền thoại")
  * Order 5: "[Animal Name] Siêu cấp" (e.g., "Cá sấu Siêu cấp")
  * Order 6+: Continue with creative variations like "Siêu phàm", "Thần thánh", etc.
- IMPORTANT: The reward voice should ONLY contain the reward name (e.g., "Cá sấu Huyền thoại"), NOT congratulatory text

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