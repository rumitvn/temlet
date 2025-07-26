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

IMPORTANT INTRO GUIDELINES:
- Title: Simple name with order/part, e.g., "Con cá sấu P1" or "Cá sấu P1" (P = Phần/Part)
- Voice: Simple mention of subject and part, e.g., "Con cá sấu phần 1"

IMPORTANT VOICE GUIDELINES:
- Keep all voice scripts short and simple (3-5 seconds max)
- Avoid lengthy explanations
- Focus on clear, concise communication
- Answer voices should be engaging, educational, and informative
- Use different positive responses followed by the correct answer:
  * Examples: "Chính xác! Con cá sấu có 4 chân", "Tuyệt vời! Con sư tử là vua rừng", "Rất giỏi! Cây cối cần ánh sáng để quang hợp"
  * Other variations: "Đúng rồi! [correct answer]", "Hoàn hảo! [correct answer]", "Thông minh! [correct answer]", "Tài giỏi! [correct answer]", "Xuất sắc! [correct answer]"
- Always include the correct answer in the voice response to reinforce learning

IMPORTANT DIFFICULTY PROGRESSION:
- Order 1 (Easy): Basic identification, simple facts, obvious choices
- Order 2 (Medium): Slightly more complex, requires basic knowledge
- Order 3 (Hard): Requires deeper understanding, multiple concepts
- Order 4 (Hard): Advanced knowledge, complex relationships
- Order 5 (Very Hard): Expert level, detailed knowledge required

IMPORTANT QUIZ_3 GUIDELINES:
- Quiz_3 should NEVER ask repetitive identification questions like "Con nào là [subject]?" or "Cây nào là [subject]?"
- Instead, ask educational questions about different items, characteristics, behaviors, or facts
- Make quiz_3 about learning something new, not just identifying the main subject
- Use the available inputs list to create diverse, educational questions
- CRITICAL: Quiz_3 options must ALWAYS be in ENGLISH as they represent image filenames
- CRITICAL: Select exactly 4 items from the available inputs list for the options
- CRITICAL: The correct answer position must correspond to an item that actually answers the question
- EXAMPLE: If question is "Con nào sống dưới nước?" and available inputs include ["shark", "eagle", "elephant", "dolphin", "lion"], then:
  * Options should be: ["shark", "eagle", "elephant", "dolphin"] (4 items from available inputs)
  * Correct answer should be position 1 (shark) or position 4 (dolphin) since they live in water
  * Voice should be: "Rất giỏi! Cá mập sống dưới nước" or "Rất giỏi! Cá heo sống dưới nước"
