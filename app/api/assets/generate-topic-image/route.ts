import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import OpenAI from "openai";
import { config } from "../../../../lib/config";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Grok client
const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

interface GenerateTopicImageRequest {
  subject: string;
  topic: 'animals' | 'plants' | 'science' | 'history' | 'histories';
  model?: 'openai' | 'grok';
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  channel?: string;
  topicParam?: string;
  isQuiz3Option?: boolean;
}

// Helper function to generate topic-specific prompts
function generateTopicPrompt(subject: string, topic: string, size?: string): string {
  const baseSubject = subject.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  
  // Map 'histories' to 'history' for prompt generation
  const normalizedTopic = topic === 'histories' ? 'history' : topic;
  
  // Size requirements for better educational visibility
  const sizeRequirement = size ? ` The image should be generated at ${size} resolution for optimal quality.` : '';
  const zoomRequirement = " The image should show the complete subject from a medium distance - not too close up, so learners can see the full object clearly. Avoid extreme close-ups that would make it difficult to identify the subject.";
  
  switch (normalizedTopic) {
    case 'animals':
      return `A realistic, high-quality photograph of a ${baseSubject} in its natural habitat.${sizeRequirement}${zoomRequirement} The image should be clear, detailed, and suitable for educational content. The ${baseSubject} should be the main focus of the image, well-lit, and in a natural pose showing the full body. Background should be appropriate to the animal's environment - forest, ocean, desert, etc. The image should be professional quality suitable for children's educational videos.`;
    
    case 'plants':
      return `A beautiful, high-quality photograph of ${baseSubject} in its natural environment.${sizeRequirement}${zoomRequirement} The image should showcase the plant's unique characteristics, leaves, flowers, or structure clearly. The lighting should be natural and bright, highlighting the plant's natural colors and textures. The background should be appropriate - garden, forest, field, etc. The image should be professional quality suitable for children's educational videos.`;
    
    case 'science':
      return `A clear, educational illustration or photograph that demonstrates the concept of ${baseSubject}.${sizeRequirement}${zoomRequirement} The image should be scientifically accurate and visually engaging. It could show experiments, diagrams, natural phenomena, or scientific principles in action. The image should be bright, colorful, and easy to understand for educational purposes. Suitable for children's science education content.`;
    
    case 'history':
      return `A historical representation or illustration of ${baseSubject}.${sizeRequirement}${zoomRequirement} This could be a historical figure, event, place, or artifact. The image should be historically accurate and visually engaging. It could be a portrait, scene, or object that represents the historical significance. The image should be clear, detailed, and suitable for educational content about history.`;
    
    default:
      return `A high-quality, educational image of ${baseSubject}.${sizeRequirement}${zoomRequirement} The image should be clear, detailed, and suitable for educational content. Professional quality suitable for children's educational videos.`;
  }
}

// Helper function to generate image using OpenAI
async function generateImageWithOpenAI(params: GenerateTopicImageRequest) {
  try {
    const prompt = generateTopicPrompt(params.subject, params.topic, params.size);
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: params.size || "1024x1024",
      quality: params.quality || "standard",
      style: params.style || "vivid",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No image data received from OpenAI");
    }

    return {
      success: true,
      imageUrl: response.data[0].url,
      revisedPrompt: response.data[0].revised_prompt,
    };
  } catch (error) {
    console.error("OpenAI image generation error:", error);
    throw new Error(`OpenAI generation failed: ${error}`);
  }
}

