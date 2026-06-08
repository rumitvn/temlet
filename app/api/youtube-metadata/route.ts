import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Lazily create the OpenAI client so the module can be imported during build
// without the API key. The key is only required when OpenAI is actually used.
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
}

// Grok API configuration
const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const GROK_API_KEY = process.env.GROK_API_KEY;

// Language configuration for different languages
function getLanguageConfig(language: string, order: number) {
  const configs = {
    vietnamese: {
      name: "Vietnamese",
      writePrompt: "Hãy viết tiêu đề, mô tả và danh sách hashtag cho video giáo dục thiếu nhi dạng YouTube Shorts dựa theo JSON dữ liệu sau",
      requirements: "Yêu cầu",
      titleFormat: `Tiêu đề theo mẫu: [câu hỏi chính] (Phần ${order}) | Pikoro 🦜 – MiniMate #shorts #minimate #pikoro`,
      descriptionFormat: "Mô tả hấp dẫn, mô tả nội dung 3 câu hỏi trong video",
      tagsFormat: "Hashtag liên quan tới giáo dục trẻ em, động vật, minimate, pikoro, #shorts",
      jsonFormat: "Trả đúng định dạng JSON như hướng dẫn",
      exampleContent: "Nội dung mẫu như sau",
      titleLabel: "Tiêu đề",
      titleLimit: "phải ít hơn 100 ký tự",
      titleExample: "Cá Sấu Sống Ở Đâu? (Phần 1) | Pikoro 🦜 #shorts #minimate #pikoro",
      descriptionLabel: "Mô tả",
      descriptionExample: `🎉 Bạn đã sẵn sàng khám phá thế giới động vật cùng Pikoro chưa? 🦜✨ Hôm nay, chúng ta sẽ tìm hiểu về CÁ SẤU – loài bò sát đáng sợ sống gần nước! 🐊

🎯 Cùng thử thách trí nhớ và đoán xem:
🔹 Cá sấu thường sống ở đâu? 🌊🏝️
🔹 Cá sấu ăn gì để sinh tồn? 🍖🐟
🔹 Loài nào cũng sống gần nước như cá sấu? 🦛💦

💡 Cá sấu sống ở sông và đầm lầy, ăn thịt. Chúng là loài bò sát mạnh mẽ và nguy hiểm trong tự nhiên! Hãy cùng Pikoro khám phá thêm nào! 🚀✨

📌 Nhấn Đăng Ký ngay để không bỏ lỡ những câu đố vui tiếp theo nhé! 🦊🐬
📌 Đây mới chỉ là Phần 1! Đón xem Phần 2 để tìm hiểu thêm về Cá Sấu nhé! 🎥🐊`,
      tagsLabel: "Tags",
      tagsExample: "#CáSấu,#Alligator,#ĐộngVậtNước,#HọcCùngBé,#MiniMate,#Pikoro,#ĐốVuiĐộngVật,#ThếGiớiĐộngVật,#ĐầmLầy,#HọcVui,#GiáoDụcTrẻEm,#HọcVềĐộngVật,#ĐộngVậtBòSát,#KhámPháThiênNhiên,#VideoGiáoDục,#shorts,#kidslearning,#reptiles,#swampanimals"
    },
    english: {
      name: "English",
      writePrompt: "Write title, description, and hashtag list for educational children's YouTube Shorts video based on the following JSON data",
      requirements: "Requirements",
      titleFormat: `Title format: [main question] (Part ${order}) | Pikoro 🦜 – MiniMate #shorts #minimate #pikoro`,
      descriptionFormat: "Engaging description describing the 3 questions in the video",
      tagsFormat: "Hashtags related to children's education, animals, minimate, pikoro, #shorts",
      jsonFormat: "Return exact JSON format as instructed",
      exampleContent: "Example content:",
      titleLabel: "Title",
      titleLimit: "must be less than 100 characters",
      titleExample: "Where Do Alligators Live? (Part 1) | Pikoro 🦜 #shorts #minimate #pikoro",
      descriptionLabel: "Description",
      descriptionExample: `🎉 Are you ready to explore the animal world with Pikoro? 🦜✨ Today, we'll learn about ALLIGATORS – the scary reptiles that live near water! 🐊

🎯 Let's test your memory and guess:
🔹 Where do alligators usually live? 🌊🏝️
🔹 What do alligators eat to survive? 🍖🐟
🔹 Which animal also lives near water like alligators? 🦛💦

💡 Alligators live in rivers and swamps, eating meat. They are powerful and dangerous reptiles in nature! Let's explore more with Pikoro! 🚀✨

📌 Subscribe now to not miss the next fun quizzes! 🦊🐬
📌 This is only Part 1! Watch Part 2 to learn more about Alligators! 🎥🐊`,
      tagsLabel: "Tags",
      tagsExample: "#Alligator,#Reptiles,#WaterAnimals,#KidsLearning,#MiniMate,#Pikoro,#FunQuiz,#AnimalWorld,#Swamp,#FunLearning,#ChildrenEducation,#LearnAnimals,#Reptiles,#NatureExploration,#EducationalVideo,#shorts,#kidslearning,#reptiles,#swampanimals"
    },
    spanish: {
      name: "Spanish",
      writePrompt: "Escribe título, descripción y lista de hashtags para video educativo infantil de YouTube Shorts basado en los siguientes datos JSON",
      requirements: "Requisitos",
      titleFormat: `Formato de título: [pregunta principal] (Parte ${order}) | Pikoro 🦜 – MiniMate #shorts #minimate #pikoro`,
      descriptionFormat: "Descripción atractiva describiendo las 3 preguntas en el video",
      tagsFormat: "Hashtags relacionados con educación infantil, animales, minimate, pikoro, #shorts",
      jsonFormat: "Devolver formato JSON exacto como se indica",
      exampleContent: "Contenido de ejemplo:",
      titleLabel: "Título",
      titleLimit: "debe tener menos de 100 caracteres",
      titleExample: "¿Dónde Viven los Cocodrilos? (Parte 1) | Pikoro 🦜 #shorts #minimate #pikoro",
      descriptionLabel: "Descripción",
      descriptionExample: `🎉 ¿Estás listo para explorar el mundo animal con Pikoro? 🦜✨ ¡Hoy aprenderemos sobre los COCODRILOS – los reptiles aterradores que viven cerca del agua! 🐊

🎯 Pongamos a prueba tu memoria y adivina:
🔹 ¿Dónde viven normalmente los cocodrilos? 🌊🏝️
🔹 ¿Qué comen los cocodrilos para sobrevivir? 🍖🐟
🔹 ¿Qué animal también vive cerca del agua como los cocodrilos? 🦛💦

💡 ¡Los cocodrilos viven en ríos y pantanos, comiendo carne. ¡Son reptiles poderosos y peligrosos en la naturaleza! ¡Exploremos más con Pikoro! 🚀✨

📌 ¡Suscríbete ahora para no perderte los próximos cuestionarios divertidos! 🦊🐬
📌 ¡Esto es solo la Parte 1! ¡Mira la Parte 2 para aprender más sobre los Cocodrilos! 🎥🐊`,
      tagsLabel: "Etiquetas",
      tagsExample: "#Cocodrilo,#Reptiles,#AnimalesAcuaticos,#AprendizajeInfantil,#MiniMate,#Pikoro,#QuizDivertido,#MundoAnimal,#Pantano,#AprendizajeDivertido,#EducacionInfantil,#AprenderAnimales,#Reptiles,#ExploracionNaturaleza,#VideoEducativo,#shorts,#aprendizajeinfantil,#reptiles,#animalesacuaticos"
    }
  };

  return configs[language as keyof typeof configs] || configs.vietnamese;
}

