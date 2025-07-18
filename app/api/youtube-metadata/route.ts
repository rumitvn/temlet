import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Grok API configuration
const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const GROK_API_KEY = process.env.GROK_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { json, provider = "grok" } = await req.json();

    const order = json?.order || 1;

    const systemPrompt =
      "You are a Vietnamese YouTube content writer specialized in creating engaging educational short-form videos for children. Always output JSON only in the following format: {\"title\": \"...\", \"description\": \"...\", \"tags\": \"...\"}";

    const userPrompt = `Hãy viết tiêu đề, mô tả và danh sách hashtag cho video giáo dục thiếu nhi dạng YouTube Shorts dựa theo JSON dữ liệu sau:\n\n${JSON.stringify(json, null, 2)}\n\nYêu cầu:\n- Tiêu đề theo mẫu: [câu hỏi chính] (Phần ${order}) | Pikoro 🦜 – MiniMate #shorts #minimate #pikoro\n- Mô tả hấp dẫn, mô tả nội dung 3 câu hỏi trong video\n- Hashtag liên quan tới giáo dục trẻ em, động vật, minimate, pikoro, #shorts\n- Trả đúng định dạng JSON như hướng dẫn
    Nội dung mẫu như sau:
    1. Tiêu đề (title, phải ít hơn 100 ký tự): Cá Sấu Sống Ở Đâu? (Phần 1) | Pikoro 🦜 #shorts #minimate #pikoro
    2. Mô tả (description):
🎉 Bạn đã sẵn sàng khám phá thế giới động vật cùng Pikoro chưa? 🦜✨ Hôm nay, chúng ta sẽ tìm hiểu về CÁ SẤU – loài bò sát đáng sợ sống gần nước! 🐊

🎯 Cùng thử thách trí nhớ và đoán xem:
🔹 Cá sấu thường sống ở đâu? 🌊🏝️
🔹 Cá sấu ăn gì để sinh tồn? 🍖🐟
🔹 Loài nào cũng sống gần nước như cá sấu? 🦛💦

💡 Cá sấu sống ở sông và đầm lầy, ăn thịt. Chúng là loài bò sát mạnh mẽ và nguy hiểm trong tự nhiên! Hãy cùng Pikoro khám phá thêm nào! 🚀✨

📌 Nhấn Đăng Ký ngay để không bỏ lỡ những câu đố vui tiếp theo nhé! 🦊🐬
📌 Đây mới chỉ là Phần 1! Đón xem Phần 2 để tìm hiểu thêm về Cá Sấu nhé! 🎥🐊
    3. Tags (tags):
    #CáSấu,#Alligator,#ĐộngVậtNước,#HọcCùngBé,#MiniMate,#Pikoro,#ĐốVuiĐộngVật,#ThếGiớiĐộngVật,#ĐầmLầy,#HọcVui,#GiáoDụcTrẻEm,#HọcVềĐộngVật,#ĐộngVậtBòSát,#KhámPháThiênNhiên,#VideoGiáoDục,#shorts,#kidslearning,#reptiles,#swampanimals

    `;

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
