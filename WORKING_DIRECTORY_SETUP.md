# Working Directory Configuration

## Overview
The hardcoded working directory path has been restructured to separate the working directory (environment variable) from channel and topic names (parameters). The configuration is now simple and clear.

## Structure
- **Working Directory**: `C:/Users/youruser/Documents/` (environment variable)
- **Channel**: `minimate` (parameter)
- **Topic**: `animals` (parameter)

Final path structure: `{WORKING_DIRECTORY}/{CHANNEL}/{TOPIC}/{CATEGORY}`

## Changes Made

### 1. Environment Configuration
- Added `WORKING_DIRECTORY` environment variable (base path only)
- Channel and topic are now parameters passed to functions

### 2. Files Updated
The following files have been updated to use the new centralized configuration:

- `lib/config.ts` - Simplified configuration utility
- `app/api/assets/route.ts` - Assets API route
- `app/api/assets/preview/route.ts` - Assets preview API route
- `app/services/render.ts` - Render service
- `app/render_quiz_animals/page.tsx` - Quiz animals render page
- `app/render_reward_image/page.tsx` - Reward image render page
- `app/assets/page.tsx` - Assets page (simplified mock data)

### 3. Configuration Structure
The configuration now provides:
- `config.workingDirectory` - Base working directory path (from environment)
- `config.getAssetFileUrl()` - Helper to create file URLs
- `config.buildAssetPath(category, channel, topic, subPath?)` - Helper to build asset paths
- `config.getChannelPath(channel)` - Helper to get channel path
- `config.getTopicPath(channel, topic)` - Helper to get topic path
- `config.getAssetPaths(channel, topic)` - Helper to get all asset paths for a channel/topic

## Setup Instructions

1. Create a `.env` file in the project root with:
```
WORKING_DIRECTORY=C:/Users/youruser/Documents
```

2. The application will use this environment variable along with channel and topic parameters to construct all asset paths.

## Usage Examples

```typescript
// Build asset paths with parameters
const voicePath = config.buildAssetPath("voice", "minimate", "animals", "alligator_1/voice_title.mp3");
const imagePath = config.buildAssetPath("image", "minimate", "animals", "alligator.jpg");

// Get all asset paths for a channel/topic
const assetPaths = config.getAssetPaths("minimate", "animals");
```

## Benefits
- **Simple**: Clear and straightforward configuration
- **Flexible**: Channel and topic can be changed per function call
- **Environment-specific**: Working directory is configurable per environment
- **Scalable**: Support for multiple channels and topics
- **Centralized**: All path logic in one place
- **Maintainable**: Easy to change without code modifications

## Default Fallback
If `WORKING_DIRECTORY` is not set, the system falls back to:
- `WORKING_DIRECTORY`: `C:/Users/youruser/Documents`

Default parameters used throughout the app:
- `CHANNEL`: `minimate`
- `TOPIC`: `animals`

## Example Paths
With the default configuration, asset paths will be:
- Voice: `C:/Users/youruser/Documents/minimate/animals/voice`
- Image: `C:/Users/youruser/Documents/minimate/animals/image`
- Video: `C:/Users/youruser/Documents/minimate/animals/video`
- JSON: `C:/Users/youruser/Documents/minimate/animals/render`
- Reward: `C:/Users/youruser/Documents/minimate/animals/reward` 