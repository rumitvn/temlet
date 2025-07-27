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

interface GenerateImageRequest {
  prompt: string;
  model?: 'openai' | 'grok' | 'comfyui';
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  category?: string;
  filename?: string;
  comfyuiUrl?: string;
  comfyuiWorkflow?: any;
  channel?: string;
  topic?: string;
}

interface ComfyUIWorkflow {
  prompt: object;
  extra_data?: object;
}

// Helper function to generate image using OpenAI
async function generateImageWithOpenAI(params: GenerateImageRequest) {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: params.prompt,
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
async function generateImageWithGrok(params: GenerateImageRequest) {
  try {
    const response = await grok.images.generate({
      model: "grok-2-image",
      prompt: params.prompt,
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

// Helper function to generate image using ComfyUI
async function generateImageWithComfyUI(params: GenerateImageRequest) {
  try {
    const comfyuiUrl = params.comfyuiUrl || "http://localhost:8188";
    
    // Default workflow for ComfyUI if none provided
    const defaultWorkflow = {
      prompt: {
        "1": {
          "inputs": {
            "text": params.prompt,
            "clip": ["4", 1]
          },
          "class_type": "CLIPTextEncode"
        },
        "2": {
          "inputs": {
            "seed": Math.floor(Math.random() * 1000000),
            "steps": 20,
            "cfg": 8,
            "sampler_name": "euler",
            "scheduler": "normal",
            "denoise": 1,
            "model": ["4", 0],
            "positive": ["1", 0],
            "negative": ["6", 0],
            "latent_image": ["5", 0]
          },
          "class_type": "KSampler"
        },
        "3": {
          "inputs": {
            "samples": ["2", 0],
            "vae": ["4", 2]
          },
          "class_type": "VAEDecode"
        },
        "4": {
          "inputs": {
            "ckpt_name": "v1-5-pruned.ckpt"
          },
          "class_type": "CheckpointLoaderSimple"
        },
        "5": {
          "inputs": {
            "width": parseInt(params.size?.split('x')[0] || "1024"),
            "height": parseInt(params.size?.split('x')[1] || "1024"),
            "batch_size": 1
          },
          "class_type": "EmptyLatentImage"
        },
        "6": {
          "inputs": {
            "text": "low quality, bad quality, sketches",
            "clip": ["4", 1]
          },
          "class_type": "CLIPTextEncode"
        },
        "7": {
          "inputs": {
            "filename_prefix": "ComfyUI",
            "images": ["3", 0]
          },
          "class_type": "SaveImage"
        }
      }
    };

    const workflow = params.comfyuiWorkflow || defaultWorkflow;

    // Queue the prompt
    const queueResponse = await fetch(`${comfyuiUrl}/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workflow),
    });

    if (!queueResponse.ok) {
      throw new Error(`ComfyUI queue failed: ${queueResponse.statusText}`);
    }

    const queueData = await queueResponse.json();
    const promptId = queueData.prompt_id;

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max wait
    let imageData = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const historyResponse = await fetch(`${comfyuiUrl}/history/${promptId}`);
      if (historyResponse.ok) {
        const history = await historyResponse.json();
        if (history[promptId] && history[promptId].outputs) {
          const outputs = history[promptId].outputs;
          const imageNode = Object.values(outputs).find((output: any) => 
            output.images && output.images.length > 0
          ) as any;

          if (imageNode && imageNode.images[0]) {
            const image = imageNode.images[0];
            const imageUrl = `${comfyuiUrl}/view?filename=${image.filename}&subfolder=${image.subfolder}&type=${image.type}`;
            imageData = {
              filename: image.filename,
              subfolder: image.subfolder,
              type: image.type,
              url: imageUrl
            };
            break;
          }
        }
      }
      attempts++;
    }

    if (!imageData) {
      throw new Error("ComfyUI generation timed out");
    }

    return {
      success: true,
      imageUrl: imageData.url,
      filename: imageData.filename,
      subfolder: imageData.subfolder,
    };
  } catch (error) {
    console.error("ComfyUI image generation error:", error);
    throw new Error(`ComfyUI generation failed: ${error}`);
  }
}

// POST /api/assets/generate-image - Generate image using AI
export async function POST(req: NextRequest) {
  try {
    const body: GenerateImageRequest = await req.json();
    
    if (!body.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const model = body.model || 'openai';
    let result;

    if (model === 'openai') {
      result = await generateImageWithOpenAI(body);
    } else if (model === 'grok') {
      result = await generateImageWithGrok(body);
    } else if (model === 'comfyui') {
      result = await generateImageWithComfyUI(body);
    } else {
      return NextResponse.json(
        { error: 'Invalid model specified' },
        { status: 400 }
      );
    }

    // If we have a category and filename, save the image to the assets directory
    let savedAsset = null;
    if (body.category && result.imageUrl) {
      try {
        // Use provided channel and topic, or fallback to defaults
        const channel = body.channel || 'minimate';
        const topic = body.topic || 'animals';
        const assetPaths = config.getAssetPaths(channel, topic);
        const imagePath = assetPaths.image;
        
        // Ensure the directory exists
        await fs.mkdir(imagePath, { recursive: true });
        
        // Download the image
        const imageResponse = await fetch(result.imageUrl);
        if (!imageResponse.ok) {
          throw new Error('Failed to download generated image');
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const filename = body.filename || `generated_${Date.now()}.png`;
        const filePath = path.join(imagePath, filename);
        
        // Save the image
        await fs.writeFile(filePath, Buffer.from(imageBuffer));
        
        // Get file stats
        const stats = await fs.stat(filePath);
        
        savedAsset = {
          id: `image_${filename}_${Date.now()}`,
          name: filename,
          type: 'image' as const,
          category: body.category,
          path: filePath,
          size: stats.size,
          lastModified: stats.mtime,
          status: 'available' as const
        };
      } catch (error) {
        console.error('Error saving generated image:', error);
        // Don't fail the request if saving fails
      }
    }

    return NextResponse.json({
      ...result,
      savedAsset
    });
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: `Failed to generate image: ${error}` },
      { status: 500 }
    );
  }
}

// GET /api/assets/generate-image - Get available models and configurations
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checkComfyUI = searchParams.get('check_comfyui') === 'true';
    
    let comfyuiStatus = null;
    
    if (checkComfyUI) {
      try {
        const response = await fetch('http://localhost:8188/system_stats', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const stats = await response.json();
          comfyuiStatus = {
            available: true,
            stats
          };
        } else {
          comfyuiStatus = {
            available: false,
            error: 'ComfyUI not responding'
          };
        }
      } catch (error) {
        comfyuiStatus = {
          available: false,
          error: 'ComfyUI connection failed'
        };
      }
    }

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
        },
        comfyui: {
          name: 'ComfyUI (Local)',
          available: comfyuiStatus?.available || false,
          status: comfyuiStatus,
          sizes: ['512x512', '768x768', '1024x1024', '1024x1536', '1536x1024'],
          defaultUrl: 'http://localhost:8188'
        }
      }
    });
  } catch (error) {
    console.error('Error getting image generation info:', error);
    return NextResponse.json(
      { error: 'Failed to get image generation info' },
      { status: 500 }
    );
  }
} 