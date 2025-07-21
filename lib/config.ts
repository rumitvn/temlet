// Configuration utility for environment-based settings
export const config = {
  // Working directory configuration
  workingDirectory: process.env.WORKING_DIRECTORY || 'C:/Users/youruser/Documents',
  
  // Helper function to get file URL for assets
  getAssetFileUrl: (path: string) => {
    const normalizedPath = path.replace(/\\/g, '/');
    return `file:///${normalizedPath}`;
  },
  
  // Helper function to build asset paths with channel and topic parameters
  buildAssetPath: (category: string, channel: string, topic: string, subPath: string = '') => {
    const basePath = `${config.workingDirectory}/${channel}/${topic}/${category}`;
    return subPath ? `${basePath}/${subPath}` : basePath;
  },
  
  // Helper function to get the base channel path
  getChannelPath: (channel: string) => {
    return `${config.workingDirectory}/${channel}`;
  },
  
  // Helper function to get the topic path
  getTopicPath: (channel: string, topic: string) => {
    return `${config.getChannelPath(channel)}/${topic}`;
  },
  
  // Helper function to get asset paths for a specific channel and topic
  getAssetPaths: (channel: string, topic: string) => {
    // Check if working directory already includes the channel name
    const hasChannel = config.workingDirectory.includes(channel);
    
    let basePath;
    if (hasChannel) {
      // Working directory already includes channel, so just add topic
      basePath = `${config.workingDirectory}/${topic}`;
    } else {
      // Working directory doesn't include channel, so add channel and topic
      basePath = `${config.workingDirectory}/${channel}/${topic}`;
    }
    
    return {
      voice: `${basePath}/voice`,
      image: `${basePath}/image`,
      video: `${basePath}/video`,
      json: `${basePath}/render`,
      reward: `${basePath}/reward`
    };
  }
};

// Helper function to normalize paths to use forward slashes
export const normalizePath = (path: string): string => {
  return path.replace(/\\/g, '/');
}; 