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
    const basePath = `${config.workingDirectory}/${channel.toLowerCase()}/${topic.toLowerCase()}/${category}`;
    return subPath ? `${basePath}/${subPath}` : basePath;
  },
  
  // Helper function to get the base channel path
  getChannelPath: (channel: string) => {
    return `${config.workingDirectory}/${channel.toLowerCase()}`;
  },
  
  // Helper function to get the topic path
  getTopicPath: (channel: string, topic: string) => {
    return `${config.getChannelPath(channel)}/${topic.toLowerCase()}`;
  },
  
  // Helper function to get asset paths for a specific channel and topic
  getAssetPaths: (channel: string, topic: string) => {
    // Check if working directory already includes the channel name (case insensitive)
    const hasChannel = config.workingDirectory.toLowerCase().includes(channel.toLowerCase());
    
    let basePath;
    if (hasChannel) {
      // Working directory already includes channel, so just add topic
      basePath = `${config.workingDirectory}/${topic.toLowerCase()}`;
    } else {
      // Working directory doesn't include channel, so add channel and topic
      basePath = `${config.workingDirectory}/${channel.toLowerCase()}/${topic.toLowerCase()}`;
    }
    
    return {
      voice: `${basePath}/voice`,
      image: `${basePath}/image`,
      video: `${basePath}/video`,
      json: `${basePath}/render`,
      reward: `${basePath}/reward`,
      crawler: {
        image: `${basePath}/crawler/image`,
        video: `${basePath}/crawler/video`
      }
    };
  },

  /**
   * Get crawler-specific paths for a channel and topic
   * @param channel - The channel name (e.g., 'animals', 'nature')
   * @param topic - The topic name (e.g., 'wildlife', 'landscapes')
   * @returns Object with image and video crawler paths
   * @example
   * config.getCrawlerPaths('animals', 'wildlife')
   * // Returns: { image: 'C:/Users/.../animals/wildlife/crawler/image', video: 'C:/Users/.../animals/wildlife/crawler/video' }
   */
  getCrawlerPaths: (channel: string, topic: string) => {
    const basePath = config.getTopicPath(channel, topic);
    return {
      image: `${basePath}/crawler/image`,
      video: `${basePath}/crawler/video`
    };
  },

  /**
   * Get crawler paths with keyword subfolder for a channel, topic, and keyword
   * @param channel - The channel name (e.g., 'animals', 'nature')
   * @param topic - The topic name (e.g., 'wildlife', 'landscapes')
   * @param keyword - The search keyword (e.g., 'capybara', 'lion')
   * @returns Object with image and video crawler paths including keyword subfolder
   * @example
   * config.getCrawlerPathsWithKeyword('animals', 'wildlife', 'capybara')
   * // Returns: { image: 'C:/Users/.../animals/wildlife/crawler/image/capybara', video: 'C:/Users/.../animals/wildlife/crawler/video/capybara' }
   * // Files will be named: capybara_pexels_1.jpg, capybara_pixabay_2.png, etc.
   */
  getCrawlerPathsWithKeyword: (channel: string, topic: string, keyword: string) => {
    const basePath = config.getTopicPath(channel, topic);
    return {
      image: `${basePath}/crawler/image/${keyword.toLowerCase()}`,
      video: `${basePath}/crawler/video/${keyword.toLowerCase()}`
    };
  }
};

// Helper function to normalize paths to use forward slashes
export const normalizePath = (path: string): string => {
  return path.replace(/\\/g, '/');
}; 