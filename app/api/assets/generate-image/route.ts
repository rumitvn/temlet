import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import OpenAI from "openai";
import { config } from "../../../../lib/config";
import { logger } from "@/app/lib/logger";

// Lazily create the OpenAI client so the module can be imported (e.g. during
// `next build`) without the API key being present. The key is only required
// when the OpenAI model is actually used.
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
}

// Lazily create the Grok client for the same reason.
function getGrokClient(): OpenAI {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    throw new Error('GROK_API_KEY is not configured');
  }
  return new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });
}

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
    const openai = getOpenAIClient();
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
    logger.error("OpenAI image generation error:", error);
    throw new Error(`OpenAI generation failed: ${error}`);
  }
}

// Helper function to generate image using Grok
async function generateImageWithGrok(params: GenerateImageRequest) {
  try {
    const grok = getGrokClient();
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
    logger.error("Grok image generation error:", error);
    throw new Error(`Grok generation failed: ${error}`);
  }
}

// Helper function to generate image using ComfyUI
async function generateImageWithComfyUI(params: GenerateImageRequest) {
  try {
    const comfyuiUrl = params.comfyuiUrl || "http://localhost:8188";
    
    // Check if ComfyUI is available
    try {
      const healthCheck = await fetch(`${comfyuiUrl}/system_stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!healthCheck.ok) {
        throw new Error('ComfyUI not available');
      }
    } catch (error) {
      throw new Error('ComfyUI connection failed');
    }
    
    // Use the same workflow structure as the topic image endpoint
    const workflow = {
      "2": {
        "inputs": {
          "samples": [
            "5",
            0
          ],
          "vae": [
            "11",
            0
          ]
        },
        "class_type": "VAEDecode",
        "_meta": {
          "title": "VAE Decode"
        }
      },
      "4": {
        "inputs": {
          "width": parseInt(params.size?.split('x')[0] || "512"),
          "height": parseInt(params.size?.split('x')[1] || "512"),
          "batch_size": 1
        },
        "class_type": "EmptySD3LatentImage",
        "_meta": {
          "title": "EmptySD3LatentImage"
        }
      },
      "5": {
        "inputs": {
          "seed": Math.floor(Math.random() * 100000000000000),
          "steps": 20,
          "cfg": 1,
          "sampler_name": "euler",
          "scheduler": "simple",
          "denoise": 1,
          "model": [
            "9",
            0
          ],
          "positive": [
            "19",
            0
          ],
          "negative": [
            "6",
            0
          ],
          "latent_image": [
            "4",
            0
          ]
        },
        "class_type": "KSampler",
        "_meta": {
          "title": "KSampler"
        }
      },
      "6": {
        "inputs": {
          "text": "low quality, bad quality, blurry, distorted",
          "clip": [
            "10",
            0
          ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Negative Prompt)"
        }
      },
      "9": {
        "inputs": {
          "unet_name": "flux1-dev-Q4_K_S.gguf"
        },
        "class_type": "UnetLoaderGGUF",
        "_meta": {
          "title": "Unet Loader (GGUF)"
        }
      },
      "10": {
        "inputs": {
          "clip_name1": "t5-v1_1-xxl-encoder-Q4_K_S.gguf",
          "clip_name2": "clip_l.safetensors",
          "type": "flux"
        },
        "class_type": "DualCLIPLoaderGGUF",
        "_meta": {
          "title": "DualCLIPLoader (GGUF)"
        }
      },
      "11": {
        "inputs": {
          "vae_name": "ae.safetensors"
        },
        "class_type": "VAELoader",
        "_meta": {
          "title": "Load VAE"
        }
      },
      "19": {
        "inputs": {
          "text": [
            "22",
            0
          ],
          "clip": [
            "10",
            0
          ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Positive Prompt)"
        }
      },
      "22": {
        "inputs": {
          "Text": params.prompt
        },
        "class_type": "DF_Text",
        "_meta": {
          "title": "Text"
        }
      },
      "27": {
        "inputs": {
          "filename_prefix": "ComfyUI",
          "images": [
            "2",
            0
          ]
        },
        "class_type": "SaveImage",
        "_meta": {
          "title": "Save Image"
        }
      }
    };

    // Queue the prompt
    logger.debug('Sending ComfyUI workflow:', JSON.stringify({ prompt: workflow, extra_data: {} }, null, 2));
    const queueResponse = await fetch(`${comfyuiUrl}/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: workflow, extra_data: {} }),
    });

    if (!queueResponse.ok) {
      const errorText = await queueResponse.text();
      logger.error("ComfyUI queue error response:", errorText);
      logger.error("ComfyUI workflow sent:", JSON.stringify(workflow, null, 2));
      logger.error("ComfyUI URL:", comfyuiUrl);
      throw new Error(`ComfyUI queue failed: ${queueResponse.statusText} - ${errorText}`);
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
    logger.error("ComfyUI image generation error:", error);
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
      try {
        result = await generateImageWithComfyUI(body);
      } catch (error) {
        logger.error('ComfyUI failed, falling back to Grok:', error);
        // Fallback to Grok if ComfyUI fails
        result = await generateImageWithGrok(body);
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid model specified. Supported: openai, grok, comfyui' },
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
        logger.error('Error saving generated image:', error);
        // Don't fail the request if saving fails
      }
    }

    return NextResponse.json({
      ...result,
      savedAsset
    });
  } catch (error) {
    logger.error('Error generating image:', error);
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
    logger.error('Error getting image generation info:', error);
    return NextResponse.json(
      { error: 'Failed to get image generation info' },
      { status: 500 }
    );
  }
} 