export async function POST(req: NextRequest) {
  try {
    const { json, provider = "grok", language = "vietnamese" } = await req.json();

    const order = json?.order || 1;
    const key = json?.key || "unknown";
    const subject = key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    // Determine language-specific prompts
    const languageConfig = getLanguageConfig(language, order);
    
    const systemPrompt = `You are a ${languageConfig.name} YouTube content writer specialized in creating engaging educational short-form videos for children. Always output JSON only in the following format: {"title": "...", "description": "...", "tags": "..."}`;

    const userPrompt = `${languageConfig.writePrompt}:\n\n${JSON.stringify(json, null, 2)}\n\n${languageConfig.requirements}:\n- ${languageConfig.titleFormat}\n- ${languageConfig.descriptionFormat}\n- ${languageConfig.tagsFormat}\n- ${languageConfig.jsonFormat}

${languageConfig.exampleContent}:
1. ${languageConfig.titleLabel} (title, ${languageConfig.titleLimit}): ${languageConfig.titleExample}
2. ${languageConfig.descriptionLabel} (description):
${languageConfig.descriptionExample}
3. ${languageConfig.tagsLabel} (tags):
${languageConfig.tagsExample}`;

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
          max_tokens: 1000,
        }),
      });

      if (!grokResponse.ok) {
        throw new Error(`Grok API error: ${grokResponse.status}`);
      }

      const grokData = await grokResponse.json();
      content = grokData.choices[0].message.content || "";
    } else {
      // Use OpenAI (default)
      const openai = getOpenAIClient();
      const chat = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ]
      });

      content = chat.choices[0].message.content || "";
    }

    console.log('Output Content: ', content);
    const parsed = JSON.parse(content);

    return NextResponse.json({
      title: parsed.title,
      description: parsed.description,
      tags: parsed.tags
    });
  } catch (err: any) {
    console.error("Metadata error:", err);
    return NextResponse.json({ error: "Failed to generate metadata" }, { status: 500 });
  }
}
