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

    // Topic-specific system prompts
    const getTopicSpecificPrompt = (topic: string) => {
      switch (topic) {
        case 'animals':
          return `You are an expert content creator for educational children's videos about animals. Create engaging SK3QLR (Short Kids 3 Question with Lesson and Reward) format content.

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

IMPORTANT QUIZ_3 GUIDELINES FOR ANIMALS:
- Quiz_3 should ask educational questions about characteristics, behaviors, or facts RELATED to the main subject animal
- Make quiz_3 about learning something new about the main subject's characteristics, not just identifying the main subject
- CRITICAL: Quiz_3 options must ALWAYS be in ENGLISH as they represent image filenames
- CRITICAL: Select exactly 4 different animal names for the options
- CRITICAL: The correct answer position must correspond to an animal that actually answers the question
- CRITICAL: NEVER include the main subject animal in quiz_3 options (e.g., if subject is "blue_whale", do NOT include "blue_whale" in quiz_3 options)
- CRITICAL: Quiz_3 should ask about characteristics that the main subject animal has or doesn't have
- EXAMPLE: If main subject is "blue_whale" and question is "Con nào có vây?" then:
  * Options should be: ["shark", "eagle", "elephant", "dolphin"] (4 items)
  * Correct answer should be position 1 (shark) or position 4 (dolphin) since they have fins like whales
  * Voice should be: "Rất giỏi! Cá mập có vây giống như cá voi" or "Rất giỏi! Cá heo có vây giống như cá voi"
- Adapt questions based on difficulty level:
  * Easy: basic characteristics (fins, size, habitat type)
  * Medium: behavior patterns (migration, feeding, social)
  * Hard: adaptations (breathing, temperature regulation, communication)
  * Very Hard: scientific classification, complex behaviors`;

        case 'plants':
          return `You are an expert content creator for educational children's videos about plants. Create engaging SK3QLR (Short Kids 3 Question with Lesson and Reward) format content.

IMPORTANT: Return ONLY valid JSON in the exact format specified. Do not include any explanatory text, markdown formatting, or additional content before or after the JSON. The response must start with { and end with }.

CRITICAL: Each content piece must be UNIQUE and DIFFERENT from any previous content for the same subject.

IMPORTANT INTRO GUIDELINES:
- Title: Simple name with order/part, e.g., "Cây cối P1" or "Hoa hồng P1" (P = Phần/Part)
- Voice: Simple mention of subject and part, e.g., "Cây cối phần 1"

IMPORTANT VOICE GUIDELINES:
- Keep all voice scripts short and simple (3-5 seconds max)
- Avoid lengthy explanations
- Focus on clear, concise communication
- Answer voices should be engaging, educational, and informative
- Use different positive responses followed by the correct answer:
  * Examples: "Chính xác! Cây cối cần ánh sáng để quang hợp", "Tuyệt vời! Hoa hồng có gai để bảo vệ", "Rất giỏi! Rễ cây hút nước từ đất"
  * Other variations: "Đúng rồi! [correct answer]", "Hoàn hảo! [correct answer]", "Thông minh! [correct answer]", "Tài giỏi! [correct answer]", "Xuất sắc! [correct answer]"
- Always include the correct answer in the voice response to reinforce learning

IMPORTANT DIFFICULTY PROGRESSION:
- Order 1 (Easy): Basic identification, simple facts, obvious choices
- Order 2 (Medium): Slightly more complex, requires basic knowledge
- Order 3 (Hard): Requires deeper understanding, multiple concepts
- Order 4 (Hard): Advanced knowledge, complex relationships
- Order 5 (Very Hard): Expert level, detailed knowledge required

IMPORTANT QUIZ_3 GUIDELINES FOR PLANTS:
- Quiz_3 should ask educational questions about characteristics, growth patterns, or facts RELATED to the main subject plant
- Make quiz_3 about learning something new about the main subject's characteristics, not just identifying the main subject
- CRITICAL: Quiz_3 options must ALWAYS be in ENGLISH as they represent image filenames
- CRITICAL: Select exactly 4 different plant names for the options
- CRITICAL: The correct answer position must correspond to a plant that actually answers the question
- CRITICAL: NEVER include the main subject plant in quiz_3 options (e.g., if subject is "oak", do NOT include "oak" in quiz_3 options)
- CRITICAL: Quiz_3 should ask about characteristics that the main subject plant has or doesn't have
- EXAMPLE: If main subject is "oak" and question is "Cây nào có lá rộng?" then:
  * Options should be: ["maple", "pine", "palm", "willow"] (4 items)
  * Correct answer should be position 1 (maple) or position 4 (willow) since they have broad leaves like oak
  * Voice should be: "Rất giỏi! Cây phong có lá rộng giống như cây sồi" or "Rất giỏi! Cây liễu có lá rộng giống như cây sồi"
- Adapt questions based on difficulty level:
  * Easy: basic characteristics (leaf type, size, growth pattern)
  * Medium: growth patterns, basic uses, habitat preferences
  * Hard: photosynthesis, complex adaptations, ecological roles
  * Very Hard: scientific classification, ecological relationships`;

        case 'science':
          return `You are an expert content creator for educational children's videos about science. Create engaging SK3QLR (Short Kids 3 Question with Lesson and Reward) format content.

IMPORTANT: Return ONLY valid JSON in the exact format specified. Do not include any explanatory text, markdown formatting, or additional content before or after the JSON. The response must start with { and end with }.

CRITICAL: Each content piece must be UNIQUE and DIFFERENT from any previous content for the same subject.

IMPORTANT INTRO GUIDELINES:
- Title: Simple name with order/part, e.g., "Điện P1" or "Ma sát P1" (P = Phần/Part)
- Voice: Simple mention of subject and part, e.g., "Điện phần 1"

IMPORTANT VOICE GUIDELINES:
- Keep all voice scripts short and simple (3-5 seconds max)
- Avoid lengthy explanations
- Focus on clear, concise communication
- Answer voices should be engaging, educational, and informative
- Use different positive responses followed by the correct answer:
  * Examples: "Chính xác! Điện là năng lượng giúp đèn sáng", "Tuyệt vời! Ma sát giúp ta đi lại không bị trượt", "Rất giỏi! Ánh sáng truyền theo đường thẳng"
  * Other variations: "Đúng rồi! [correct answer]", "Hoàn hảo! [correct answer]", "Thông minh! [correct answer]", "Tài giỏi! [correct answer]", "Xuất sắc! [correct answer]"
- Always include the correct answer in the voice response to reinforce learning

IMPORTANT DIFFICULTY PROGRESSION:
- Order 1 (Easy): Basic concepts, simple experiments
- Order 2 (Medium): Cause and effect, basic principles
- Order 3 (Hard): Complex interactions, multiple variables
- Order 4 (Hard): Advanced knowledge, complex relationships
- Order 5 (Very Hard): Expert level, detailed knowledge required

IMPORTANT QUIZ_3 GUIDELINES FOR SCIENCE:
- Quiz_3 should ask educational questions about scientific concepts, experiments, or phenomena RELATED to the main subject
- Make quiz_3 about learning something new about the main subject's properties, not just identifying the main subject
- CRITICAL: Quiz_3 options must ALWAYS be in ENGLISH as they represent image filenames
- CRITICAL: Select exactly 4 different scientific terms for the options
- CRITICAL: The correct answer position must correspond to a term that actually answers the question
- CRITICAL: NEVER include the main subject concept in quiz_3 options (e.g., if subject is "electricity", do NOT include "electricity" in quiz_3 options)
- CRITICAL: Quiz_3 should ask about properties that the main subject concept has or doesn't have
- EXAMPLE: If main subject is "electricity" and question is "Chất nào dẫn điện?" then:
  * Options should be: ["copper", "plastic", "wood", "aluminum"] (4 items)
  * Correct answer should be position 1 (copper) or position 4 (aluminum) since they conduct electricity like the main subject
  * Voice should be: "Rất giỏi! Đồng dẫn điện giống như điện" or "Rất giỏi! Nhôm dẫn điện giống như điện"
- Adapt questions based on difficulty level:
  * Easy: basic properties (conductivity, solubility, state of matter)
  * Medium: cause and effect, basic principles, applications
  * Hard: complex interactions, multiple variables, advanced properties
  * Very Hard: advanced theories, detailed processes, scientific classification`;

        case 'history':
          return `You are an expert content creator for educational children's videos about history. Create engaging SK3QLR (Short Kids 3 Question with Lesson and Reward) format content.

IMPORTANT: Return ONLY valid JSON in the exact format specified. Do not include any explanatory text, markdown formatting, or additional content before or after the JSON. The response must start with { and end with }.

CRITICAL: Each content piece must be UNIQUE and DIFFERENT from any previous content for the same subject.

IMPORTANT INTRO GUIDELINES:
- Title: Simple name with order/part, e.g., "Lịch sử P1" or "Vua Hùng P1" (P = Phần/Part)
- Voice: Simple mention of subject and part, e.g., "Lịch sử phần 1"

IMPORTANT VOICE GUIDELINES:
- Keep all voice scripts short and simple (3-5 seconds max)
- Avoid lengthy explanations
- Focus on clear, concise communication
- Answer voices should be engaging, educational, and informative
- Use different positive responses followed by the correct answer:
  * Examples: "Chính xác! Vua Hùng là vị vua đầu tiên của Việt Nam", "Tuyệt vời! Năm 1945 là năm Việt Nam giành độc lập", "Rất giỏi! Hà Nội là thủ đô của Việt Nam"
  * Other variations: "Đúng rồi! [correct answer]", "Hoàn hảo! [correct answer]", "Thông minh! [correct answer]", "Tài giỏi! [correct answer]", "Xuất sắc! [correct answer]"
- Always include the correct answer in the voice response to reinforce learning

IMPORTANT DIFFICULTY PROGRESSION:
- Order 1 (Easy): Basic facts, simple events
- Order 2 (Medium): Cause and effect, basic timelines
- Order 3 (Hard): Complex relationships, multiple factors
- Order 4 (Hard): Advanced knowledge, complex relationships
- Order 5 (Very Hard): Expert level, detailed knowledge required

IMPORTANT QUIZ_3 GUIDELINES FOR HISTORY:
- Quiz_3 should ask educational questions about historical events, people, places, or facts RELATED to the main subject
- Make quiz_3 about learning something new about the main subject's characteristics, not just identifying the main subject
- CRITICAL: Quiz_3 options must ALWAYS be in ENGLISH as they represent image filenames
- CRITICAL: Select exactly 4 different historical terms for the options
- CRITICAL: The correct answer position must correspond to a term that actually answers the question
- CRITICAL: NEVER include the main subject historical figure/event in quiz_3 options (e.g., if subject is "hung_king", do NOT include "hung_king" in quiz_3 options)
- CRITICAL: Quiz_3 should ask about characteristics that the main subject historical figure/event has or doesn't have
- EXAMPLE: If main subject is "hung_king" and question is "Ai là vị vua có công lập nước?" then:
  * Options should be: ["le_lai", "quang_trung", "gia_long", "minh_mang"] (4 items)
  * Correct answer should be position 1 (le_lai) or position 2 (quang_trung) since they were founding kings like Hung King
  * Voice should be: "Rất giỏi! Lê Lợi có công lập nước giống như Vua Hùng" or "Rất giỏi! Quang Trung có công lập nước giống như Vua Hùng"
- Adapt questions based on difficulty level:
  * Easy: basic characteristics (role, time period, achievements)
  * Medium: cause and effect, basic timelines, relationships
  * Hard: complex relationships, multiple factors, influences
  * Very Hard: detailed analysis, complex historical contexts, legacies`;

        default:
          return `You are an expert content creator for educational children's videos. Create engaging SK3QLR (Short Kids 3 Question with Lesson and Reward) format content.

IMPORTANT: Return ONLY valid JSON in the exact format specified. Do not include any explanatory text, markdown formatting, or additional content before or after the JSON. The response must start with { and end with }.

CRITICAL: Each content piece must be UNIQUE and DIFFERENT from any previous content for the same subject.

IMPORTANT INTRO GUIDELINES:
- Title: Simple name with order/part, e.g., "Subject P1" (P = Phần/Part)
- Voice: Simple mention of subject and part, e.g., "Subject phần 1"

IMPORTANT VOICE GUIDELINES:
- Keep all voice scripts short and simple (3-5 seconds max)
- Avoid lengthy explanations
- Focus on clear, concise communication
- Answer voices should be engaging, educational, and informative
- Use different positive responses followed by the correct answer
- Always include the correct answer in the voice response to reinforce learning

IMPORTANT DIFFICULTY PROGRESSION:
- Order 1 (Easy): Basic concepts, simple facts
- Order 2 (Medium): Slightly more complex, requires basic knowledge
- Order 3 (Hard): Requires deeper understanding, multiple concepts
- Order 4 (Hard): Advanced knowledge, complex relationships
- Order 5 (Very Hard): Expert level, detailed knowledge required

IMPORTANT QUIZ_3 GUIDELINES:
- Quiz_3 should ask educational questions about concepts, characteristics, or facts RELATED to the main subject
- Make quiz_3 about learning something new about the main subject's characteristics, not just identifying the main subject
- CRITICAL: Quiz_3 options must ALWAYS be in ENGLISH as they represent image filenames
- CRITICAL: Select exactly 4 different terms for the options
- CRITICAL: The correct answer position must correspond to a term that actually answers the question
- CRITICAL: NEVER include the main subject in quiz_3 options (e.g., if subject is "example", do NOT include "example" in quiz_3 options)
- CRITICAL: Quiz_3 should ask about characteristics that the main subject has or doesn't have`;
      }
    };

    const systemPrompt = getTopicSpecificPrompt(topic);

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
      uniquenessInstructions += "\n  * Order 1: \"[Subject Name] Thường\" (e.g., \"Cá sấu Thường\", \"Cây cối Thường\", \"Điện Thường\")";
      uniquenessInstructions += "\n  * Order 2: \"[Subject Name] Hiếm\" (e.g., \"Cá sấu Hiếm\", \"Cây cối Hiếm\", \"Điện Hiếm\")";
      uniquenessInstructions += "\n  * Order 3: \"[Subject Name] Tinh Anh\" (e.g., \"Cá sấu Tinh Anh\", \"Cây cối Tinh Anh\", \"Điện Tinh Anh\")";
      uniquenessInstructions += "\n  * Order 4: \"[Subject Name] Huyền thoại\" (e.g., \"Cá sấu Huyền thoại\", \"Cây cối Huyền thoại\", \"Điện Huyền thoại\")";
      uniquenessInstructions += "\n  * Order 5: \"[Subject Name] Siêu cấp\" (e.g., \"Cá sấu Siêu cấp\", \"Cây cối Siêu cấp\", \"Điện Siêu cấp\")";
      uniquenessInstructions += "\n  * Order 6+: Continue with creative variations like \"Siêu phàm\", \"Thần thánh\", etc.";
      uniquenessInstructions += "\n- IMPORTANT: The reward voice should ONLY contain the reward name, NOT congratulatory text";
    }

    // Topic-specific user prompts and examples
    const getTopicSpecificUserPrompt = (topic: string) => {
      switch (topic) {
        case 'animals':
          return `Create educational content for a children's video about "${prompt}" in ${language} language, topic: ${topic}.${description ? `\n\nAdditional details: ${description}` : ''}${uniquenessInstructions}

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
    "options": ["shark", "eagle", "elephant", "dolphin"], // CRITICAL: Must be ENGLISH image names, NEVER include main subject
    "answer": {
      "position": 1,
      "voice": "Rất giỏi! Cá mập sống dưới nước"
    }
  },
  "lesson": {
    "voice": "Educational lesson voice script"
  },
  "reward": {
    "voice": "Cá sấu Thường"
  }
}

Requirements:
- Make content engaging and educational for children
- Use appropriate vocabulary for the target age group
- Ensure questions are relevant to the topic and subject
- Make answer positions logical and varied
- Keep voice scripts short and simple (3-5 seconds max)
- ANSWER VOICES: Use varied, engaging responses that include the correct answer
  * Examples: "Chính xác! Con cá sấu có 4 chân", "Tuyệt vời! Con sư tử là vua rừng", "Rất giỏi! Con voi là động vật lớn nhất trên cạn"
  * Other variations: "Đúng rồi! [correct answer]", "Hoàn hảo! [correct answer]", "Thông minh! [correct answer]", "Tài giỏi! [correct answer]", "Xuất sắc! [correct answer]"
  * Always include the correct answer in the voice response to reinforce learning
  * Vary the responses across different quizzes to keep it interesting
- CRITICAL: Quiz_3 options must ALWAYS be in ENGLISH as they represent image filenames
- CRITICAL: Select exactly 4 different animal names for the options
- CRITICAL: The correct answer position must correspond to an animal that actually answers the question
- CRITICAL: NEVER include the main subject animal in quiz_3 options (e.g., if subject is "blue_whale", do NOT include "blue_whale" in quiz_3 options)
- CRITICAL: Quiz_3 should ask about characteristics that the main subject animal has or doesn't have
- Quiz_3 should be diverse and educational - ask about characteristics RELATED to the main subject animal
- DIFFICULTY LEVEL: This is Order ${order}, so adjust complexity accordingly:
  * Order 1 (Easy): Basic identification, simple facts, obvious choices
  * Order 2 (Medium): Slightly more complex, requires basic knowledge
  * Order 3 (Hard): Requires deeper understanding, multiple concepts
  * Order 4 (Hard): Advanced knowledge, complex relationships
  * Order 5 (Very Hard): Expert level, detailed knowledge required
- Examples of good quiz_3 questions by difficulty (for blue_whale example):
  * Easy: "Con nào có vây?", "Con nào sống ở biển?", "Con nào có kích thước lớn?"
  * Medium: "Con nào di cư theo mùa?", "Con nào ăn sinh vật nhỏ?", "Con nào có thể lặn sâu?"
  * Hard: "Con nào có hệ thống định vị siêu âm?", "Con nào có khả năng điều chỉnh nhiệt độ?", "Con nào có thể giao tiếp bằng âm thanh?"
  * Very Hard: "Con nào thuộc lớp động vật có vú biển?", "Con nào có hệ thống hô hấp đặc biệt?", "Con nào có khả năng lọc thức ăn?"
- Avoid repetitive identification questions like "Con nào là [subject]?"
- CRITICAL: Quiz_3 must NEVER include the main subject animal in the options
- CRITICAL: Quiz_3 should teach about characteristics RELATED to the main subject animal
- Use appropriate ENGLISH animal names that can be represented by images
- Ensure all content is factually accurate and educational
- CRITICAL: Make this content UNIQUE and DIFFERENT from any previous content for this subject
- REWARD PROGRESSION: The reward voice must follow this exact progression based on order number:
  * Order 1: "[Animal Name] Thường" (e.g., "Cá sấu Thường")
  * Order 2: "[Animal Name] Hiếm" (e.g., "Cá sấu Hiếm") 
  * Order 3: "[Animal Name] Tinh Anh" (e.g., "Cá sấu Tinh Anh")
  * Order 4: "[Animal Name] Huyền thoại" (e.g., "Cá sấu Huyền thoại")
  * Order 5: "[Animal Name] Siêu cấp" (e.g., "Cá sấu Siêu cấp")
  * Order 6+: Continue with creative variations like "Siêu phàm", "Thần thánh", etc.
- IMPORTANT: The reward voice should ONLY contain the reward name, NOT congratulatory text
- INTRO REQUIREMENTS:
  * Title: Simple name with order/part, e.g., "Con cá sấu P1"
  * Voice: Simple mention of subject and part, e.g., "Con cá sấu phần 1"

Language: ${language}
Topic: ${topic}
Subject: ${prompt}
Order: ${order}

CRITICAL: Return ONLY the JSON object. Do not include any other text, explanations, or formatting.`;

        case 'plants':
          return `Create educational content for a children's video about "${prompt}" in ${language} language, topic: ${topic}.${description ? `\n\nAdditional details: ${description}` : ''}${uniquenessInstructions}

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
    "text": "Cây cối P1",
    "voice": "Cây cối phần 1"
  },
  "quiz_1": {
    "question": {
      "text": "Question text",
      "voice": "Voice script for question"
    },
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "answer": {
      "position": 2,
      "voice": "Tuyệt vời! Cây cối cần ánh sáng để quang hợp"
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
      "voice": "Chính xác! Rễ cây hút nước từ đất"
    }
  },
  "quiz_3": {
    "question": {
      "text": "Cây nào cần nhiều nước?",
      "voice": "Hãy chọn cây cần nhiều nước nhé!"
    },
    "options": ["oak", "cactus", "water_lily", "palm"], // CRITICAL: Must be ENGLISH image names
    "answer": {
      "position": 3,
      "voice": "Rất giỏi! Sen nước cần nhiều nước để sống"
    }
  },
  "lesson": {
    "voice": "Educational lesson voice script"
  },
  "reward": {
    "voice": "Cây cối Thường"
  }
}

Requirements:
- Make content engaging and educational for children
- Use appropriate vocabulary for the target age group
- Ensure questions are relevant to the topic and subject
- Make answer positions logical and varied
- Keep voice scripts short and simple (3-5 seconds max)
- ANSWER VOICES: Use varied, engaging responses that include the correct answer
  * Examples: "Chính xác! Cây cối cần ánh sáng để quang hợp", "Tuyệt vời! Hoa hồng có gai để bảo vệ", "Rất giỏi! Rễ cây hút nước từ đất"
  * Other variations: "Đúng rồi! [correct answer]", "Hoàn hảo! [correct answer]", "Thông minh! [correct answer]", "Tài giỏi! [correct answer]", "Xuất sắc! [correct answer]"
  * Always include the correct answer in the voice response to reinforce learning
  * Vary the responses across different quizzes to keep it interesting
- CRITICAL: Quiz_3 options must ALWAYS be in ENGLISH as they represent image filenames
- CRITICAL: Select exactly 4 different plant names for the options
- CRITICAL: The correct answer position must correspond to a plant that actually answers the question
- CRITICAL: NEVER include the main subject plant in quiz_3 options (e.g., if subject is "oak", do NOT include "oak" in quiz_3 options)
- CRITICAL: Quiz_3 should ask about characteristics that the main subject plant has or doesn't have
- Quiz_3 should be diverse and educational - ask about characteristics RELATED to the main subject plant
- DIFFICULTY LEVEL: This is Order ${order}, so adjust complexity accordingly:
  * Order 1 (Easy): Basic identification, simple facts, obvious choices
  * Order 2 (Medium): Slightly more complex, requires basic knowledge
  * Order 3 (Hard): Requires deeper understanding, multiple concepts
  * Order 4 (Hard): Advanced knowledge, complex relationships
  * Order 5 (Very Hard): Expert level, detailed knowledge required
- Examples of good quiz_3 questions by difficulty (for oak example):
  * Easy: "Cây nào có lá rộng?", "Cây nào cao lớn?", "Cây nào có thân gỗ cứng?"
  * Medium: "Cây nào rụng lá vào mùa thu?", "Cây nào có quả hạt cứng?", "Cây nào sống lâu năm?"
  * Hard: "Cây nào có hệ thống rễ sâu?", "Cây nào có thể chịu hạn tốt?", "Cây nào có vỏ cây dày?"
  * Very Hard: "Cây nào thuộc họ cây sồi?", "Cây nào có hệ thống quang hợp hiệu quả?", "Cây nào có thể sống hàng trăm năm?"
- Avoid repetitive identification questions like "Cây nào là [subject]?"
- CRITICAL: Quiz_3 must NEVER include the main subject plant in the options
- CRITICAL: Quiz_3 should teach about characteristics RELATED to the main subject plant
- Use appropriate ENGLISH plant names that can be represented by images
- Ensure all content is factually accurate and educational
- CRITICAL: Make this content UNIQUE and DIFFERENT from any previous content for this subject
- REWARD PROGRESSION: The reward voice must follow this exact progression based on order number:
  * Order 1: "[Plant Name] Thường" (e.g., "Cây cối Thường")
  * Order 2: "[Plant Name] Hiếm" (e.g., "Cây cối Hiếm") 
  * Order 3: "[Plant Name] Tinh Anh" (e.g., "Cây cối Tinh Anh")
  * Order 4: "[Plant Name] Huyền thoại" (e.g., "Cây cối Huyền thoại")
  * Order 5: "[Plant Name] Siêu cấp" (e.g., "Cây cối Siêu cấp")
  * Order 6+: Continue with creative variations like "Siêu phàm", "Thần thánh", etc.
- IMPORTANT: The reward voice should ONLY contain the reward name, NOT congratulatory text
- INTRO REQUIREMENTS:
  * Title: Simple name with order/part, e.g., "Cây cối P1"
  * Voice: Simple mention of subject and part, e.g., "Cây cối phần 1"

Language: ${language}
Topic: ${topic}
Subject: ${prompt}
Order: ${order}

CRITICAL: Return ONLY the JSON object. Do not include any other text, explanations, or formatting.`;

        case 'science':
          return `Create educational content for a children's video about "${prompt}" in ${language} language, topic: ${topic}.${description ? `\n\nAdditional details: ${description}` : ''}${uniquenessInstructions}

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
    "text": "Điện P1",
    "voice": "Điện phần 1"
  },
  "quiz_1": {
    "question": {
      "text": "Question text",
      "voice": "Voice script for question"
    },
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "answer": {
      "position": 2,
      "voice": "Tuyệt vời! Điện là năng lượng giúp đèn sáng"
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
      "voice": "Chính xác! Điện có thể nguy hiểm nếu không cẩn thận"
    }
  },
  "quiz_3": {
    "question": {
      "text": "Chất nào tan trong nước?",
      "voice": "Hãy chọn chất tan trong nước nhé!"
    },
    "options": ["salt", "oil", "sugar", "sand"], // CRITICAL: Must be ENGLISH image names
    "answer": {
      "position": 1,
      "voice": "Rất giỏi! Muối tan trong nước"
    }
  },
  "lesson": {
    "voice": "Educational lesson voice script"
  },
  "reward": {
    "voice": "Điện Thường"
  }
}

Requirements:
- Make content engaging and educational for children
- Use appropriate vocabulary for the target age group
- Ensure questions are relevant to the topic and subject
- Make answer positions logical and varied
- Keep voice scripts short and simple (3-5 seconds max)
- ANSWER VOICES: Use varied, engaging responses that include the correct answer
  * Examples: "Chính xác! Điện là năng lượng giúp đèn sáng", "Tuyệt vời! Ma sát giúp ta đi lại không bị trượt", "Rất giỏi! Ánh sáng truyền theo đường thẳng"
  * Other variations: "Đúng rồi! [correct answer]", "Hoàn hảo! [correct answer]", "Thông minh! [correct answer]", "Tài giỏi! [correct answer]", "Xuất sắc! [correct answer]"
  * Always include the correct answer in the voice response to reinforce learning
  * Vary the responses across different quizzes to keep it interesting
- CRITICAL: Quiz_3 options must ALWAYS be in ENGLISH as they represent image filenames
- CRITICAL: Select exactly 4 different scientific terms for the options
- CRITICAL: The correct answer position must correspond to a term that actually answers the question
- CRITICAL: NEVER include the main subject concept in quiz_3 options (e.g., if subject is "electricity", do NOT include "electricity" in quiz_3 options)
- CRITICAL: Quiz_3 should ask about properties that the main subject concept has or doesn't have
- Quiz_3 should be diverse and educational - ask about properties RELATED to the main subject concept
- DIFFICULTY LEVEL: This is Order ${order}, so adjust complexity accordingly:
  * Order 1 (Easy): Basic concepts, simple experiments
  * Order 2 (Medium): Cause and effect, basic principles
  * Order 3 (Hard): Complex interactions, multiple variables
  * Order 4 (Hard): Advanced knowledge, complex relationships
  * Order 5 (Very Hard): Expert level, detailed knowledge required
- Examples of good quiz_3 questions by difficulty (for electricity example):
  * Easy: "Chất nào dẫn điện?", "Vật nào có thể tạo ra ánh sáng?", "Chất nào có thể chuyển động?"
  * Medium: "Chất nào có thể lưu trữ năng lượng?", "Vật nào có thể tạo ra nhiệt?", "Hiện tượng nào liên quan đến dòng chảy?"
  * Hard: "Chất nào có thể thay đổi trạng thái khi có dòng điện?", "Vật nào có khả năng cảm ứng điện từ?", "Hiện tượng nào liên quan đến điện trở?"
  * Very Hard: "Chất nào có cấu trúc phân tử cho phép dẫn điện tốt?", "Vật nào có khả năng siêu dẫn ở nhiệt độ thấp?", "Hiện tượng nào liên quan đến điện từ học?"
- Avoid repetitive identification questions like "Chất nào là [subject]?"
- CRITICAL: Quiz_3 must NEVER include the main subject concept in the options
- CRITICAL: Quiz_3 should teach about properties RELATED to the main subject concept
- Use appropriate ENGLISH scientific terms that can be represented by images
- Ensure all content is factually accurate and educational
- CRITICAL: Make this content UNIQUE and DIFFERENT from any previous content for this subject
- REWARD PROGRESSION: The reward voice must follow this exact progression based on order number:
  * Order 1: "[Science Name] Thường" (e.g., "Điện Thường")
  * Order 2: "[Science Name] Hiếm" (e.g., "Điện Hiếm") 
  * Order 3: "[Science Name] Tinh Anh" (e.g., "Điện Tinh Anh")
  * Order 4: "[Science Name] Huyền thoại" (e.g., "Điện Huyền thoại")
  * Order 5: "[Science Name] Siêu cấp" (e.g., "Điện Siêu cấp")
  * Order 6+: Continue with creative variations like "Siêu phàm", "Thần thánh", etc.
- IMPORTANT: The reward voice should ONLY contain the reward name, NOT congratulatory text
- INTRO REQUIREMENTS:
  * Title: Simple name with order/part, e.g., "Điện P1"
  * Voice: Simple mention of subject and part, e.g., "Điện phần 1"

Language: ${language}
Topic: ${topic}
Subject: ${prompt}
Order: ${order}

CRITICAL: Return ONLY the JSON object. Do not include any other text, explanations, or formatting.`;

        case 'history':
          return `Create educational content for a children's video about "${prompt}" in ${language} language, topic: ${topic}.${description ? `\n\nAdditional details: ${description}` : ''}${uniquenessInstructions}

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
    "text": "Lịch sử P1",
    "voice": "Lịch sử phần 1"
  },
  "quiz_1": {
    "question": {
      "text": "Question text",
      "voice": "Voice script for question"
    },
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "answer": {
      "position": 2,
      "voice": "Tuyệt vời! Vua Hùng là vị vua đầu tiên của Việt Nam"
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
      "voice": "Chính xác! Năm 1945 là năm Việt Nam giành độc lập"
    }
  },
  "quiz_3": {
    "question": {
      "text": "Ai là vị vua đầu tiên?",
      "voice": "Hãy chọn vị vua đầu tiên nhé!"
    },
    "options": ["hung_king", "le_lai", "quang_trung", "gia_long"], // CRITICAL: Must be ENGLISH image names
    "answer": {
      "position": 1,
      "voice": "Rất giỏi! Vua Hùng là vị vua đầu tiên của Việt Nam"
    }
  },
  "lesson": {
    "voice": "Educational lesson voice script"
  },
  "reward": {
    "voice": "Lịch sử Thường"
  }
}

Requirements:
- Make content engaging and educational for children
- Use appropriate vocabulary for the target age group
- Ensure questions are relevant to the topic and subject
- Make answer positions logical and varied
- Keep voice scripts short and simple (3-5 seconds max)
- ANSWER VOICES: Use varied, engaging responses that include the correct answer
  * Examples: "Chính xác! Vua Hùng là vị vua đầu tiên của Việt Nam", "Tuyệt vời! Năm 1945 là năm Việt Nam giành độc lập", "Rất giỏi! Hà Nội là thủ đô của Việt Nam"
  * Other variations: "Đúng rồi! [correct answer]", "Hoàn hảo! [correct answer]", "Thông minh! [correct answer]", "Tài giỏi! [correct answer]", "Xuất sắc! [correct answer]"
  * Always include the correct answer in the voice response to reinforce learning
  * Vary the responses across different quizzes to keep it interesting
- CRITICAL: Quiz_3 options must ALWAYS be in ENGLISH as they represent image filenames
- CRITICAL: Select exactly 4 different historical terms for the options
- CRITICAL: The correct answer position must correspond to a term that actually answers the question
- CRITICAL: NEVER include the main subject historical figure/event in quiz_3 options (e.g., if subject is "hung_king", do NOT include "hung_king" in quiz_3 options)
- CRITICAL: Quiz_3 should ask about characteristics that the main subject historical figure/event has or doesn't have
- Quiz_3 should be diverse and educational - ask about characteristics RELATED to the main subject historical figure/event
- DIFFICULTY LEVEL: This is Order ${order}, so adjust complexity accordingly:
  * Order 1 (Easy): Basic facts, simple events
  * Order 2 (Medium): Cause and effect, basic timelines
  * Order 3 (Hard): Complex relationships, multiple factors
  * Order 4 (Hard): Advanced knowledge, complex relationships
  * Order 5 (Very Hard): Expert level, detailed knowledge required
- Examples of good quiz_3 questions by difficulty (for hung_king example):
  * Easy: "Ai là vị vua có công lập nước?", "Ai là người lãnh đạo đầu tiên?", "Ai là người có công thống nhất?"
  * Medium: "Ai là người phát minh ra nông nghiệp?", "Ai là người lập ra triều đại đầu tiên?", "Ai là người có công mở mang bờ cõi?"
  * Hard: "Ai là người đầu tiên thiết lập hệ thống cai trị?", "Ai là người có công phát triển văn hóa?", "Ai là người lập ra nền tảng cho quốc gia?"
  * Very Hard: "Ai là người thiết lập hệ thống phân cấp xã hội đầu tiên?", "Ai là người có công phát triển hệ thống thủy lợi?", "Ai là người lập ra nền tảng cho nền văn minh?"
- Avoid repetitive identification questions like "Ai là [subject]?"
- CRITICAL: Quiz_3 must NEVER include the main subject historical figure/event in the options
- CRITICAL: Quiz_3 should teach about characteristics RELATED to the main subject historical figure/event
- Use appropriate ENGLISH historical terms that can be represented by images
- Ensure all content is factually accurate and educational
- CRITICAL: Make this content UNIQUE and DIFFERENT from any previous content for this subject
- REWARD PROGRESSION: The reward voice must follow this exact progression based on order number:
  * Order 1: "[History Name] Thường" (e.g., "Lịch sử Thường")
  * Order 2: "[History Name] Hiếm" (e.g., "Lịch sử Hiếm") 
  * Order 3: "[History Name] Tinh Anh" (e.g., "Lịch sử Tinh Anh")
  * Order 4: "[History Name] Huyền thoại" (e.g., "Lịch sử Huyền thoại")
  * Order 5: "[History Name] Siêu cấp" (e.g., "Lịch sử Siêu cấp")
  * Order 6+: Continue with creative variations like "Siêu phàm", "Thần thánh", etc.
- IMPORTANT: The reward voice should ONLY contain the reward name, NOT congratulatory text
- INTRO REQUIREMENTS:
  * Title: Simple name with order/part, e.g., "Lịch sử P1"
  * Voice: Simple mention of subject and part, e.g., "Lịch sử phần 1"

Language: ${language}
Topic: ${topic}
Subject: ${prompt}
Order: ${order}

CRITICAL: Return ONLY the JSON object. Do not include any other text, explanations, or formatting.`;

        default:
          return `Create educational content for a children's video about "${prompt}" in ${language} language, topic: ${topic}.${description ? `\n\nAdditional details: ${description}` : ''}${uniquenessInstructions}

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
    "text": "Subject P1",
    "voice": "Subject phần 1"
  },
  "quiz_1": {
    "question": {
      "text": "Question text",
      "voice": "Voice script for question"
    },
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "answer": {
      "position": 2,
      "voice": "Tuyệt vời! Correct answer"
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
      "voice": "Chính xác! Correct answer"
    }
  },
  "quiz_3": {
    "question": {
      "text": "Question about available inputs?",
      "voice": "Hãy chọn đáp án đúng nhé!"
    },
    "options": ["option1", "option2", "option3", "option4"], // CRITICAL: Must be ENGLISH image names
    "answer": {
      "position": 1,
      "voice": "Rất giỏi! Correct answer"
    }
  },
  "lesson": {
    "voice": "Educational lesson voice script"
  },
  "reward": {
    "voice": "Subject Thường"
  }
}

Requirements:
- Make content engaging and educational for children
- Use appropriate vocabulary for the target age group
- Ensure questions are relevant to the topic and subject
- Make answer positions logical and varied
- Keep voice scripts short and simple (3-5 seconds max)
- ANSWER VOICES: Use varied, engaging responses that include the correct answer
- CRITICAL: Quiz_3 options must ALWAYS be in ENGLISH as they represent image filenames
- CRITICAL: Select exactly 4 different terms for the options
- CRITICAL: The correct answer position must correspond to a term that actually answers the question
- CRITICAL: NEVER include the main subject in quiz_3 options (e.g., if subject is "example", do NOT include "example" in quiz_3 options)
- CRITICAL: Quiz_3 should ask about characteristics that the main subject has or doesn't have
- Quiz_3 should be diverse and educational - ask about characteristics RELATED to the main subject
- DIFFICULTY LEVEL: This is Order ${order}, so adjust complexity accordingly:
  * Order 1 (Easy): Basic concepts, simple facts
  * Order 2 (Medium): Slightly more complex, requires basic knowledge
  * Order 3 (Hard): Requires deeper understanding, multiple concepts
  * Order 4 (Hard): Advanced knowledge, complex relationships
  * Order 5 (Very Hard): Expert level, detailed knowledge required
- Avoid repetitive identification questions
- CRITICAL: Quiz_3 must NEVER include the main subject in the options
- CRITICAL: Quiz_3 should teach about characteristics RELATED to the main subject
- Use appropriate ENGLISH terms that can be represented by images
- Ensure all content is factually accurate and educational
- CRITICAL: Make this content UNIQUE and DIFFERENT from any previous content for this subject
- REWARD PROGRESSION: The reward voice must follow this exact progression based on order number:
  * Order 1: "[Subject Name] Thường"
  * Order 2: "[Subject Name] Hiếm"
  * Order 3: "[Subject Name] Tinh Anh"
  * Order 4: "[Subject Name] Huyền thoại"
  * Order 5: "[Subject Name] Siêu cấp"
  * Order 6+: Continue with creative variations like "Siêu phàm", "Thần thánh", etc.
- IMPORTANT: The reward voice should ONLY contain the reward name, NOT congratulatory text
- INTRO REQUIREMENTS:
  * Title: Simple name with order/part, e.g., "Subject P1"
  * Voice: Simple mention of subject and part, e.g., "Subject phần 1"

Language: ${language}
Topic: ${topic}
Subject: ${prompt}
Order: ${order}

CRITICAL: Return ONLY the JSON object. Do not include any other text, explanations, or formatting.`;
      }
    };

    const userPrompt = getTopicSpecificUserPrompt(topic);

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