- Adapt questions based on topic and difficulty level:
  * Animals: 
    - Easy: basic habitats, obvious characteristics
    - Medium: diet, behavior patterns
    - Hard: adaptations, ecosystem roles
    - Very Hard: scientific classification, complex behaviors
  * Plants: 
    - Easy: basic parts, simple identification
    - Medium: growth patterns, basic uses
    - Hard: photosynthesis, complex adaptations
    - Very Hard: scientific classification, ecological relationships
  * Science: 
    - Easy: basic concepts, simple experiments
    - Medium: cause and effect, basic principles
    - Hard: complex interactions, multiple variables
    - Very Hard: advanced theories, detailed processes
  * History: 
    - Easy: basic facts, simple events
    - Medium: cause and effect, basic timelines
    - Hard: complex relationships, multiple factors
    - Very Hard: detailed analysis, complex historical contexts`;

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
    "text": "Con cá sấu P1",
    "voice": "Con cá sấu phần 1"
  },
  "quiz_1": {
    "question": {
      "text": "Question text",
      "voice": "Voice script for question"
    },
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "answer": {
      "position": 2,
      "voice": "Tuyệt vời! Con cá sấu có 4 chân"
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
      "voice": "Chính xác! Con cá sấu sống dưới nước"
    }
  },
  "quiz_3": {
    "question": {
      "text": "Con nào sống dưới nước?",
      "voice": "Hãy chọn con vật sống dưới nước nhé!"
    },
    "options": ["shark", "eagle", "elephant", "dolphin"], // CRITICAL: Must be ENGLISH image names from available inputs
    "answer": {
      "position": 1,
      "voice": "Rất giỏi! Cá mập sống dưới nước"
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
- Keep voice scripts short and simple (3-5 seconds max)
- ANSWER VOICES: Use varied, engaging responses that include the correct answer
  * Examples: "Chính xác! Con cá sấu có 4 chân", "Tuyệt vời! Con sư tử là vua rừng", "Rất giỏi! Cây cối cần ánh sáng để quang hợp"
  * Other variations: "Đúng rồi! [correct answer]", "Hoàn hảo! [correct answer]", "Thông minh! [correct answer]", "Tài giỏi! [correct answer]", "Xuất sắc! [correct answer]"
  * Always include the correct answer in the voice response to reinforce learning
  * Vary the responses across different quizzes to keep it interesting
- For quiz_3, select ONLY 4 items from the provided available inputs list
- CRITICAL: Quiz_3 options must ALWAYS be in ENGLISH as they represent image filenames
- CRITICAL: The correct answer position must correspond to an item that actually answers the question
- Quiz_3 should be diverse and educational - ask about different items, characteristics, or facts
- DIFFICULTY LEVEL: This is Order ${order}, so adjust complexity accordingly:
  * Order 1 (Easy): Basic identification, simple facts, obvious choices
  * Order 2 (Medium): Slightly more complex, requires basic knowledge  
  * Order 3 (Hard): Requires deeper understanding, multiple concepts
  * Order 4 (Hard): Advanced knowledge, complex relationships
  * Order 5 (Very Hard): Expert level, detailed knowledge required
- Examples of good quiz_3 questions by topic and difficulty:
  * Animals: 
    - Easy: "Con nào sống dưới nước?", "Con nào có 4 chân?", "Con nào có lông?"
    - Medium: "Con nào ăn cỏ?", "Con nào ngủ vào ban ngày?", "Con nào sống theo bầy?"
    - Hard: "Con nào có khả năng thay đổi màu sắc?", "Con nào có hệ thống định vị siêu âm?", "Con nào có thể tái sinh các bộ phận?"
    - Very Hard: "Con nào thuộc lớp bò sát có vảy?", "Con nào có hệ thống tuần hoàn kép?", "Con nào có khả năng quang hợp?"
  * Plants: 
    - Easy: "Cây nào có lá xanh?", "Cây nào có hoa?", "Cây nào cao nhất?"
    - Medium: "Cây nào cần nhiều nước?", "Cây nào mọc nhanh?", "Cây nào có rễ sâu?"
    - Hard: "Cây nào có thể sống trong điều kiện khô hạn?", "Cây nào có hệ thống rễ cộng sinh?", "Cây nào có thể tự phát sáng?"
    - Very Hard: "Cây nào thuộc họ cây họ đậu?", "Cây nào có hệ thống vận chuyển nước hiệu quả nhất?", "Cây nào có thể sống hàng nghìn năm?"
  * Science: 
    - Easy: "Chất nào tan trong nước?", "Vật nào nổi trên nước?", "Thí nghiệm nào tạo ra bong bóng?"
    - Medium: "Chất nào thay đổi màu khi gặp axit?", "Vật nào dẫn điện tốt?", "Hiện tượng nào xảy ra khi đun nóng?"
    - Hard: "Chất nào có thể thay đổi trạng thái ở nhiệt độ phòng?", "Vật nào có từ tính mạnh nhất?", "Hiện tượng nào liên quan đến áp suất khí quyển?"
    - Very Hard: "Chất nào có cấu trúc tinh thể phức tạp nhất?", "Vật nào có khả năng siêu dẫn ở nhiệt độ cao?", "Hiện tượng nào liên quan đến cơ học lượng tử?"
  * History: 
    - Easy: "Ai là vị vua đầu tiên?", "Sự kiện nào xảy ra năm 1945?", "Nơi nào là thủ đô cổ?"
    - Medium: "Ai phát minh ra điện?", "Cuộc chiến nào kết thúc năm 1975?", "Thành phố nào được xây dựng đầu tiên?"
    - Hard: "Ai là người đầu tiên bay vòng quanh thế giới?", "Sự kiện nào dẫn đến cuộc cách mạng công nghiệp?", "Nơi nào là trung tâm thương mại cổ đại?"
    - Very Hard: "Ai là người phát hiện ra cấu trúc DNA?", "Sự kiện nào dẫn đến sự sụp đổ của đế chế La Mã?", "Nơi nào là trung tâm học thuật cổ đại quan trọng nhất?"
- Avoid repetitive identification questions like "Con nào là [subject]?" or "Cây nào là [subject]?"
- If no available inputs are provided, use appropriate ENGLISH names that can be represented by images
- Ensure all content is factually accurate and educational
- CRITICAL: Make this content UNIQUE and DIFFERENT from any previous content for this subject
- REWARD PROGRESSION: The reward voice must follow this exact progression based on order number:
  * Order 1: "[Subject Name] Thường" (e.g., "Cá sấu Thường", "Cây cối Thường")
  * Order 2: "[Subject Name] Hiếm" (e.g., "Cá sấu Hiếm", "Cây cối Hiếm") 
  * Order 3: "[Subject Name] Tinh Anh" (e.g., "Cá sấu Tinh Anh", "Cây cối Tinh Anh")
  * Order 4: "[Subject Name] Huyền thoại" (e.g., "Cá sấu Huyền thoại", "Cây cối Huyền thoại")
  * Order 5: "[Subject Name] Siêu cấp" (e.g., "Cá sấu Siêu cấp", "Cây cối Siêu cấp")
  * Order 6+: Continue with creative variations like "Siêu phàm", "Thần thánh", etc.
- IMPORTANT: The reward voice should ONLY contain the reward name, NOT congratulatory text
- INTRO REQUIREMENTS:
  * Title: Simple name with order/part, e.g., "Con cá sấu P1", "Cây cối P1", "Khoa học P1"
  * Voice: Simple mention of subject and part, e.g., "Con cá sấu phần 1", "Cây cối phần 1"

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