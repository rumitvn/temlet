import { RenderItem } from "@prisma/client";
import { TemplateAeAsset } from "../types/render";
import { config, normalizePath } from "../../lib/config";

export const generateAssets = (renderItem: RenderItem, channel: string = "minimate", topic: string = "animals"): TemplateAeAsset[] => {
  const { templateAeRenderFormat, jsonContent } = renderItem;
  const content = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
  
  // Normalize the output folder path
  const outputFolder = normalizePath(renderItem.renderOutputFolder || '');
  
  // Helper functions for generating paths
  const getAudioPath = (key: string, order: number) => 
    normalizePath(`${outputFolder}/audio/${key}_${order}.mp3`);
  
  const getImagePath = (key: string, order: number) => 
    normalizePath(`${outputFolder}/images/${key}_${order}.jpg`);
  
  const getVideoPath = (key: string, order: number) => 
    normalizePath(`${outputFolder}/videos/${key}_${order}.mp4`);

  // Get key and order from data
  const key = content.key || "unknown_key";
  const order = content.order || 1;
  const keyOrder = `${key}_${order}`;

  // Helper functions for building paths using configuration with parameters
  const voicePath = (layer: string) =>
    config.getAssetFileUrl(config.buildAssetPath("voice", channel, topic, `${keyOrder}/${layer}.mp3`));

  const imagePath = (name: string) =>
    config.getAssetFileUrl(config.buildAssetPath("image", channel, topic, `${name}_${order}.jpg`));

  const quiz3ImagePath = (name: string) =>
    config.getAssetFileUrl(config.buildAssetPath("image", channel, topic, `options/${name}.jpg`));

  const videoPath = (name: string) =>
    config.getAssetFileUrl(config.buildAssetPath("video", channel, topic, `${name}_${order}.mp4`));

  // Extract quiz data
  const intro = content.intro || {};
  const quiz1 = content.quiz_1 || {};
  const quiz2 = content.quiz_2 || {};
  const quiz3 = content.quiz_3 || {};
  const lesson = content.lesson || {};
  const reward = content.reward || {};

  // Generate assets array based on template format
  const assets: TemplateAeAsset[] = [
    // Intro
    {
      type: "data",
      layerName: "intro_title",
      property: "Source Text",
      value: intro.text || "",
    },
    {
      type: "audio",
      layerName: "voice_title",
      src: voicePath("voice_title"),
    },
    {
      type: "image",
      layerName: "intro_image",
      src: imagePath(key),
    },
    {
      type: "image",
      layerName: "quiz_1_header_image",
      src: imagePath(key),
    },
    {
      type: "image",
      layerName: "quiz_2_header_image",
      src: imagePath(key),
    },

    // Quiz 1
    {
      type: "data",
      layerName: "quiz_1_question_title",
      property: "Source Text",
      value: quiz1.question?.text || "",
    },
    {
      type: "audio",
      layerName: "voice_q1_title",
      src: voicePath("voice_q1_title"),
    },
    {
      type: "data",
      layerName: "quiz_1_ans_1_title",
      property: "Source Text",
      value: quiz1.options?.[0] || "",
    },
    {
      type: "data",
      layerName: "quiz_1_ans_2_title",
      property: "Source Text",
      value: quiz1.options?.[1] || "",
    },
    {
      type: "data",
      layerName: "quiz_1_ans_3_title",
      property: "Source Text",
      value: quiz1.options?.[2] || "",
    },
    {
      type: "data",
      layerName: "quiz_1_ans_4_title",
      property: "Source Text",
      value: quiz1.options?.[3] || "",
    },
    {
      type: "audio",
      layerName: "voice_q1_ans",
      src: voicePath("voice_q1_ans"),
    },
    {
      type: "data",
      layerName: "quiz_1_controller",
      property: "Effects.Right Answer.Menu",
      value: quiz1.answer?.position?.toString() || "1",
    },

    // Quiz 2
    {
      type: "data",
      layerName: "quiz_2_question_title",
      property: "Source Text",
      value: quiz2.question?.text || "",
    },
    {
      type: "audio",
      layerName: "voice_q2_title",
      src: voicePath("voice_q2_title"),
    },
    {
      type: "data",
      layerName: "quiz_2_ans_1_title",
      property: "Source Text",
      value: quiz2.options?.[0] || "",
    },
    {
      type: "data",
      layerName: "quiz_2_ans_2_title",
      property: "Source Text",
      value: quiz2.options?.[1] || "",
    },
    {
      type: "audio",
      layerName: "voice_q2_ans",
      src: voicePath("voice_q2_ans"),
    },
    {
      type: "data",
      layerName: "quiz_2_controller",
      property: "Effects.Right Answer.Menu",
      value: quiz2.answer?.position?.toString() || "1",
    },

    // Quiz 3
    {
      type: "data",
      layerName: "quiz_3_question_title",
      property: "Source Text",
      value: quiz3.question?.text || "",
    },
    {
      type: "audio",
      layerName: "voice_q3_title",
      src: voicePath("voice_q3_title"),
    },
    {
      type: "image",
      layerName: "quiz_3_ans_1_image",
      src: quiz3ImagePath(quiz3.options?.[0] || "shark"),
    },
    {
      type: "image",
      layerName: "quiz_3_ans_2_image",
      src: quiz3ImagePath(quiz3.options?.[1] || "lion"),
    },
    {
      type: "image",
      layerName: "quiz_3_ans_3_image",
      src: quiz3ImagePath(quiz3.options?.[2] || "hippo"),
    },
    {
      type: "image",
      layerName: "quiz_3_ans_4_image",
      src: quiz3ImagePath(quiz3.options?.[3] || "rabbit"),
    },
    {
      type: "audio",
      layerName: "voice_q3_ans",
      src: voicePath("voice_q3_ans"),
    },
    {
      type: "data",
      layerName: "quiz_3_controller",
      property: "Effects.Right Answer.Menu",
      value: quiz3.answer?.position?.toString() || "1",
    },

    // Lesson + Reward
    {
      type: "video",
      layerName: "lesson_video",
      src: videoPath(key),
    },
    {
      type: "audio",
      layerName: "voice_lesson",
      src: voicePath("voice_lesson"),
    },
    {
      type: "video",
      layerName: "reward_video",
      src: config.getAssetFileUrl(config.buildAssetPath("reward", channel, topic, `output/reward_${order}/${key}.mp4`)),
    },
    {
      type: "audio",
      layerName: "voice_reward",
      src: voicePath("voice_reward"),
    },
  ];

  return assets;
}

export async function checkRenderStatus(uid: string) {
  try {
    console.log('Checking render status for UID:', uid);
    const response = await fetch(`http://localhost:3000/api/v1/jobs/${uid}`, {
      headers: {
        'nexrender-secret': 'myapisecret'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to check render status: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Nexrender response:', data);
    return data;
  } catch (error) {
    console.error('Error checking render status:', error);
    throw error;
  }
} 