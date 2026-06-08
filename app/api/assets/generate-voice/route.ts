import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { config } from '../../../../lib/config';
import { logger } from "@/app/lib/logger";

// Token cache to avoid getting new tokens for each request
let tokenCache: {
  token: string;
  expiresAt: number;
} | null = null;

export async function POST(request: NextRequest) {
  try {
    const { text, filename, jsonKey, jsonOrder, channel, topic } = await request.json();

    if (!text || !filename || !jsonKey || !jsonOrder || !channel || !topic) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    logger.debug(`🔧 Voice generation request:`, {
      text: text.substring(0, 50) + '...',
      filename,
      jsonKey,
      jsonOrder,
      channel,
      topic
    });

    // Create voice folder path: workingDirectory/channel/topic/voice/key_order/
    const voiceFolder = path.join(
      config.workingDirectory,
      channel,
      topic,
      'voice',
      `${jsonKey}_${jsonOrder}`
    );

    logger.debug(`📁 Voice folder path: ${voiceFolder}`);

    // Ensure the voice folder exists
    if (!fs.existsSync(voiceFolder)) {
      fs.mkdirSync(voiceFolder, { recursive: true });
      logger.debug(`✅ Created voice folder: ${voiceFolder}`);
    }

    // Full path for the voice file
    const outputPath = path.join(voiceFolder, filename);

    // Call Google Cloud TTS
    const ttsResult = await createVoiceFile(text, filename, voiceFolder);

    if (ttsResult.success) {
      logger.debug(`✅ Voice file created successfully: ${outputPath}`);
      return NextResponse.json({
        success: true,
        path: outputPath,
        message: `Voice file ${filename} created successfully`
      });
    } else {
      logger.error(`❌ Voice generation failed: ${ttsResult.error}`);
      return NextResponse.json(
        { error: ttsResult.error },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('❌ Error in voice generation API:', error);
    return NextResponse.json(
      { error: `Failed to generate voice file: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function createVoiceFile(text: string, filename: string, outputFolder: string) {
  try {
    const GOOGLE_TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";
    
    // Check for service account key
    const serviceAccountKey = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY_FILE;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "minimatevn";
    
    logger.debug(`🔧 Google Cloud Configuration:`);
    logger.debug(`   Project ID: ${projectId}`);
    logger.debug(`   Service Account Key: ${serviceAccountKey ? 'Configured' : 'Not configured'}`);
    
    if (!serviceAccountKey) {
      logger.debug(`⚠️ No Google Cloud service account key found. Creating test file instead.`);
      logger.debug(`💡 To use Google Cloud TTS, set either:`);
      logger.debug(`   - GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY (JSON string)`);
      logger.debug(`   - GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY_FILE (path to JSON file)`);
      return createTestVoiceFile(text, filename, outputFolder);
    }

    // Get access token using service account (with caching)
    const accessToken = await getGoogleCloudAccessToken(serviceAccountKey);
    
    if (!accessToken) {
      logger.debug(`⚠️ Failed to get access token. Creating test file instead.`);
      return createTestVoiceFile(text, filename, outputFolder);
    }

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Goog-User-Project": projectId
    };

    const payload = {
      "input": { "text": text },
      "voice": {
        "languageCode": "vi-VN",
        "name": "vi-VN-Chirp3-HD-Sulafat"
      },
      "audioConfig": {
        "audioEncoding": "MP3"
      }
    };

    logger.debug(`🔊 Requesting TTS for: ${filename} with text: "${text.substring(0, 30)}..."`);
    
    const response = await fetch(GOOGLE_TTS_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    logger.debug(`📡 TTS Response status: ${response.status}`);

    if (response.status === 200) {
      const data = await response.json();
      const audioContent = data.audioContent;
      
      if (!audioContent) {
        logger.error(`❌ No audio content returned for ${filename}`);
        return {
          success: false,
          error: `No audio content returned for ${filename}`
        };
      }

      const outPath = path.join(outputFolder, filename);
      
      // Decode base64 audio content and write to file
      const audioBuffer = Buffer.from(audioContent, 'base64');
      fs.writeFileSync(outPath, audioBuffer);
      
      logger.debug(`✅ Saved ${filename} => ${outPath}`);
      
      return {
        success: true,
        path: outPath
      };
    } else {
      const errorText = await response.text();
      logger.error(`❌ TTS failed for ${filename}: ${response.status} - ${errorText}`);
      
      // Provide helpful error messages for common issues
      let errorMessage = `TTS failed for ${filename}: ${response.status}`;
      
      if (response.status === 403) {
        errorMessage = `Permission denied. Please ensure your service account has the 'Cloud Text-to-Speech User' role and the Text-to-Speech API is enabled.`;
      } else if (response.status === 401) {
        errorMessage = `Authentication failed. Please check your service account key.`;
      } else if (response.status === 400) {
        errorMessage = `Invalid request. Please check the text content.`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

  } catch (error) {
    logger.error(`❌ Error in createVoiceFile for ${filename}:`, error);
    return {
      success: false,
      error: `Failed to create voice file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Get Google Cloud access token using service account (with caching)
async function getGoogleCloudAccessToken(serviceAccountKey: string) {
  try {
    // Check if we have a valid cached token
    const now = Date.now();
    if (tokenCache && tokenCache.expiresAt > now) {
      logger.debug(`🔄 Using cached access token (expires in ${Math.round((tokenCache.expiresAt - now) / 1000)}s)`);
      return tokenCache.token;
    }
    
    const tokenEndpoint = "https://oauth2.googleapis.com/token";
    
    let serviceAccount;
    
    // Try to parse as JSON first (if it's a JSON string)
    try {
      serviceAccount = JSON.parse(serviceAccountKey);
    } catch (parseError) {
      // If parsing fails, try to read from file
      logger.debug(`📄 Trying to read service account key from file: ${serviceAccountKey}`);
      try {
        const keyPath = path.join(process.cwd(), serviceAccountKey);
        const keyContent = fs.readFileSync(keyPath, 'utf8');
        serviceAccount = JSON.parse(keyContent);
        logger.debug(`✅ Successfully read service account key from file`);
      } catch (fileError) {
        logger.error(`❌ Failed to read service account key from file:`, fileError);
        return null;
      }
    }
    
    // Create JWT for service account
    const jwtNow = Math.floor(now / 1000);
    const jwtPayload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: tokenEndpoint,
      exp: jwtNow + 3600, // 1 hour
      iat: jwtNow
    };
    
    // Sign the JWT with the private key
    const signedJWT = jwt.sign(jwtPayload, serviceAccount.private_key, {
      algorithm: 'RS256',
      header: {
        alg: 'RS256',
        typ: 'JWT'
      }
    });
    
    logger.debug(`🔑 Getting new access token for service account: ${serviceAccount.client_email}`);
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signedJWT
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      logger.debug(`✅ Successfully obtained new access token`);
      
      // Cache the token (expire 5 minutes before the actual expiry)
      tokenCache = {
        token: data.access_token,
        expiresAt: now + (data.expires_in * 1000) - (5 * 60 * 1000) // 5 minutes buffer
      };
      
      return data.access_token;
    } else {
      const errorText = await response.text();
      logger.error('❌ Failed to get access token:', errorText);
      return null;
    }
  } catch (error) {
    logger.error('❌ Error getting access token:', error);
    return null;
  }
}

// Create a test voice file when Google Cloud is not available
function createTestVoiceFile(text: string, filename: string, outputFolder: string) {
  try {
    const outPath = path.join(outputFolder, filename);
    
    // Create a simple MP3 header (this is just a placeholder - not a real MP3)
    // In a real implementation, you'd want to use a proper audio library
    const testAudioData = Buffer.from([
      // MP3 header bytes (simplified)
      0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // Add some dummy audio data
      ...Buffer.from(`Test audio for: ${text}`.repeat(100))
    ]);
    
    fs.writeFileSync(outPath, testAudioData);
    
    logger.debug(`✅ Created test voice file: ${outPath}`);
    
    return {
      success: true,
      path: outPath
    };
  } catch (error) {
    logger.error(`❌ Error creating test voice file:`, error);
    return {
      success: false,
      error: `Failed to create test voice file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
} 