// Helper function to generate image using Grok
async function generateImageWithGrok(params: GenerateTopicImageRequest) {
  try {
    const prompt = generateTopicPrompt(params.subject, params.topic, params.size);
    
    const response = await grok.images.generate({
      model: "grok-2-image",
      prompt: prompt,
      n: 1,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No image data received from Grok");
    }

    return {
      success: true,
      imageUrl: response.data[0].url,
      revisedPrompt: response.data[0].revised_prompt,
    };
  } catch (error) {
    console.error("Grok image generation error:", error);
    throw new Error(`Grok generation failed: ${error}`);
  }
}

// POST /api/assets/generate-topic-image - Generate topic-specific image
export async function POST(req: NextRequest) {
  try {
    const body: GenerateTopicImageRequest = await req.json();
    
    if (!body.subject || !body.topic) {
      return NextResponse.json(
        { error: 'Subject and topic are required' },
        { status: 400 }
      );
    }

    // Validate topic
    if (!['animals', 'plants', 'science', 'history', 'histories'].includes(body.topic)) {
      return NextResponse.json(
        { error: 'Invalid topic. Supported: animals, plants, science, history, histories' },
        { status: 400 }
      );
    }

    const model = body.model || 'openai';
    let result;

    if (model === 'openai') {
      result = await generateImageWithOpenAI(body);
    } else if (model === 'grok') {
      result = await generateImageWithGrok(body);
    } else {
      return NextResponse.json(
        { error: 'Invalid model specified' },
        { status: 400 }
      );
    }

    // Save the image to the assets directory
    let savedAsset = null;
    if (result.imageUrl) {
      try {
        // Use provided channel and topic, or fallback to defaults
        const channel = body.channel || 'minimate';
        const topicParam = body.topicParam || 'animals';
        const assetPaths = config.getAssetPaths(channel, topicParam);
        const imagePath = assetPaths.image;
        
        // If this is a quiz 3 option, save to the options subfolder
        const targetImagePath = body.isQuiz3Option ? path.join(imagePath, 'options') : imagePath;
        
        // Ensure the directory exists
        await fs.mkdir(targetImagePath, { recursive: true });
        
        // Download the image
        const imageResponse = await fetch(result.imageUrl);
        if (!imageResponse.ok) {
          throw new Error('Failed to download generated image');
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const filename = `${body.subject.toLowerCase().replace(/[^a-z0-9]/g, '_')}.jpg`;
        const filePath = path.join(targetImagePath, filename);
        
        // Save the image
        await fs.writeFile(filePath, Buffer.from(imageBuffer));
        
        // Get file stats
        const stats = await fs.stat(filePath);
        
        savedAsset = {
          id: `image_${filename}_${Date.now()}`,
          name: filename,
          type: 'image' as const,
          category: 'image',
          path: filePath,
          size: stats.size,
          lastModified: stats.mtime,
          status: 'available' as const,
          key: body.subject.toLowerCase().replace(/[^a-z0-9]/g, '_')
        };
      } catch (error) {
        console.error('Error saving generated image:', error);
        // Don't fail the request if saving fails
      }
    }

    return NextResponse.json({
      ...result,
      savedAsset,
      subject: body.subject,
      topic: body.topic
    });
  } catch (error) {
    console.error('Error generating topic image:', error);
    return NextResponse.json(
      { error: `Failed to generate image: ${error}` },
      { status: 500 }
    );
  }
}

// GET /api/assets/generate-topic-image - Get available models and configurations
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      models: {
        openai: {
          name: 'OpenAI DALL-E 3',
          available: !!process.env.OPENAI_API_KEY,
          sizes: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
          qualities: ['standard', 'hd'],
          styles: ['vivid', 'natural']
        },
        grok: {
          name: 'Grok-2 Image',
          available: !!process.env.GROK_API_KEY,
          sizes: ['1024x1024'], // Grok uses fixed size
          qualities: ['standard'],
          styles: ['vivid']
        }
      },
      topics: [
        { value: 'animals', label: 'Animals', description: 'Realistic animal photographs' },
        { value: 'plants', label: 'Plants', description: 'Beautiful plant and flower images' },
        { value: 'science', label: 'Science', description: 'Scientific concepts and experiments' },
        { value: 'history', label: 'History', description: 'Historical figures and events' },
        { value: 'histories', label: 'Histories', description: 'Historical figures and events' }
      ]
    });
  } catch (error) {
    console.error('Error getting topic image generation info:', error);
    return NextResponse.json(
      { error: 'Failed to get topic image generation info' },
      { status: 500 }
    );
  }
} 