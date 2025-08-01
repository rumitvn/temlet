"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon
} from "@heroicons/react/24/outline";
import { 
  PhotoIcon
} from "@heroicons/react/24/solid";
import { 
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/solid";
import { config } from "../../lib/config";
import ImageGenerationDialog from "../components/ImageGenerationDialog";

interface Asset {
  id: string;
  name: string;
  type: 'voice' | 'image' | 'video' | 'json';
  category: string;
  path: string;
  size?: number;
  lastModified?: Date;
  status: 'available' | 'missing' | 'processing';
  key?: string; // Animal key like 'bear', 'cat', etc.
  order?: number; // Order number for JSON files
  rendered?: boolean; // Whether this asset has been rendered
  renderJson?: string; // JSON file used for rendering
}

interface AssetCategory {
  id: string;
  name: string;
  type: 'voice' | 'image' | 'video' | 'json';
  count: number;
  path: string;
}

// New interface for JSON-Voice pairs
interface JSONVoicePair {
  json: Asset;
  voices: Asset[];
  hasAllVoices: boolean;
  missingVoices: string[];
  voiceTypes: {
    intro: boolean;
    quiz1_question: boolean;
    quiz1_answer: boolean;
    quiz2_question: boolean;
    quiz2_answer: boolean;
    quiz3_question: boolean;
    quiz3_answer: boolean;
    lesson: boolean;
    reward: boolean;
  };
}

// Updated interface for JSON-Asset pairs (JSON, Voices, and Rewards)
interface JSONAssetPair {
  json: Asset;
  voices: Asset[];
  reward?: Asset;
  hasAllVoices: boolean;
  hasReward: boolean;
  missingVoices: string[];
  voiceTypes: {
    intro: boolean;
    quiz1_question: boolean;
    quiz1_answer: boolean;
    quiz2_question: boolean;
    quiz2_answer: boolean;
    quiz3_question: boolean;
    quiz3_answer: boolean;
    lesson: boolean;
    reward: boolean;
  };
  // Quiz 3 image options status
  quiz3ImageOptions: {
    options: string[];
    availableImages: string[];
    missingImages: string[];
    hasAllImages: boolean;
    completionRate: number;
  };
}

interface AssetGroup {
  key: string;
  name: string;
  assets: {
    image?: Asset;
    videos: Asset[];
    voices: Asset[];
    jsons: Asset[];
    rewards: Asset[];
    jsonAssetPairs: JSONAssetPair[]; // Updated field for organized JSON-Asset pairs
  };
  renderStatus: {
    hasJson: boolean;
    hasImage: boolean;
    hasVideos: boolean;
    hasVoices: boolean;
    isComplete: boolean;
    requiredVoices: number; // 9 voices per JSON
    availableVoices: number;
    requiredRewards: number; // 1 reward per JSON
    availableRewards: number;
    jsonOrders: number[]; // Which JSON orders exist (1, 2, 3, etc.)
    // Quiz 3 image options status
    hasQuiz3Images: boolean;
    requiredQuiz3Images: number; // 4 images per JSON
    availableQuiz3Images: number;
  };
}

interface SK3QLRContent {
  id: string; // Add unique ID to prevent duplicate keys
  key: string;
  order: number;
  intro: {
    text: string;
    voice: string;
  };
  quiz_1: {
    question: {
      text: string;
      voice: string;
    };
    options: string[];
    answer: {
      position: number;
      voice: string;
    };
  };
  quiz_2: {
    question: {
      text: string;
      voice: string;
    };
    options: string[];
    answer: {
      position: number;
      voice: string;
    };
  };
  quiz_3: {
    question: {
      text: string;
      voice: string;
    };
    options: string[];
    answer: {
      position: number;
      voice: string;
    };
  };
  lesson: {
    voice: string;
  };
  reward: {
    voice: string;
  };
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("minimate");
  const [selectedTopic, setSelectedTopic] = useState("animals");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showImageGenerationDialog, setShowImageGenerationDialog] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewVideoMode, setPreviewVideoMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'createDate'>('createDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter options
  const channelOptions = [
    { value: "minimate", label: "MiniMate" },
    { value: "rumitx_studio", label: "RumitX Studio" },
    { value: "rumitx_shorts", label: "RumitX Shorts" },
    { value: "rumitx_nature", label: "RumitX Nature" },
    { value: "rumitx_science", label: "RumitX Science" },
    { value: "rumitx_history", label: "RumitX History" }
  ];

  const topicOptions = [
    { value: "animals", label: "Animals" },
    { value: "plants", label: "Plants" },
    { value: "histories", label: "Histories" },
    { value: "science", label: "Science" },
    { value: "technology", label: "Technology" },
    { value: "nature", label: "Nature" },
    { value: "space", label: "Space" },
    { value: "ocean", label: "Ocean" },
    { value: "weather", label: "Weather" },
    { value: "geography", label: "Geography" }
  ];

  // AI Generator state
  const [aiContent, setAiContent] = useState<SK3QLRContent>({
    id: "",
    key: "",
    order: 1,
    intro: { text: "", voice: "" },
    quiz_1: {
      question: { text: "", voice: "" },
      options: ["", "", "", ""],
      answer: { position: 1, voice: "" }
    },
    quiz_2: {
      question: { text: "", voice: "" },
      options: ["", ""],
      answer: { position: 1, voice: "" }
    },
    quiz_3: {
      question: { text: "", voice: "" },
      options: ["", "", "", ""],
      answer: { position: 1, voice: "" }
    },
    lesson: { voice: "" },
    reward: { voice: "" }
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [aiLanguage, setAiLanguage] = useState("vietnamese");
  const [aiProvider, setAiProvider] = useState("grok");
  const [existingOrders, setExistingOrders] = useState<number[]>([]);
  const [previewItems, setPreviewItems] = useState<SK3QLRContent[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // New batch generation state
  const [batchSize, setBatchSize] = useState(1);
  const [subjectsList, setSubjectsList] = useState("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; subject: string } | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Helper function to extract key and order from filename
  const extractKeyAndOrder = (filename: string, type: string, path?: string): { key: string; order?: number } => {
    if (type === 'json') {
      // Extract from format like "bear_1.json" or "blue_tang_1.json"
      // Use a more robust regex that handles multi-word names
      const match = filename.match(/^(.+?)_(\d+)\.json$/);
      if (match) {
        const key = match[1];
        const order = parseInt(match[2]);
        console.log(`Extracted from ${filename}: key="${key}", order=${order}`); // Debug log
        return { key, order };
      }
    } else if (type === 'voice') {
      // For voice files, extract the key from the directory path
      // Voice files are in directories like "voice/buoyancy_1/voice_lesson.mp3"
      if (path) {
        // Extract the directory name from the path - handle both Windows and Unix separators
        const pathParts = path.split(/[\/\\]/); // Split by both forward and backward slashes
        const voiceDirIndex = pathParts.findIndex(part => part === 'voice');
        if (voiceDirIndex !== -1 && voiceDirIndex + 1 < pathParts.length) {
          const dirName = pathParts[voiceDirIndex + 1]; // This should be "buoyancy_1"
          const dirMatch = dirName.match(/^(.+?)_(\d+)$/);
          if (dirMatch) {
            const key = dirMatch[1];
            const order = parseInt(dirMatch[2]);
            console.log(`Extracted from voice path ${path}: key="${key}", order=${order}`); // Debug log
            return { key, order };
          }
        }
      }
      
      // Fallback: extract from filename if path method fails
      const match = filename.match(/voice_(.+?)\.mp3/);
      if (match) {
        return { key: 'voice_' + match[1] };
      }
    } else {
      // Extract from format like "bear.jpg", "bear.mp4", "blue_tang.jpg"
      const match = filename.match(/^(.+?)\.(jpg|mp4|png|gif)$/);
      if (match) {
        return { key: match[1] };
      }
    }
    return { key: filename.split('.')[0] };
  };



  // Helper function to organize JSON files with their corresponding voices and rewards
  const organizeJSONAssetPairs = (jsons: Asset[], voices: Asset[], rewards: Asset[], allImages: Asset[], jsonOptionsMap: Map<string, string[]> = new Map()): JSONAssetPair[] => {
    console.log('🔧 organizeJSONAssetPairs called with:', jsons.length, 'JSONs');
    return jsons.map(json => {
      const jsonOrder = json.order;
      const jsonKey = json.key;
      
      // Find voices that belong to this JSON file
      const matchingVoices = voices.filter(voice => {
        // Check if voice belongs to this JSON by matching key and order
        if (voice.key === jsonKey && voice.order === jsonOrder) {
          console.log(`Voice ${voice.name} matched by key/order: ${voice.key}_${voice.order}`); // Debug log
          return true;
        }
        
        // Check by path structure: voice/key_order/voice_type.mp3
        if (voice.path) {
          const pathMatch = voice.path.match(/voice[\/\\]([^\/\\]+)_(\d+)[\/\\]/);
          if (pathMatch && pathMatch[1] === jsonKey && parseInt(pathMatch[2]) === jsonOrder) {
            console.log(`Voice ${voice.name} matched by path: ${voice.path}`); // Debug log
            return true;
          }
        }
        
        // Additional check for voice filename pattern: key_order_voice_type.mp3
        const voiceNameMatch = voice.name.match(/^(.+?)_(\d+)_voice_/);
        if (voiceNameMatch && voiceNameMatch[1] === jsonKey && parseInt(voiceNameMatch[2]) === jsonOrder) {
          console.log(`Voice ${voice.name} matched by filename pattern`); // Debug log
          return true;
        }
        
        return false;
      });

      // Find reward that belongs to this JSON file
      const matchingReward = rewards.find(reward => {
        // Check by path structure: reward/output/reward_order/key.mp4
        if (reward.path) {
          const pathMatch = reward.path.match(/reward[\/\\]output[\/\\]reward_(\d+)[\/\\]([^\/\\]+)\.mp4$/);
          if (pathMatch && parseInt(pathMatch[1]) === jsonOrder && pathMatch[2] === jsonKey) {
            return true;
          }
        }
        
        return false;
      });

      // Determine which voice types are present based on the actual file naming pattern
      const voiceTypes = {
        intro: false,
        quiz1_question: false,
        quiz1_answer: false,
        quiz2_question: false,
        quiz2_answer: false,
        quiz3_question: false,
        quiz3_answer: false,
        lesson: false,
        reward: false
      };

      const missingVoices: string[] = [];

      console.log(`🔍 Checking voices for ${json.name} (${jsonKey}_${jsonOrder}):`, matchingVoices.map(v => v.name));
      
      matchingVoices.forEach(voice => {
        const voiceName = voice.name.toLowerCase();
        console.log(`🎵 Processing voice: ${voice.name} (${voiceName})`);
        
        // EXACT filename matching - no partial matches allowed
        if (voiceName === 'voice_title.mp3') {
          voiceTypes.intro = true;
          console.log(`  ✅ Matched intro (exact match)`);
        } else if (voiceName === 'voice_q1_title.mp3') {
          voiceTypes.quiz1_question = true;
          console.log(`  ✅ Matched quiz1_question (exact match)`);
        } else if (voiceName === 'voice_q1_ans.mp3') {
          voiceTypes.quiz1_answer = true;
          console.log(`  ✅ Matched quiz1_answer (exact match)`);
        } else if (voiceName === 'voice_q2_title.mp3') {
          voiceTypes.quiz2_question = true;
          console.log(`  ✅ Matched quiz2_question (exact match)`);
        } else if (voiceName === 'voice_q2_ans.mp3') {
          voiceTypes.quiz2_answer = true;
          console.log(`  ✅ Matched quiz2_answer (exact match)`);
        } else if (voiceName === 'voice_q3_title.mp3') {
          voiceTypes.quiz3_question = true;
          console.log(`  ✅ Matched quiz3_question (exact match)`);
        } else if (voiceName === 'voice_q3_ans.mp3') {
          voiceTypes.quiz3_answer = true;
          console.log(`  ✅ Matched quiz3_answer (exact match)`);
        } else if (voiceName === 'voice_lesson.mp3') {
          voiceTypes.lesson = true;
          console.log(`  ✅ Matched lesson (exact match)`);
        } else if (voiceName === 'voice_reward.mp3') {
          voiceTypes.reward = true;
          console.log(`  ✅ Matched reward (exact match)`);
        } else {
          console.log(`  ❌ No exact match for voice: ${voice.name} (expected exact filename)`);
        }
      });

      // Check for missing voice types
      if (!voiceTypes.intro) missingVoices.push('intro');
      if (!voiceTypes.quiz1_question) missingVoices.push('quiz1_question');
      if (!voiceTypes.quiz1_answer) missingVoices.push('quiz1_answer');
      if (!voiceTypes.quiz2_question) missingVoices.push('quiz2_question');
      if (!voiceTypes.quiz2_answer) missingVoices.push('quiz2_answer');
      if (!voiceTypes.quiz3_question) missingVoices.push('quiz3_question');
      if (!voiceTypes.quiz3_answer) missingVoices.push('quiz3_answer');
      if (!voiceTypes.lesson) missingVoices.push('lesson');
      if (!voiceTypes.reward) missingVoices.push('reward');

      console.log(`📊 Voice types status for ${json.name}:`, voiceTypes);
      console.log(`❌ Missing voices for ${json.name}:`, missingVoices);

      const hasAllVoices = missingVoices.length === 0;
      const hasReward = !!matchingReward;

      // Check quiz 3 image options using pre-loaded JSON content
      const normalizedPath = json.path.replace(/\\/g, '/');
      const jsonOptions = jsonOptionsMap.get(normalizedPath) || [];
      console.log(`🔍 Looking for options for ${json.name} at path: ${normalizedPath}`);
      console.log(`📋 Found options:`, jsonOptions);
      console.log(`🔑 JSON key: ${json.key}, order: ${json.order}`);
      const quiz3ImageOptions = checkQuiz3ImageOptions(json, allImages, jsonOptions);

      return {
        json,
        voices: matchingVoices,
        reward: matchingReward,
        hasAllVoices,
        hasReward,
        missingVoices,
        voiceTypes,
        quiz3ImageOptions
      };
    });
  };

  // Function to pre-load JSON content for quiz 3 options
  const loadJSONContentBatch = async (jsonAssets: Asset[]) => {
    console.log('🔧 loadJSONContentBatch called for:', jsonAssets.length, 'files');
    try {
      if (jsonAssets.length === 0) {
        return new Map<string, string[]>();
      }

      const paths = jsonAssets.map(asset => asset.path);
      console.log(`📄 Loading JSON content for ${jsonAssets.length} files`);
      
      const response = await fetch('/api/assets/json-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paths,
          channel: selectedChannel,
          topic: selectedTopic
        })
      });
      
      console.log(`📡 Response status: ${response.status}, ok: ${response.ok}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Batch loaded JSON content for ${Object.keys(result).length} files`);
        
        // Convert the result to a Map for easier lookup
        const jsonOptionsMap = new Map<string, string[]>();
        for (const [path, data] of Object.entries(result)) {
          const normalizedPath = path.replace(/\\/g, '/');
          const typedData = data as { options?: string[]; error?: string };
          if ('options' in typedData && Array.isArray(typedData.options)) {
            // Find the corresponding JSON asset
            const jsonAsset = jsonAssets.find(asset => 
              asset.path.replace(/\\/g, '/') === normalizedPath
            );
            
            if (jsonAsset) {
              // Get valid options without modifying the JSON file
              const optionsInfo = getValidOptionsForAvailableImages(jsonAsset, assets, typedData.options);
              jsonOptionsMap.set(normalizedPath, optionsInfo.originalOptions);
              console.log(`🎯 Quiz 3 options for ${path}:`, optionsInfo.originalOptions);
              if (optionsInfo.hasMismatch) {
                console.log(`⚠️ Warning: JSON has ${optionsInfo.originalOptions.length - optionsInfo.validOptions.length} invalid options`);
              }
            } else {
              jsonOptionsMap.set(normalizedPath, typedData.options);
              console.log(`🎯 Quiz 3 options for ${path}:`, typedData.options);
            }
          } else if ('error' in typedData) {
            console.error(`❌ Error loading ${path}:`, typedData.error);
            jsonOptionsMap.set(normalizedPath, []);
          }
        }
        
        console.log('📊 Final JSON options map size:', jsonOptionsMap.size);
        console.log('📊 JSON options map keys:', Array.from(jsonOptionsMap.keys()));
        
        return jsonOptionsMap;
      } else {
        console.error(`❌ Failed to load JSON content batch:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error loading JSON content batch:', error);
    }
    return new Map<string, string[]>();
  };

  // Function to check quiz 3 image options availability (synchronous version)
  const checkQuiz3ImageOptions = (jsonAsset: Asset, allImages: Asset[], jsonOptions: string[] = []) => {
    console.log('🔧 checkQuiz3ImageOptions called for:', jsonAsset.name, 'with options:', jsonOptions);
    console.log('🔍 Available images in options folder:', allImages.filter(img => img.path.includes('options')).map(img => img.name));
    try {
      const options = jsonOptions.length > 0 ? jsonOptions : [];
      
      // Check which images are available in the options folder
      const availableImages: string[] = [];
      const missingImages: string[] = [];

      options.forEach((option: string) => {
        // Look for images in the options folder with exact name matching
        const optionImage = allImages.find(img => {
          if (img.type !== 'image' || !img.path.includes('options')) {
            return false;
          }
          
          // Get the filename without extension
          const fileNameWithoutExt = img.name.replace(/\.(jpg|jpeg|png|gif|bmp)$/i, '');
          
          // Check for exact match (case-insensitive)
          return fileNameWithoutExt.toLowerCase() === option.toLowerCase();
        });
        
        if (optionImage) {
          availableImages.push(option);
          console.log(`✅ Found image for option "${option}": ${optionImage.name}`);
        } else {
          missingImages.push(option);
          console.log(`❌ Missing image for option "${option}"`);
        }
      });

      const hasAllImages = missingImages.length === 0;
      const completionRate = options.length > 0 ? (availableImages.length / options.length) * 100 : 0;

      console.log(`📊 Quiz 3 image options summary for ${jsonAsset.name}:`);
      console.log(`  Available: ${availableImages.length}/${options.length}`);
      console.log(`  Missing: ${missingImages.length}`);
      console.log(`  Available images:`, availableImages);
      console.log(`  Missing images:`, missingImages);

      return {
        options,
        availableImages,
        missingImages,
        hasAllImages,
        completionRate
      };
    } catch (error) {
      console.error('Error checking quiz 3 image options:', error);
      return {
        options: [],
        availableImages: [],
        missingImages: [],
        hasAllImages: false,
        completionRate: 0
      };
    }
  };

  const getValidOptionsForAvailableImages = (jsonAsset: Asset, allImages: Asset[], jsonOptions: string[]) => {
    console.log('🔧 getValidOptionsForAvailableImages called for:', jsonAsset.name);
    
    // Get available images in options folder
    const availableOptionImages = allImages.filter(img => 
      img.type === 'image' && img.path.includes('options')
    );
    
    console.log('📸 Available option images:', availableOptionImages.map(img => img.name));
    
    // Get the base names of available images (without extension)
    const availableOptions = availableOptionImages.map(img => 
      img.name.replace(/\.(jpg|jpeg|png|gif|bmp)$/i, '').toLowerCase()
    );
    
    console.log('📋 Available options (base names):', availableOptions);
    
    // Filter JSON options to only include those that have corresponding images
    const validOptions = jsonOptions.filter(option => 
      availableOptions.includes(option.toLowerCase())
    );
    
    console.log('✅ Valid options (with images):', validOptions);
    console.log('❌ Invalid options (no images):', jsonOptions.filter(option => 
      !availableOptions.includes(option.toLowerCase())
    ));
    
    // Return the original options but mark which ones are valid
    return {
      originalOptions: jsonOptions,
      validOptions: validOptions,
      hasMismatch: validOptions.length !== jsonOptions.length
    };
  };

  const fetchAssets = useCallback(async (searchTerm?: string, isSearch = false) => {
    console.log('🚀 fetchAssets called with:', { searchTerm, isSearch, selectedChannel, selectedTopic });
    try {
      if (isSearch) {
        setSearching(true);
      } else {
        setLoading(true);
      }
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedChannel) params.append('channel', selectedChannel);
      if (selectedTopic) params.append('topic', selectedTopic);
      
      const response = await fetch(`/api/assets?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch assets');
      
      const data = await response.json();
      
      // Process assets to add key and order information
      const processedAssets = data.assets.map((asset: Asset) => {
        const { key, order } = extractKeyAndOrder(asset.name, asset.type, asset.path);
        console.log(`Processing asset: ${asset.name} -> key: "${key}", order: ${order}, path: ${asset.path}`); // Debug log
        return { ...asset, key, order };
      });
      
      console.log('=== ASSET PROCESSING DEBUG ===');
      console.log('Total assets:', processedAssets.length);
      console.log('JSON files:', processedAssets.filter((a: Asset) => a.type === 'json').map((a: Asset) => a.name));
      console.log('Voice files:', processedAssets.filter((a: Asset) => a.type === 'voice').map((a: Asset) => a.name));
      console.log('Image files:', processedAssets.filter((a: Asset) => a.type === 'image').map((a: Asset) => a.name));
      console.log('Video files:', processedAssets.filter((a: Asset) => a.type === 'video').map((a: Asset) => a.name));
      
      setAssets(processedAssets);
      
      // Group assets by key - prioritize animal keys over voice type keys
      const groupedAssets = processedAssets.reduce((groups: { [key: string]: AssetGroup }, asset: Asset) => {
        let key = asset.key || 'unknown';
        
        // Special handling for voice files - they should be grouped with their corresponding JSON files
        if (asset.type === 'voice') {
          // Voice files are in directories like "voice/buoyancy_1/voice_lesson.mp3"
          // We need to match them with the corresponding JSON file "buoyancy_1.json"
          if (asset.path) {
            const pathParts = asset.path.split(/[\/\\]/); // Split by both forward and backward slashes
            const voiceDirIndex = pathParts.findIndex(part => part === 'voice');
            if (voiceDirIndex !== -1 && voiceDirIndex + 1 < pathParts.length) {
              const dirName = pathParts[voiceDirIndex + 1]; // This should be "buoyancy_1"
              const dirMatch = dirName.match(/^(.+?)_(\d+)$/);
              if (dirMatch) {
                const voiceKey = dirMatch[1];
                const voiceOrder = parseInt(dirMatch[2]);
                
                // Find the JSON file that matches this key and order
                const matchingJson = processedAssets.find((a: Asset) => 
                  a.type === 'json' && 
                  a.key === voiceKey && 
                  a.order === voiceOrder
                );
                
                if (matchingJson) {
                  key = voiceKey;
                  console.log(`Grouping voice file ${asset.name} with JSON key: "${key}" (matched by directory: ${dirName})`);
                } else {
                  // If no matching JSON found, use the voice key
                  key = voiceKey;
                  console.log(`No matching JSON found for voice file ${asset.name}, using key: "${key}"`);
                }
              } else {
                // Fallback: use the first available JSON file
                const firstJson = processedAssets.find((a: Asset) => 
                  a.type === 'json' && 
                  a.key && 
                  a.key !== 'unknown' &&
                  !a.key.startsWith('voice_')
                );
                
                if (firstJson) {
                  key = firstJson.key;
                  console.log(`Grouping voice file ${asset.name} with JSON key: "${key}" (fallback)`);
                } else {
                  key = 'voice_files';
                  console.log(`No JSON files found, grouping voice file ${asset.name} as: "${key}"`);
                }
              }
            } else {
              // Fallback: use the first available JSON file
              const firstJson = processedAssets.find((a: Asset) => 
                a.type === 'json' && 
                a.key && 
                a.key !== 'unknown' &&
                !a.key.startsWith('voice_')
              );
              
              if (firstJson) {
                key = firstJson.key;
                console.log(`Grouping voice file ${asset.name} with JSON key: "${key}" (fallback)`);
              } else {
                key = 'voice_files';
                console.log(`No JSON files found, grouping voice file ${asset.name} as: "${key}"`);
              }
            }
          } else {
            // Fallback: use the first available JSON file
            const firstJson = processedAssets.find((a: Asset) => 
              a.type === 'json' && 
              a.key && 
              a.key !== 'unknown' &&
              !a.key.startsWith('voice_')
            );
            
            if (firstJson) {
              key = firstJson.key;
              console.log(`Grouping voice file ${asset.name} with JSON key: "${key}" (fallback)`);
            } else {
              key = 'voice_files';
              console.log(`No JSON files found, grouping voice file ${asset.name} as: "${key}"`);
            }
          }
        }
        
        // Skip .DS_Store files
        if (asset.name === '.DS_Store') {
          return groups;
        }
        
        console.log(`Grouping asset ${asset.name} (${asset.type}) with key: "${key}"`); // Debug log
        
        if (!groups[key]) {
          groups[key] = {
            key: key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            assets: {
              videos: [],
              voices: [],
              jsons: [],
              rewards: [],
              jsonAssetPairs: [] // Initialize new field
            },
            renderStatus: {
              hasJson: false,
              hasImage: false,
              hasVideos: false,
              hasVoices: false,
              isComplete: false,
              requiredVoices: 0,
              availableVoices: 0,
              requiredRewards: 0,
              availableRewards: 0,
              jsonOrders: [],
              // Quiz 3 image options status
              hasQuiz3Images: false,
              requiredQuiz3Images: 0,
              availableQuiz3Images: 0
            }
          };
        }
        
        // Categorize assets
        if (asset.type === 'image') {
          // Only use images from the image directory, ignore images from reward directories
          if (asset.category === 'image') {
            groups[key].assets.image = asset;
          }
        } else if (asset.type === 'video') {
          if (asset.category === 'reward') {
            groups[key].assets.rewards.push(asset);
          } else {
            groups[key].assets.videos.push(asset);
          }
        } else if (asset.type === 'voice') {
          groups[key].assets.voices.push(asset);
        } else if (asset.type === 'json') {
          groups[key].assets.jsons.push(asset);
        }
        
        // Update basic render status (JSON orders, basic asset presence)
        if (asset.type === 'image' && asset.category === 'image') {
          groups[key].renderStatus.hasImage = true;
        } else if (asset.type === 'video' && asset.category === 'video') {
          groups[key].renderStatus.hasVideos = true;
        } else if (asset.type === 'json') {
          groups[key].renderStatus.hasJson = true;
          // Extract order from JSON filename (e.g., "alligator_1.json" -> 1)
          const orderMatch = asset.name.match(/_(\d+)\.json$/);
          if (orderMatch) {
            const order = parseInt(orderMatch[1]);
            if (!groups[key].renderStatus.jsonOrders.includes(order)) {
              groups[key].renderStatus.jsonOrders.push(order);
            }
          }
        } else if (asset.type === 'video' && asset.category === 'reward') {
          groups[key].renderStatus.availableRewards++;
        }
        
        // Calculate requirements based on JSON files
        const jsonCount = groups[key].renderStatus.jsonOrders.length;
        groups[key].renderStatus.requiredVoices = jsonCount * 9; // 9 voices per JSON
        groups[key].renderStatus.requiredRewards = jsonCount; // 1 reward per JSON
        groups[key].renderStatus.requiredQuiz3Images = jsonCount * 4; // 4 images per JSON for quiz 3 options
        
        return groups;
      }, {});
      
      // Pre-load JSON content for quiz 3 options
      const jsonAssets = processedAssets.filter((asset: Asset) => asset.type === 'json');
      
      console.log('=== JSON LOADING DEBUG ===');
      console.log('Search term:', searchTerm);
      console.log('Total JSON assets found:', jsonAssets.length);
      console.log('JSON assets:', jsonAssets.map((a: Asset) => ({ name: a.name, path: a.path, key: a.key })));
      
      // Load JSON content for all JSON files in a single batch request
      const jsonOptionsMap = await loadJSONContentBatch(jsonAssets);

      console.log('=== JSON OPTIONS MAP ===');
      console.log('Map size:', jsonOptionsMap.size);
      for (const [path, options] of jsonOptionsMap.entries()) {
        console.log(`Path: ${path} -> Options:`, options);
      }
      
      // Debug: Show what paths we're looking for
      console.log('=== PATH DEBUG ===');
      jsonAssets.forEach((asset: Asset) => {
        const normalizedPath = asset.path.replace(/\\/g, '/');
        console.log(`Asset: ${asset.name}`);
        console.log(`  Original path: ${asset.path}`);
        console.log(`  Normalized path: ${normalizedPath}`);
        console.log(`  In map: ${jsonOptionsMap.has(normalizedPath)}`);
      });

      // For quiz 3 image checking and voice checking, we need ALL available assets, not just search results
      // So we'll load all assets separately for this purpose
      let allImagesForChecking: Asset[] = [];
      let allVoicesForChecking: Asset[] = [];
      
      if (searchTerm) {
        // If searching, we need to get all assets for checking
        try {
          const allAssetsResponse = await fetch(`/api/assets?channel=${selectedChannel}&topic=${selectedTopic}`);
          if (allAssetsResponse.ok) {
            const allAssetsData = await allAssetsResponse.json();
            const allAssets = allAssetsData.assets.map((asset: Asset) => {
              const { key, order } = extractKeyAndOrder(asset.name, asset.type, asset.path);
              return { ...asset, key, order };
            });
            
            allImagesForChecking = allAssets.filter((asset: Asset) => asset.type === 'image');
            allVoicesForChecking = allAssets.filter((asset: Asset) => asset.type === 'voice');
          }
        } catch (error) {
          console.error('Error loading all assets for checking:', error);
          allImagesForChecking = processedAssets.filter((asset: Asset) => asset.type === 'image');
          allVoicesForChecking = processedAssets.filter((asset: Asset) => asset.type === 'voice');
        }
      } else {
        // If not searching, use the current processed assets
        allImagesForChecking = processedAssets.filter((asset: Asset) => asset.type === 'image');
        allVoicesForChecking = processedAssets.filter((asset: Asset) => asset.type === 'voice');
      }
      
      console.log('🔍 Images available for quiz 3 checking:', allImagesForChecking.length);
      console.log('🎵 Voices available for checking:', allVoicesForChecking.length);
      
      // Now calculate the complete render status using the complete asset lists
      Object.values(groupedAssets).forEach((group) => {
        const groupKey = (group as AssetGroup).key;
        
        // Calculate voice availability from complete voice list with EXACT filename matching
        const groupVoices = allVoicesForChecking.filter(voice => voice.key === groupKey);
        (group as AssetGroup).renderStatus.hasVoices = groupVoices.length > 0;
        
        // Count only voices with exact correct filenames
        let validVoiceCount = 0;
        groupVoices.forEach(voice => {
          const voiceName = voice.name.toLowerCase();
          // Check for exact filename matches only
          if (voiceName === 'voice_title.mp3' ||
              voiceName === 'voice_q1_title.mp3' ||
              voiceName === 'voice_q1_ans.mp3' ||
              voiceName === 'voice_q2_title.mp3' ||
              voiceName === 'voice_q2_ans.mp3' ||
              voiceName === 'voice_q3_title.mp3' ||
              voiceName === 'voice_q3_ans.mp3' ||
              voiceName === 'voice_lesson.mp3' ||
              voiceName === 'voice_reward.mp3') {
            validVoiceCount++;
          }
        });
        
        (group as AssetGroup).renderStatus.availableVoices = validVoiceCount;
        
        // Calculate quiz 3 image availability from complete image list
        const groupQuiz3Images = allImagesForChecking.filter(img => 
          img.category === 'options' && img.key === groupKey
        );
        (group as AssetGroup).renderStatus.hasQuiz3Images = groupQuiz3Images.length > 0;
        (group as AssetGroup).renderStatus.availableQuiz3Images = groupQuiz3Images.length;
        
        // Check if complete (has all required assets)
        const hasRequiredAssets = (group as AssetGroup).renderStatus.hasJson && 
                                 (group as AssetGroup).renderStatus.hasImage && 
                                 (group as AssetGroup).renderStatus.hasVideos && 
                                 (group as AssetGroup).renderStatus.availableVoices >= (group as AssetGroup).renderStatus.requiredVoices &&
                                 (group as AssetGroup).renderStatus.availableRewards >= (group as AssetGroup).renderStatus.requiredRewards &&
                                 (group as AssetGroup).renderStatus.availableQuiz3Images >= (group as AssetGroup).renderStatus.requiredQuiz3Images;
        (group as AssetGroup).renderStatus.isComplete = hasRequiredAssets;
        
        console.log(`📊 Render status for ${groupKey}:`, {
          totalVoices: groupVoices.length,
          validVoices: validVoiceCount,
          requiredVoices: (group as AssetGroup).renderStatus.requiredVoices,
          availableQuiz3Images: (group as AssetGroup).renderStatus.availableQuiz3Images,
          requiredQuiz3Images: (group as AssetGroup).renderStatus.requiredQuiz3Images
        });
      });
      
      // Organize JSON-Asset pairs for each group
      Object.values(groupedAssets).forEach((group) => {
        (group as AssetGroup).assets.jsonAssetPairs = organizeJSONAssetPairs(
          (group as AssetGroup).assets.jsons, 
          allVoicesForChecking, // Always use complete voice list for checking
          (group as AssetGroup).assets.rewards,
          allImagesForChecking, // Always use complete image list for quiz 3 checking
          jsonOptionsMap
        );
        
        // Calculate quiz 3 image options status
        const groupAsAssetGroup = group as AssetGroup;
        let totalAvailableQuiz3Images = 0;
        let hasQuiz3Images = false;
        
        groupAsAssetGroup.assets.jsonAssetPairs.forEach(pair => {
          if (pair.quiz3ImageOptions.hasAllImages) {
            totalAvailableQuiz3Images += pair.quiz3ImageOptions.options.length; // Use actual options length
            hasQuiz3Images = true;
          } else {
            totalAvailableQuiz3Images += pair.quiz3ImageOptions.availableImages.length;
            if (pair.quiz3ImageOptions.availableImages.length > 0) {
              hasQuiz3Images = true;
            }
          }
        });
        
        groupAsAssetGroup.renderStatus.availableQuiz3Images = totalAvailableQuiz3Images;
        groupAsAssetGroup.renderStatus.hasQuiz3Images = hasQuiz3Images;
      });
      
      setAssetGroups(Object.values(groupedAssets));
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      if (isSearch) {
        setSearching(false);
      } else {
        setLoading(false);
      }
    }
  }, [selectedChannel, selectedTopic]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        console.log('🔍 Triggering server-side search for:', searchQuery);
        fetchAssets(searchQuery, true); // isSearch = true
      } else {
        console.log('🔄 Resetting to all assets');
        fetchAssets('', true); // Reset to all assets, but still use search state
      }
    }, 500); // Increased delay to 500ms for better typing experience

    return () => clearTimeout(timer);
  }, [searchQuery, fetchAssets]);

  // Filter change effect
  useEffect(() => {
    fetchAssets();
  }, [selectedChannel, selectedTopic, fetchAssets]);

  // Initial load effect
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedChannel, selectedTopic, sortBy, sortOrder]);

  // Client-side filtered assets for immediate search feedback
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [assets, searchQuery]);

  // Client-side filtered asset groups for immediate search feedback
  const filteredAssetGroups = useMemo(() => {
    // If there's a search query, use the server-side search results (assetGroups)
    // instead of client-side filtering to ensure proper JSON content
    if (searchQuery.trim()) {
      console.log('🔍 Using server-side search results for query:', searchQuery);
      let filtered = assetGroups.filter(group => 
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.assets.jsons.some(json => json.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        group.assets.videos.some(video => video.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        group.assets.voices.some(voice => voice.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      // Sort the filtered groups
      console.log(`Sorting server-side results by: ${sortBy}, Order: ${sortOrder}, Groups: ${filtered.length}`);
      filtered.sort((a, b) => {
        if (sortBy === 'createDate') {
          // Get the earliest JSON file creation date for each group
          const getEarliestJsonDate = (group: AssetGroup): Date => {
            if (group.assets.jsons.length === 0) {
              // If no JSON files, use a very old date to push to the end
              return new Date(0);
            }
            
            // Find the JSON with the earliest lastModified date
            const earliestJson = group.assets.jsons.reduce((earliest, current) => {
              const earliestDate = earliest.lastModified ? new Date(earliest.lastModified) : new Date(0);
              const currentDate = current.lastModified ? new Date(current.lastModified) : new Date(0);
              return earliestDate < currentDate ? earliest : current;
            });
            
            return earliestJson.lastModified ? new Date(earliestJson.lastModified) : new Date(0);
          };

          const dateA = getEarliestJsonDate(a);
          const dateB = getEarliestJsonDate(b);
          
          if (sortOrder === 'asc') {
            return dateA.getTime() - dateB.getTime();
          } else {
            return dateB.getTime() - dateA.getTime();
          }
        } else {
          // Sort by name
          console.log(`Comparing names: "${a.name}" vs "${b.name}"`);
          if (sortOrder === 'asc') {
            return a.name.localeCompare(b.name);
          } else {
            return b.name.localeCompare(a.name);
          }
        }
      });

      return filtered;
    } else {
      // No search query, use all asset groups with client-side filtering for sorting only
      console.log('📋 No search query, using all asset groups');
      let filtered = assetGroups;

      // Sort the filtered groups
      console.log(`Sorting all groups by: ${sortBy}, Order: ${sortOrder}, Groups: ${filtered.length}`);
      filtered.sort((a, b) => {
        if (sortBy === 'createDate') {
          // Get the earliest JSON file creation date for each group
          const getEarliestJsonDate = (group: AssetGroup): Date => {
            if (group.assets.jsons.length === 0) {
              // If no JSON files, use a very old date to push to the end
              return new Date(0);
            }
            
            // Find the JSON with the earliest lastModified date
            const earliestJson = group.assets.jsons.reduce((earliest, current) => {
              const earliestDate = earliest.lastModified ? new Date(earliest.lastModified) : new Date(0);
              const currentDate = current.lastModified ? new Date(current.lastModified) : new Date(0);
              return earliestDate < currentDate ? earliest : current;
            });
            
            return earliestJson.lastModified ? new Date(earliestJson.lastModified) : new Date(0);
          };

          const dateA = getEarliestJsonDate(a);
          const dateB = getEarliestJsonDate(b);
          
          if (sortOrder === 'asc') {
            return dateA.getTime() - dateB.getTime();
          } else {
            return dateB.getTime() - dateA.getTime();
          }
        } else {
          // Sort by name
          console.log(`Comparing names: "${a.name}" vs "${b.name}"`);
          if (sortOrder === 'asc') {
            return a.name.localeCompare(b.name);
          } else {
            return b.name.localeCompare(a.name);
          }
        }
      });

      return filtered;
    }
  }, [assetGroups, searchQuery, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAssetGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssetGroups = filteredAssetGroups.slice(startIndex, endIndex);

  const getAssetIcon = (type: string) => {
    // Return a simple text representation for now
    return () => <span className="text-2xl">{type === 'voice' ? '🎵' : type === 'image' ? '🖼️' : type === 'video' ? '🎥' : '📄'}</span>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return CheckCircleIcon;
      case 'missing': return XCircleIcon;
      case 'processing': return ExclamationTriangleIcon;
      default: return ExclamationTriangleIcon;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-500';
      case 'missing': return 'text-red-500';
      case 'processing': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getRenderStatusDisplay = (renderStatus: AssetGroup['renderStatus']) => {
    const statuses = [];
    if (renderStatus.hasJson) statuses.push(`📄 JSON (${renderStatus.jsonOrders.length})`);
    if (renderStatus.hasImage) statuses.push('🖼️ Image');
    if (renderStatus.hasVideos) statuses.push('🎥 Videos');
    if (renderStatus.hasVoices) statuses.push(`🎵 Voices (${renderStatus.availableVoices}/${renderStatus.requiredVoices})`);
    if (renderStatus.availableRewards > 0) statuses.push(`🏆 Rewards (${renderStatus.availableRewards}/${renderStatus.requiredRewards})`);
    if (renderStatus.hasQuiz3Images) statuses.push(`🖼️ Quiz 3 Images (${renderStatus.availableQuiz3Images}/${renderStatus.requiredQuiz3Images})`);
    
    // Calculate completion rate based on all requirements
    const totalRequirements = 5; // JSON, Image, Videos, Voices+Rewards, Quiz 3 Images
    const metRequirements = [
      renderStatus.hasJson,
      renderStatus.hasImage,
      renderStatus.hasVideos,
      renderStatus.availableVoices >= renderStatus.requiredVoices && renderStatus.availableRewards >= renderStatus.requiredRewards,
      renderStatus.availableQuiz3Images >= renderStatus.requiredQuiz3Images
    ].filter(Boolean).length;
    
    const completionRate = Math.round((metRequirements / totalRequirements) * 100);
    let statusColor = 'text-red-400';
    if (completionRate >= 75) statusColor = 'text-green-400';
    else if (completionRate >= 50) statusColor = 'text-yellow-400';
    
    return {
      statuses,
      completionRate,
      statusColor,
      isComplete: renderStatus.isComplete,
      jsonCount: renderStatus.jsonOrders.length,
      voiceProgress: `${renderStatus.availableVoices}/${renderStatus.requiredVoices}`,
      rewardProgress: `${renderStatus.availableRewards}/${renderStatus.requiredRewards}`,
      missingVoices: Math.max(0, renderStatus.requiredVoices - renderStatus.availableVoices),
      missingRewards: Math.max(0, renderStatus.requiredRewards - renderStatus.availableRewards),
      // Add image and video status
      hasImage: renderStatus.hasImage,
      hasVideos: renderStatus.hasVideos,
      imageStatus: renderStatus.hasImage ? 'Available' : 'Missing',
      videoStatus: renderStatus.hasVideos ? 'Available' : 'Missing',
      // Add quiz 3 image options status
      quiz3ImageProgress: `${renderStatus.availableQuiz3Images}/${renderStatus.requiredQuiz3Images}`,
      missingQuiz3Images: Math.max(0, renderStatus.requiredQuiz3Images - renderStatus.availableQuiz3Images)
    };
  };

  // Helper function to get the earliest JSON creation date for a group
  const getEarliestJsonDate = (group: AssetGroup): Date | null => {
    if (group.assets.jsons.length === 0) {
      return null;
    }
    
    // Find the JSON with the earliest lastModified date
    const earliestJson = group.assets.jsons.reduce((earliest, current) => {
      const earliestDate = earliest.lastModified ? new Date(earliest.lastModified) : new Date(0);
      const currentDate = current.lastModified ? new Date(current.lastModified) : new Date(0);
      return earliestDate < currentDate ? earliest : current;
    });
    
    return earliestJson.lastModified ? new Date(earliestJson.lastModified) : null;
  };

  // Helper function to format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return 'No date';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAssetSelect = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSelectAll = () => {
    setSelectedAssets(filteredAssets.map(asset => asset.id));
  };

  const handleDeselectAll = () => {
    setSelectedAssets([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedAssets.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedAssets.length} asset(s)?`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/assets', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assetIds: selectedAssets }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete assets');
      }

      const data = await response.json();
      
      // Refresh assets list
      fetchAssets();
      
      setSelectedAssets([]);
      alert(`Successfully deleted ${data.deleted.length} asset(s)`);
    } catch (error) {
      console.error('Error deleting assets:', error);
      alert('Failed to delete assets. Please try again.');
    }
  };

  const handleUploadAssets = async (files: FileList) => {
    alert('Upload functionality requires category selection. Please implement category selection first.');
  };

  // Check for duplicate subjects
  const checkDuplicateSubject = (subject: string) => {
    if (!subject.trim()) {
      return false;
    }
    
    const normalizedSubject = subject.toLowerCase().trim();
    const existingSubjects = assetGroups.map(group => group.key.toLowerCase());
    
    if (existingSubjects.includes(normalizedSubject)) {
      return true;
    } else {
      return false;
    }
  };

  // Check for existing orders for a subject
  const checkExistingOrders = (subject: string) => {
    if (!subject.trim()) {
      setExistingOrders([]);
      return;
    }
    
    const normalizedSubject = subject.toLowerCase().trim();
    const existingJsons = assetGroups
      .filter(group => group.key.toLowerCase() === normalizedSubject)
      .flatMap(group => group.assets.jsons);
    
    const orders = existingJsons
      .map(json => json.order)
      .filter((order): order is number => order !== undefined)
      .sort((a, b) => a - b);
    
    setExistingOrders(orders);
  };

  // Handle subject input change
  const handleSubjectChange = (value: string) => {
    setAiPrompt(value);
    checkExistingOrders(value);
  };

  // Parse subjects list from text input
  const parseSubjectsList = (text: string): string[] => {
    return text
      .split(/[\n,;]/)
      .map(subject => subject.trim())
      .filter(subject => subject.length > 0);
  };

  // Get existing orders for multiple subjects
  const getExistingOrdersForSubjects = (subjects: string[]): { [key: string]: number[] } => {
    const result: { [key: string]: number[] } = {};
    
    subjects.forEach(subject => {
      const normalizedSubject = subject.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const existingJsons = assetGroups
        .filter(group => group.key.toLowerCase() === normalizedSubject)
        .flatMap(group => group.assets.jsons);
      
      const orders = existingJsons
        .map(json => json.order)
        .filter((order): order is number => order !== undefined)
        .sort((a, b) => a - b);
      
      result[normalizedSubject] = orders;
    });
    
    return result;
  };

  const generateAIContent = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a subject for AI generation');
      return;
    }

    setAiGenerating(true);
    
    try {
      // Calculate next order number
      const nextOrder = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 1;
      
      // Get existing content for this subject to avoid repetition
      const existingJsons = assetGroups
        .filter(group => group.key.toLowerCase() === aiPrompt.toLowerCase().trim())
        .flatMap(group => group.assets.jsons);
      
      // Read actual content from existing JSON files
      const existingContentData = [];
      for (const json of existingJsons) {
        try {
          const response = await fetch(`/api/assets/preview?path=${encodeURIComponent(json.path)}&channel=${selectedChannel}&topic=${selectedTopic}`);
          if (response.ok) {
            const content = await response.text();
            const jsonData = JSON.parse(content);
            existingContentData.push({
              filename: json.name,
              order: json.order,
              intro: jsonData.intro?.text || '',
              quiz1: jsonData.quiz_1?.question?.text || '',
              quiz2: jsonData.quiz_2?.question?.text || '',
              quiz3: jsonData.quiz_3?.question?.text || '',
              lesson: jsonData.lesson?.voice || '',
              reward: jsonData.reward?.voice || ''
            });
          }
        } catch (error) {
          console.error(`Error reading JSON file ${json.name}:`, error);
        }
      }
      
      // Get available inputs for quiz_3 (images from the current topic)
      const availableInputs = assets
        .filter(asset => asset.type === 'image' && asset.category === 'image')
        .map(asset => asset.key)
        .filter((key, index, arr) => arr.indexOf(key) === index); // Remove duplicates
      
      const response = await fetch('/api/assets/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          description: aiDescription,
          language: aiLanguage,
          topic: selectedTopic,
          provider: aiProvider,
          order: nextOrder,
          existingContent: existingContentData,
          previewItems: previewItems.map(item => ({
            order: item.order,
            intro: item.intro.text,
            quiz1: item.quiz_1.question.text,
            quiz2: item.quiz_2.question.text,
            quiz3: item.quiz_3.question.text,
            lesson: item.lesson.voice,
            reward: item.reward.voice
          })),
          availableInputs: availableInputs
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      const newContent = { ...data.content, order: nextOrder, id: `${data.content.key}_${nextOrder}_${Date.now()}` };
      
      // Add to preview items
      setPreviewItems(prev => [...prev, newContent]);
      
      // Update existing orders
      setExistingOrders(prev => [...prev, nextOrder].sort((a, b) => a - b));
      
    } catch (error) {
      console.error('Error generating AI content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const generateBatchAIContent = async () => {
    console.log('🔥 BATCH GENERATION FUNCTION CALLED 🔥');
    
    // Prevent multiple simultaneous batch generations
    if (batchGenerating) {
      console.log('Batch generation already in progress, ignoring duplicate call');
      return;
    }

    const subjects = parseSubjectsList(subjectsList);
    if (subjects.length === 0) {
      alert('Please enter at least one subject for batch generation');
      return;
    }

    if (batchSize < 1) {
      alert('Please enter a valid batch size (minimum 1)');
      return;
    }

    console.log('=== STARTING BATCH GENERATION ===');
    console.log('Subjects:', subjects);
    console.log('Batch size:', batchSize);
    console.log('Current preview items count:', previewItems.length);

    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: subjects.length * batchSize, subject: '' });
    
    try {
      const allNewContent: SK3QLRContent[] = [];
      const existingOrdersMap = getExistingOrdersForSubjects(subjects);
      
      // Maintain a local array of preview items that gets updated synchronously
      let currentPreviewItems = [...previewItems];
      
      // Get available inputs for quiz_3 (images from the current topic)
      const availableInputs = assets
        .filter(asset => asset.type === 'image' && asset.category === 'image')
        .map(asset => asset.key)
        .filter((key, index, arr) => arr.indexOf(key) === index); // Remove duplicates
      
      for (let subjectIndex = 0; subjectIndex < subjects.length; subjectIndex++) {
        const subject = subjects[subjectIndex];
        // Normalize subject the same way the API does
        const normalizedSubject = subject.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const existingOrders = existingOrdersMap[normalizedSubject] || [];
        
        // Get existing preview items for this subject to calculate next order
        // Normalize subject the same way the API does
        const existingPreviewItems = currentPreviewItems.filter(item => item.key.toLowerCase() === normalizedSubject);
        const existingPreviewOrders = existingPreviewItems.map(item => item.order);
        
        console.log(`🔍 KEY MATCHING DEBUG for ${subject}:`);
        console.log('Subject (original):', subject);
        console.log('Subject (normalized):', normalizedSubject);
        console.log('All preview items keys:', previewItems.map(item => item.key));
        console.log('Matching preview items:', existingPreviewItems);
        console.log('Found orders:', existingPreviewOrders);
        
        // Combine existing orders from both sources
        const allExistingOrders = [...existingOrders, ...existingPreviewOrders];
        const maxExistingOrder = allExistingOrders.length > 0 ? Math.max(...allExistingOrders) : 0;
        
        // Track the current highest order for this subject within this batch
        let currentBatchMaxOrder = maxExistingOrder;
        
        console.log(`=== BATCH GENERATION DEBUG for ${subject} ===`);
        console.log('Existing orders from disk:', existingOrders);
        console.log('Existing preview orders:', existingPreviewOrders);
        console.log('All existing orders:', allExistingOrders);
        console.log('Max existing order:', maxExistingOrder);
        console.log('Starting currentBatchMaxOrder:', currentBatchMaxOrder);
        
        for (let batchIndex = 0; batchIndex < batchSize; batchIndex++) {
          const currentProgress = subjectIndex * batchSize + batchIndex + 1;
          setBatchProgress({ 
            current: currentProgress, 
            total: subjects.length * batchSize, 
            subject: subject 
          });
          
          // Calculate next order number for this subject
          const nextOrder = currentBatchMaxOrder + 1;
          
          console.log(`--- Generating item ${batchIndex + 1} for ${subject} ---`);
          console.log('Current batch max order:', currentBatchMaxOrder);
          console.log('Calculated next order:', nextOrder);
          
          // Get existing content for this subject to avoid repetition
          const existingJsons = assetGroups
            .filter(group => group.key.toLowerCase() === normalizedSubject)
            .flatMap(group => group.assets.jsons);
          
          // Read actual content from existing JSON files
          const existingContentData = [];
          for (const json of existingJsons) {
            try {
              const response = await fetch(`/api/assets/preview?path=${encodeURIComponent(json.path)}&channel=${selectedChannel}&topic=${selectedTopic}`);
              if (response.ok) {
                const content = await response.text();
                const jsonData = JSON.parse(content);
                existingContentData.push({
                  filename: json.name,
                  order: json.order,
                  intro: jsonData.intro?.text || '',
                  quiz1: jsonData.quiz_1?.question?.text || '',
                  quiz2: jsonData.quiz_2?.question?.text || '',
                  quiz3: jsonData.quiz_3?.question?.text || '',
                  lesson: jsonData.lesson?.voice || '',
                  reward: jsonData.reward?.voice || ''
                });
              }
            } catch (error) {
              console.error(`Error reading JSON file ${json.name}:`, error);
            }
          }
          
          // Get existing preview items for this specific subject only
          const existingPreviewItemsForSubject = currentPreviewItems.filter(item => 
            item.key.toLowerCase() === normalizedSubject
          );
          
          // Convert preview items to the format expected by the API
          const existingPreviewContent = existingPreviewItemsForSubject.map(item => ({
            order: item.order,
            intro: item.intro.text,
            quiz1: item.quiz_1.question.text,
            quiz2: item.quiz_2.question.text,
            quiz3: item.quiz_3.question.text,
            lesson: item.lesson.voice,
            reward: item.reward.voice
          }));
          
          try {
            const response = await fetch('/api/assets/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                prompt: subject,
                description: aiDescription,
                language: aiLanguage,
                topic: selectedTopic,
                provider: aiProvider,
                order: nextOrder,
                existingContent: existingContentData,
                previewItems: existingPreviewContent, // Only send content for this specific subject
                availableInputs: availableInputs
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to generate content for ${subject}_${nextOrder}`);
            }

            const data = await response.json();
            const newContent = { 
              ...data.content, 
              order: nextOrder, 
              id: `${data.content.key}_${nextOrder}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            allNewContent.push(newContent);
            
            // Update both the React state and local array immediately so subsequent generations can see this content
            setPreviewItems(prev => {
              const newPreviewItems = [...prev, newContent];
              console.log(`✓ Updated previewItems for ${subject} order ${nextOrder}`);
              console.log('Current previewItems count:', newPreviewItems.length);
              return newPreviewItems;
            });
            
            // Update local array synchronously for next iteration
            currentPreviewItems.push(newContent);
            console.log(`✓ Updated local currentPreviewItems for ${subject} order ${nextOrder}`);
            console.log('Local currentPreviewItems count:', currentPreviewItems.length);
            
            console.log(`✓ Successfully generated ${subject} order ${nextOrder}`);
            console.log('New content added:', newContent);
            
            // Update the current batch max order for the next iteration
            currentBatchMaxOrder = nextOrder;
            console.log('Updated currentBatchMaxOrder to:', currentBatchMaxOrder);
          } catch (error) {
            console.error(`Error generating content for ${subject}_${nextOrder}:`, error);
            // Continue with other items even if one fails
          }
        }
      }
      
      // Show success message
      setToast({ 
        message: `Successfully generated ${allNewContent.length} content items for ${subjects.length} subjects`, 
        type: 'success' 
      });
      setTimeout(() => setToast(null), 5000);
      
    } catch (error) {
      console.error('Error in batch generation:', error);
      setToast({ 
        message: `Batch generation failed: ${(error as Error).message}`, 
        type: 'error' 
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setBatchGenerating(false);
      setBatchProgress(null);
    }
  };

  const removePreviewItem = (index: number) => {
    setPreviewItems(prev => {
      const newItems = prev.filter((_, i) => i !== index);
      return newItems;
    });
  };

  const clearAllPreviews = () => {
    setPreviewItems([]);
    // Reset existing orders to original state
    if (isBatchMode) {
      // For batch mode, reset all subjects' orders
      const subjects = parseSubjectsList(subjectsList);
      subjects.forEach(subject => {
        checkExistingOrders(subject);
      });
    } else {
      checkExistingOrders(aiPrompt);
    }
  };

  const approveGeneratedContent = async () => {
    if (previewItems.length === 0) {
      alert('No content to approve');
      return;
    }

    try {
      // Create all render files
      const results = [];
      for (const content of previewItems) {
        const response = await fetch('/api/assets/render', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: content,
            channel: selectedChannel,
            topic: selectedTopic
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create render file for ${content.key}_${content.order}.json`);
        }

        const data = await response.json();
        results.push(data.fileName);
      }
      
      // Refresh assets list to show the new files
      fetchAssets();
      
      // Show success dialog
      setSuccessMessage(`Successfully created ${results.length} render file(s): ${results.join(', ')}`);
      setShowSuccessDialog(true);
      
      // Clear previews and close dialog
      setPreviewItems([]);
      setShowAIGenerator(false);
      
    } catch (error) {
      console.error('Error creating render files:', error);
      alert('Failed to create render files. Please try again.');
    }
  };

  const handlePreviewAsset = (asset: Asset, videoMode = false) => {
    setPreviewAsset(asset);
    setPreviewVideoMode(videoMode);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    // Stop any playing media when closing
    const videos = document.querySelectorAll('video');
    const audios = document.querySelectorAll('audio');
    
    videos.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
    
    audios.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    setShowPreview(false);
    setPreviewVideoMode(false);
  };

  const getAssetPreviewContent = (asset: Asset) => {
    const previewUrl = `/api/assets/preview?path=${encodeURIComponent(asset.path)}&channel=${selectedChannel}&topic=${selectedTopic}`;
    
    switch (asset.type) {
      case 'image':
        return (
          <div className="text-center">
            <img 
              src={previewUrl}
              alt={asset.name}
              className="max-w-full max-h-96 object-contain rounded-lg"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2Ij5JbWFnZSBQcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K';
              }}
            />
          </div>
        );
      case 'video':
        return (
          <video 
            controls 
            autoPlay
            className="max-w-full max-h-96 rounded-lg"
            src={previewUrl}
          >
            Your browser does not support the video tag.
          </video>
        );
      case 'voice':
        return (
          <div className="text-center space-y-4">
            <div className="text-6xl">🎵</div>
            <audio controls autoPlay className="w-full">
              <source src={previewUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            <p className="text-gray-300">{asset.name}</p>
          </div>
        );
      case 'json':
        return (
          <JSONPreview asset={asset} initialViewMode={previewVideoMode ? 'video' : 'json'} />
        );
      default:
        return <div className="text-center text-gray-400">Preview not available</div>;
    }
  };

  // JSON Preview Component
  const JSONPreview = ({ asset, initialViewMode = 'json' }: { asset: Asset; initialViewMode?: 'json' | 'video' }) => {
    const [jsonContent, setJsonContent] = useState<string>('Loading...');
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'json' | 'video'>(initialViewMode);
    const [parsedJson, setParsedJson] = useState<any>(null);

    useEffect(() => {
      const loadJSON = async () => {
        try {
          // Add cache-busting parameter to ensure fresh content
          const timestamp = Date.now();
          const response = await fetch(`/api/assets/preview?path=${encodeURIComponent(asset.path)}&channel=${selectedChannel}&topic=${selectedTopic}&t=${timestamp}`);
          if (response.ok) {
            const content = await response.text();
            const parsed = JSON.parse(content);
            const formattedContent = JSON.stringify(parsed, null, 2);
            setJsonContent(formattedContent);
            setEditContent(formattedContent);
            setParsedJson(parsed);
          } else {
            setJsonContent('Failed to load JSON content');
          }
        } catch (error) {
          setJsonContent('Error loading JSON content');
        } finally {
          setLoading(false);
        }
      };

      loadJSON();
    }, [asset.path, selectedChannel, selectedTopic]);

    const handleEdit = () => {
      setIsEditing(true);
    };

    const handleCancel = () => {
      setIsEditing(false);
      setEditContent(jsonContent); // Reset to original content
    };

    const reloadJsonContent = async () => {
      try {
        // Add cache-busting parameter to ensure fresh content
        const timestamp = Date.now();
        const response = await fetch(`/api/assets/preview?path=${encodeURIComponent(asset.path)}&channel=${selectedChannel}&topic=${selectedTopic}&t=${timestamp}`);
        if (response.ok) {
          const content = await response.text();
          const parsed = JSON.parse(content);
          const formattedContent = JSON.stringify(parsed, null, 2);
          setJsonContent(formattedContent);
          setEditContent(formattedContent);
          setParsedJson(parsed);
        }
      } catch (error) {
        console.error('Error reloading JSON content:', error);
      }
    };

    const handleSave = async () => {
      try {
        setSaving(true);
        
        // Validate JSON
        let parsedJson;
        try {
          parsedJson = JSON.parse(editContent);
        } catch (error) {
          alert('Invalid JSON format. Please check your syntax.');
          return;
        }

        const response = await fetch('/api/assets/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: asset.path,
            channel: selectedChannel,
            topic: selectedTopic,
            content: parsedJson
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save JSON content');
        }

        // Reload the content from server to ensure we have the latest data
        await reloadJsonContent();
        setIsEditing(false);
        
        // Show success message without blocking UI
        setToast({ message: 'JSON content saved successfully!', type: 'success' });
        setTimeout(() => setToast(null), 3000);
        
        // Update the specific asset in the state instead of refreshing all assets
        setAssetGroups(prevGroups => {
          return prevGroups.map(group => {
            if (group.key === asset.key) {
              return {
                ...group,
                assets: {
                  ...group.assets,
                  jsons: group.assets.jsons.map(json => {
                    if (json.id === asset.id) {
                      return {
                        ...json,
                        lastModified: new Date()
                      };
                    }
                    return json;
                  })
                }
              };
            }
            return group;
          });
        });
        
      } catch (error) {
        console.error('Error saving JSON content:', error);
        alert('Failed to save JSON content. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    // Video Preview Component
    const VideoPreview = ({ jsonData, asset }: { jsonData: any; asset: Asset }) => {
      const [currentSection, setCurrentSection] = useState(0);
      const [isPlaying, setIsPlaying] = useState(false);
      const [currentTime, setCurrentTime] = useState(0);
      const [totalDuration, setTotalDuration] = useState(0);
      const videoRef = useRef<HTMLVideoElement>(null);

      const sections = [
        { name: 'Intro', icon: '🎬', duration: 5 },
        { name: 'Quiz 1', icon: '❓', duration: 8 },
        { name: 'Quiz 2', icon: '❓', duration: 8 },
        { name: 'Quiz 3', icon: '❓', duration: 8 },
        { name: 'Lesson', icon: '📚', duration: 6 },
        { name: 'Reward', icon: '🏆', duration: 4 }
      ];

      useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
          interval = setInterval(() => {
            setCurrentTime(prev => {
              const newTime = prev + 0.1;
              if (newTime >= totalDuration) {
                setIsPlaying(false);
                return 0;
              }
              
              // Update current section based on time
              let accumulatedTime = 0;
              for (let i = 0; i < sections.length; i++) {
                if (newTime < accumulatedTime + sections[i].duration) {
                  setCurrentSection(i);
                  break;
                }
                accumulatedTime += sections[i].duration;
              }
              
              return newTime;
            });
          }, 100);
        }
        return () => clearInterval(interval);
      }, [isPlaying, totalDuration]);

      useEffect(() => {
        // Calculate total duration
        const total = sections.reduce((sum, section) => sum + section.duration, 0);
        setTotalDuration(total);
        
        // Initialize current section based on time
        let accumulatedTime = 0;
        for (let i = 0; i < sections.length; i++) {
          if (currentTime < accumulatedTime + sections[i].duration) {
            setCurrentSection(i);
            break;
          }
          accumulatedTime += sections[i].duration;
        }
      }, [currentTime]);

      // Auto-play lesson and reward videos when section changes
      useEffect(() => {
        if ((currentSection === 4 || currentSection === 5) && videoRef.current) {
          videoRef.current.play().catch((e: any) => console.log('Auto-play failed:', e));
        }
      }, [currentSection]);



      const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
      };

      const handleSeek = (time: number) => {
        setCurrentTime(time);
        // Calculate which section we're in
        let accumulatedTime = 0;
        for (let i = 0; i < sections.length; i++) {
          if (time < accumulatedTime + sections[i].duration) {
            setCurrentSection(i);
            break;
          }
          accumulatedTime += sections[i].duration;
        }
      };

      const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };

      const getCurrentSectionContent = () => {
        if (!jsonData) return null;

        switch (currentSection) {
          case 0: // Intro
            return {
              title: 'Introduction',
              text: jsonData.intro?.text || 'No intro text available',
              voice: jsonData.intro?.voice || 'No voice available'
            };
          case 1: // Quiz 1
            return {
              title: 'Quiz 1',
              question: jsonData.quiz_1?.question?.text || 'No question available',
              options: jsonData.quiz_1?.options || [],
              answer: jsonData.quiz_1?.answer?.position || 0,
              voice: jsonData.quiz_1?.question?.voice || 'No voice available'
            };
          case 2: // Quiz 2
            return {
              title: 'Quiz 2',
              question: jsonData.quiz_2?.question?.text || 'No question available',
              options: jsonData.quiz_2?.options || [],
              answer: jsonData.quiz_2?.answer?.position || 0,
              voice: jsonData.quiz_2?.question?.voice || 'No voice available'
            };
          case 3: // Quiz 3
            return {
              title: 'Quiz 3',
              question: jsonData.quiz_3?.question?.text || 'No question available',
              options: jsonData.quiz_3?.options || [],
              answer: jsonData.quiz_3?.answer?.position || 0,
              voice: jsonData.quiz_3?.question?.voice || 'No voice available'
            };
          case 4: // Lesson
            return {
              title: 'Lesson',
              text: 'Educational content about the topic',
              voice: jsonData.lesson?.voice || 'No voice available'
            };
          case 5: // Reward
            return {
              title: 'Reward',
              text: 'Congratulations! You completed the lesson!',
              voice: jsonData.reward?.voice || 'No voice available'
            };
          default:
            return null;
        }
      };

      const content = getCurrentSectionContent();
      
      // Debug log to see if currentSection is updating
      console.log('VideoPreview - currentSection:', currentSection, 'currentTime:', currentTime, 'content:', content);

      return (
        <div className="bg-gray-800 rounded-lg p-6 space-y-6 min-h-[600px]">
          {/* Video Player Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🎬</div>
              <div>
                <h3 className="text-lg font-semibold text-white">Video Preview</h3>
                <p className="text-sm text-gray-400">{asset.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePlayPause}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
              >
                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0"
                max={totalDuration}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(currentTime / totalDuration) * 100}%, #374151 ${(currentTime / totalDuration) * 100}%, #374151 100%)`
                }}
              />
            </div>
          </div>

          {/* Section Indicators */}
          <div className="flex space-x-2">
            {sections.map((section, index) => {
              const sectionStart = sections.slice(0, index).reduce((sum, s) => sum + s.duration, 0);
              const sectionEnd = sectionStart + section.duration;
              const isActive = currentTime >= sectionStart && currentTime < sectionEnd;
              const isCompleted = currentTime >= sectionEnd;

              return (
                <button
                  key={section.name}
                  onClick={() => handleSeek(sectionStart)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-purple-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>{section.icon}</span>
                    <span>{section.name}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Current Section Content */}
          {content && (
            <div className="bg-gray-700 rounded-lg p-6 space-y-4 min-h-[400px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{sections[currentSection].icon}</div>
                  <h4 className="text-xl font-semibold text-white">{content.title}</h4>
                </div>
                <div className="text-sm text-gray-400">
                  Section {currentSection + 1} of {sections.length} • {formatTime(currentTime)} / {formatTime(totalDuration)}
                </div>
              </div>

              {/* Content Display */}
              <div className="space-y-4">
                {currentSection >= 1 && currentSection <= 3 ? (
                  // Quiz Section
                  <div className="space-y-4">
                    <div className="bg-gray-600 rounded-lg p-4">
                      <h5 className="text-lg font-medium text-white mb-2">Question:</h5>
                      <p className="text-gray-200">{content.question}</p>
                    </div>
                    
                                         <div className="grid grid-cols-2 gap-3">
                       {content.options.map((option: string, index: number) => (
                         <div
                           key={index}
                           className={`p-3 rounded-lg text-left transition-all ${
                             index === (content.answer - 1) // Convert 1-based to 0-based
                               ? 'bg-green-600 text-white border-2 border-green-400'
                               : 'bg-gray-600 text-gray-200'
                           }`}
                         >
                           <div className="flex items-center space-x-2">
                             <span className="text-sm font-medium">
                               {String.fromCharCode(65 + index)}.
                             </span>
                             <span>{option}</span>
                             {index === (content.answer - 1) && (
                               <span className="ml-auto text-green-200">✓</span>
                             )}
                           </div>
                           
                           {/* Show image for Quiz 3 if available */}
                           {currentSection === 3 && (
                             <div className="mt-2">
                               {(() => {
                                 const imagePath = `${config.workingDirectory}/${selectedChannel}/${selectedTopic}/image/options/${option.toLowerCase()}.png`;
                                 console.log('Quiz 3 Image Path:', imagePath);
                                 return (
                                   <img 
                                     src={`/api/assets/preview?path=${encodeURIComponent(imagePath)}&channel=${selectedChannel}&topic=${selectedTopic}`}
                                     alt={option}
                                     className="w-full aspect-square object-cover rounded"
                                     onError={(e) => {
                                       const img = e.currentTarget as HTMLImageElement;
                                       console.log('Image failed to load:', img.src);
                                       // Try jpg if png fails
                                       if (img.src.includes('.png')) {
                                         img.src = img.src.replace('.png', '.jpg');
                                       } else if (img.src.includes('.jpg')) {
                                         img.src = img.src.replace('.jpg', '.jpeg');
                                       } else {
                                         // Show placeholder if all formats fail
                                         img.src = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KPC9zdmc+`;
                                       }
                                     }}
                                   />
                                 );
                               })()}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                  </div>
                                 ) : (
                   // Non-Quiz Section
                   <div className="space-y-4">
                     <div className="bg-gray-600 rounded-lg p-4">
                       <h5 className="text-lg font-medium text-white mb-2">Content:</h5>
                       <p className="text-gray-200">{content.text}</p>
                     </div>
                     
                     {/* Show video preview for Lesson and Reward sections */}
                     {(currentSection === 4 || currentSection === 5) && (
                       <div className="bg-gray-600 rounded-lg p-4">
                         <h5 className="text-lg font-medium text-white mb-2">Video Preview:</h5>
                         <video 
                           ref={videoRef}
                           src={`/api/assets/preview?path=${encodeURIComponent(`${config.workingDirectory}/${selectedChannel}/${selectedTopic}/${currentSection === 5 ? `reward/output/reward_${asset.order}/${asset.key}.mp4` : `video/${asset.key}.mp4`}`)}&channel=${selectedChannel}&topic=${selectedTopic}`}
                           className={`w-full ${currentSection === 4 || currentSection === 5 ? 'aspect-square' : 'h-32'} object-cover rounded`}
                           controls
                           autoPlay={currentSection === 4 || currentSection === 5}
                           muted={currentSection === 4 || currentSection === 5}
                           onError={(e) => {
                             const video = e.currentTarget as HTMLVideoElement;
                             const fallback = video.nextElementSibling as HTMLElement;
                             if (video && fallback) {
                               video.style.display = 'none';
                               fallback.style.display = 'flex';
                             }
                           }}
                         />
                         <div className="w-full h-32 bg-gray-700 rounded flex items-center justify-center" style={{ display: 'none' }}>
                           <div className="text-center">
                             <div className="text-3xl mb-2">🎬</div>
                             <span className="text-sm text-gray-400">
                               {currentSection === 4 ? 'Lesson video not found' : `Reward video not found (${asset.key}.mp4)`}
                             </span>
                           </div>
                         </div>
                       </div>
                     )}
                   </div>
                 )}

                {/* Voice Preview */}
                <div className="bg-blue-600 rounded-lg p-4">
                  <h5 className="text-lg font-medium text-white mb-2">Voice Narration:</h5>
                  <p className="text-white">{content.voice}</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-sm text-blue-200">🎵</span>
                    <span className="text-sm text-blue-200">Voice file would play here</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="bg-gray-900 rounded-lg p-4 max-h-[80vh] overflow-auto w-full max-w-4xl">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h4 className="text-lg font-semibold text-purple-400">JSON Content</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('json')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      viewMode === 'json' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setViewMode('video')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      viewMode === 'video' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    🎬 Video Preview
                  </button>
                </div>
              </div>
              
              {viewMode === 'json' && !isEditing && (
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                >
                  Edit
                </button>
              )}
              
              {viewMode === 'json' && isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            
            {viewMode === 'json' ? (
              isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-80 bg-gray-800 text-gray-300 text-sm font-mono p-4 rounded border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                  placeholder="Edit JSON content here..."
                />
              ) : (
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                  {jsonContent}
                </pre>
              )
            ) : (
              <VideoPreview jsonData={parsedJson} asset={asset} />
            )}
          </div>
        )}
      </div>
    );
  };

  // State for tracking voice generation progress per JSON asset
  const [voiceGeneratingStates, setVoiceGeneratingStates] = useState<{ [key: string]: boolean }>({});

  const handleGenerateVoice = async (jsonAsset: Asset) => {
    const assetKey = `${jsonAsset.key}_${jsonAsset.order}`;
    
    // Set loading state for this specific asset
    setVoiceGeneratingStates(prev => ({ ...prev, [assetKey]: true }));
    
    try {
      // First, read the JSON content to get the text for voice generation
      const response = await fetch(`/api/assets/preview?path=${encodeURIComponent(jsonAsset.path)}&channel=${selectedChannel}&topic=${selectedTopic}`);
      if (!response.ok) {
        throw new Error('Failed to read JSON content');
      }
      
      const jsonContent = await response.text();
      const jsonData = JSON.parse(jsonContent);
      
      // Extract all voice texts from the JSON
      const voiceTexts = [
        { name: 'voice_title.mp3', text: jsonData.intro?.voice || jsonData.intro?.text || '' },
        { name: 'voice_q1_title.mp3', text: jsonData.quiz_1?.question?.voice || jsonData.quiz_1?.question?.text || '' },
        { name: 'voice_q1_ans.mp3', text: jsonData.quiz_1?.answer?.voice || '' },
        { name: 'voice_q2_title.mp3', text: jsonData.quiz_2?.question?.voice || jsonData.quiz_2?.question?.text || '' },
        { name: 'voice_q2_ans.mp3', text: jsonData.quiz_2?.answer?.voice || '' },
        { name: 'voice_q3_title.mp3', text: jsonData.quiz_3?.question?.voice || jsonData.quiz_3?.question?.text || '' },
        { name: 'voice_q3_ans.mp3', text: jsonData.quiz_3?.answer?.voice || '' },
        { name: 'voice_lesson.mp3', text: jsonData.lesson?.voice || '' },
        { name: 'voice_reward.mp3', text: jsonData.reward?.voice || '' }
      ].filter(item => item.text.trim() !== ''); // Only include non-empty texts
      
      if (voiceTexts.length === 0) {
        throw new Error('No voice text found in the JSON file. Please check the JSON content.');
      }
      
      // Generate each voice file
      const results: Array<{ success: boolean; file: string; path?: string; error?: string }> = [];
      for (let i = 0; i < voiceTexts.length; i++) {
        const voiceItem = voiceTexts[i];
        
        try {
          const voiceResponse = await fetch('/api/assets/generate-voice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: voiceItem.text,
              filename: voiceItem.name,
              jsonKey: jsonAsset.key,
              jsonOrder: jsonAsset.order,
              channel: selectedChannel,
              topic: selectedTopic
            }),
          });
          
          if (!voiceResponse.ok) {
            throw new Error(`Failed to generate ${voiceItem.name}: ${voiceResponse.statusText}`);
          }
          
          const voiceResult = await voiceResponse.json();
          results.push({ success: true, file: voiceItem.name, path: voiceResult.path });
          
        } catch (error) {
          console.error(`Error generating ${voiceItem.name}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ success: false, file: voiceItem.name, error: errorMessage });
        }
      }
      
      // Update the specific asset group with new voice files
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (successful > 0) {
        // Update the specific asset group instead of refreshing all assets
        setAssetGroups(prevGroups => {
          return prevGroups.map(group => {
            if (group.key === jsonAsset.key) {
              // Add the new voice files to the group
              const newVoices = results
                .filter(r => r.success)
                .map(result => ({
                  id: `voice_${Date.now()}_${Math.random()}`, // Generate temporary ID
                  name: result.file,
                  type: 'voice' as const,
                  category: 'voice',
                  path: result.path!,
                  key: jsonAsset.key,
                  order: jsonAsset.order,
                  status: 'available' as const
                }));
              
              const updatedGroup = {
                ...group,
                assets: {
                  ...group.assets,
                  voices: [...group.assets.voices, ...newVoices]
                },
                renderStatus: {
                  ...group.renderStatus,
                  availableVoices: group.renderStatus.availableVoices + successful
                }
              };
              
              // Reorganize JSON-Asset pairs to update voice status
              // We need to reload JSON content to maintain Quiz 3 image options information
              // For now, we'll use the existing jsonAssetPairs but update the voice information
              // The Quiz 3 image options will be preserved from the existing pairs
              updatedGroup.assets.jsonAssetPairs = updatedGroup.assets.jsonAssetPairs.map(pair => {
                if (pair.json.key === jsonAsset.key && pair.json.order === jsonAsset.order) {
                  // Update the voices for this specific JSON pair
                  const updatedVoices = [...pair.voices, ...newVoices];
                  
                  // Recalculate voice types and missing voices
                  const voiceTypes = {
                    intro: false,
                    quiz1_question: false,
                    quiz1_answer: false,
                    quiz2_question: false,
                    quiz2_answer: false,
                    quiz3_question: false,
                    quiz3_answer: false,
                    lesson: false,
                    reward: false
                  };
                  
                  const missingVoices: string[] = [];
                  
                  updatedVoices.forEach(voice => {
                    const voiceName = voice.name.toLowerCase();
                    if (voiceName === 'voice_title.mp3') voiceTypes.intro = true;
                    else if (voiceName === 'voice_q1_title.mp3') voiceTypes.quiz1_question = true;
                    else if (voiceName === 'voice_q1_ans.mp3') voiceTypes.quiz1_answer = true;
                    else if (voiceName === 'voice_q2_title.mp3') voiceTypes.quiz2_question = true;
                    else if (voiceName === 'voice_q2_ans.mp3') voiceTypes.quiz2_answer = true;
                    else if (voiceName === 'voice_q3_title.mp3') voiceTypes.quiz3_question = true;
                    else if (voiceName === 'voice_q3_ans.mp3') voiceTypes.quiz3_answer = true;
                    else if (voiceName === 'voice_lesson.mp3') voiceTypes.lesson = true;
                    else if (voiceName === 'voice_reward.mp3') voiceTypes.reward = true;
                  });
                  
                  // Check for missing voice types
                  if (!voiceTypes.intro) missingVoices.push('intro');
                  if (!voiceTypes.quiz1_question) missingVoices.push('quiz1_question');
                  if (!voiceTypes.quiz1_answer) missingVoices.push('quiz1_answer');
                  if (!voiceTypes.quiz2_question) missingVoices.push('quiz2_question');
                  if (!voiceTypes.quiz2_answer) missingVoices.push('quiz2_answer');
                  if (!voiceTypes.quiz3_question) missingVoices.push('quiz3_question');
                  if (!voiceTypes.quiz3_answer) missingVoices.push('quiz3_answer');
                  if (!voiceTypes.lesson) missingVoices.push('lesson');
                  if (!voiceTypes.reward) missingVoices.push('reward');
                  
                  return {
                    ...pair,
                    voices: updatedVoices,
                    hasAllVoices: missingVoices.length === 0,
                    missingVoices,
                    voiceTypes
                    // Keep the existing quiz3ImageOptions unchanged
                  };
                }
                return pair;
              });
              
              return updatedGroup;
            }
            return group;
          });
        });
        
        // Show success notification without blocking UI
        const successMessage = `✅ Generated ${successful} voice files for ${jsonAsset.name}`;
        if (failed > 0) {
          console.warn(`❌ Failed to generate ${failed} files. Check console for details.`);
        }
        
        // Show toast notification
        setToast({ message: successMessage, type: 'success' });
        setTimeout(() => setToast(null), 3000);
        
      } else {
        throw new Error('Failed to generate any voice files. Please check the console for details.');
      }
      
    } catch (error) {
      console.error('Error generating voice files:', error);
      // Show error toast notification
      setToast({ message: `Failed to generate voice files: ${(error as Error).message}`, type: 'error' });
      setTimeout(() => setToast(null), 5000);
    } finally {
      // Clear loading state for this specific asset
      setVoiceGeneratingStates(prev => ({ ...prev, [assetKey]: false }));
    }
  };

  const handleGenerateReward = async (jsonAsset: Asset) => {
    if (!confirm(`Generate reward video for ${jsonAsset.name}?`)) {
      return;
    }
    
    try {
      // This is a placeholder for the reward generation functionality
      // You can implement this later with your reward generation API
      alert(`Reward generation for ${jsonAsset.name} will be implemented soon!`);
      
      // Example API call structure:
      // const response = await fetch('/api/assets/generate-reward', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     jsonPath: jsonAsset.path,
      //     channel: selectedChannel,
      //     topic: selectedTopic,
      //     key: jsonAsset.key,
      //     order: jsonAsset.order
      //   }),
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to generate reward video');
      // }
      
      // Refresh assets to show the new reward video
      // fetchAssets();
      
    } catch (error) {
      console.error('Error generating reward video:', error);
      alert('Failed to generate reward video. Please try again.');
    }
  };

  const handleImageGenerated = (asset: Asset) => {
    // Add the new generated image to the assets list
    setAssets(prev => [...prev, asset]);
    
    // Show success message
    setToast({
      message: `Image "${asset.name}" generated and saved successfully!`,
      type: 'success'
    });
    
    // Auto-dismiss toast after 3 seconds
    setTimeout(() => setToast(null), 3000);
    
    // Close the dialog
    setShowImageGenerationDialog(false);
  };

  // State for topic image generation
  const [imageGeneratingStates, setImageGeneratingStates] = useState<{ [key: string]: boolean }>({});

  const handleGenerateTopicImage = async (group: AssetGroup) => {
    const assetKey = group.key;
    
    // Set loading state for this specific asset group
    setImageGeneratingStates(prev => ({ ...prev, [assetKey]: true }));
    
    try {
      // Determine the topic based on the current selected topic
      const topic = selectedTopic || 'animals';
      
      // Generate the image using the topic-specific API
      const response = await fetch('/api/assets/generate-topic-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: group.name,
          topic: topic, // This will handle 'histories' -> 'history' mapping in the API
          model: 'grok', // Default to Grok
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid',
          channel: selectedChannel,
          topicParam: selectedTopic
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();

      if (data.success && data.savedAsset) {
        // Update the specific asset group instead of refreshing all assets
        setAssetGroups(prevGroups => {
          return prevGroups.map(g => {
            if (g.key === group.key) {
              // Add the new image to the group
              const updatedGroup = {
                ...g,
                assets: {
                  ...g.assets,
                  image: data.savedAsset
                },
                renderStatus: {
                  ...g.renderStatus,
                  hasImage: true
                }
              };
              
              return updatedGroup;
            }
            return g;
          });
        });
        
        // Show success message
        setToast({
          message: `Image for "${group.name}" generated and saved successfully!`,
          type: 'success'
        });
        
        // Auto-dismiss toast after 3 seconds
        setTimeout(() => setToast(null), 3000);
      } else {
        throw new Error('Image generation failed');
      }
    } catch (error) {
      console.error('Error generating topic image:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to generate image. Please try again.',
        type: 'error'
      });
      
      // Auto-dismiss toast after 5 seconds
      setTimeout(() => setToast(null), 5000);
    } finally {
      // Clear loading state
      setImageGeneratingStates(prev => ({ ...prev, [assetKey]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid #ffffff;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid #ffffff;
        }
        
        .slider::-ms-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid #ffffff;
        }
      `}</style>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            Assets Management
          </h1>
          <p className="text-gray-400 mt-2">Manage your SK3QLR video assets and generate content</p>
        </div>
        
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
            onClick={() => setShowAIGenerator(true)}
          >
            <span className="text-xl">✨</span>
            <span>AI Generator</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
            onClick={() => setShowImageGenerationDialog(true)}
          >
            <PhotoIcon className="w-5 h-5" />
            <span>Generate Image</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            onClick={() => setShowCreateDialog(true)}
          >
            <PlusIcon className="w-5 h-5" />
            <span>Upload Assets</span>
          </motion.button>
        </div>
      </motion.div>



      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 mb-6"
      >
        {/* Search Bar */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
            />
          </div>
          
          <div className="flex gap-2">
            {selectedAssets.length > 0 && (
              <>
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Delete ({selectedAssets.length})
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Deselect All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">Channel:</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none text-sm"
            >
              {channelOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">Topic:</span>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none text-sm"
            >
              {topicOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'createDate')}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none text-sm"
            >
              <option value="createDate">Creation Date</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">Order:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none text-sm"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>📁</span>
            <span>{selectedChannel}/{selectedTopic}</span>
          </div>

          {/* Sort indicator */}
          <div className="flex items-center gap-2 text-sm text-purple-400 bg-purple-900 bg-opacity-20 px-3 py-1 rounded-lg">
            <span>🔄</span>
            <span>
              {sortBy === 'createDate' ? 'Date' : 'Name'} 
              ({sortOrder === 'asc' ? 'A→Z' : 'Z→A'})
            </span>
          </div>
        </div>
      </motion.div>

      {/* Assets Display */}
      <motion.div layout className="space-y-6">
          {searching && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                <span>Searching...</span>
              </div>
            </div>
          )}
          {paginatedAssetGroups.map((group) => {
            const renderStatus = getRenderStatusDisplay(group.renderStatus);
            const originalRenderStatus = group.renderStatus;
            return (
              <motion.div
                key={`${group.key}-${sortBy}-${sortOrder}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold text-purple-400">{group.name}</h3>
                    <div className="flex gap-2 text-sm text-gray-400">
                      <span>🖼️ {group.assets.image ? '1' : '0'} Image</span>
                      <span>🎥 {group.assets.videos.length} Videos</span>
                      <span>📄 {group.assets.jsonAssetPairs.length} JSON-Asset Pairs</span>
                      <span>🏆 {group.assets.rewards.length} Rewards</span>
                      <span className="text-blue-400">
                        📅 {formatDate(getEarliestJsonDate(group))}
                      </span>
                    </div>
                  </div>
                  
                  {/* Render Status Badge */}
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      renderStatus.isComplete 
                        ? 'bg-green-900 text-green-300 border border-green-600' 
                        : 'bg-gray-700 text-gray-300 border border-gray-600'
                    }`}>
                      {renderStatus.isComplete ? '✅ Ready to Render' : `${renderStatus.completionRate}% Complete`}
                    </div>
                  </div>
                </div>
                
                {/* Render Status Details */}
                <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">Render Status:</span>
                    <span className={`text-sm font-bold ${renderStatus.statusColor}`}>
                      {renderStatus.completionRate}% Complete
                    </span>
                  </div>
                  
                  {/* JSON Requirements */}
                  {renderStatus.jsonCount > 0 && (
                    <div className="mb-3 p-2 bg-gray-800 rounded">
                      <div className="text-xs font-medium text-purple-400 mb-1">
                        📄 JSON Files: {renderStatus.jsonCount} found
                      </div>
                      <div className="text-xs text-gray-300">
                        Orders: {originalRenderStatus.jsonOrders.sort((a: number, b: number) => a - b).join(', ')}
                      </div>
                    </div>
                  )}
                  
                  {/* Image Requirements */}
                  <div className="mb-3 p-2 bg-gray-800 rounded">
                    <div className="text-xs font-medium text-blue-400 mb-1">
                      🖼️ Image: {renderStatus.imageStatus}
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full ${
                          originalRenderStatus.hasImage 
                            ? 'bg-green-500' 
                            : 'bg-red-500'
                        }`}
                        style={{ 
                          width: `${originalRenderStatus.hasImage ? 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-300">
                      Required: 1 image per subject
                      {!originalRenderStatus.hasImage && (
                        <span className="text-red-400 ml-2">Missing: Image file</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Video Requirements */}
                  <div className="mb-3 p-2 bg-gray-800 rounded">
                    <div className="text-xs font-medium text-cyan-400 mb-1">
                      🎥 Videos: {renderStatus.videoStatus}
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full ${
                          originalRenderStatus.hasVideos 
                            ? 'bg-green-500' 
                            : 'bg-red-500'
                        }`}
                        style={{ 
                          width: `${originalRenderStatus.hasVideos ? 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-300">
                      Required: At least 1 video per subject
                      {!originalRenderStatus.hasVideos && (
                        <span className="text-red-400 ml-2">Missing: Video files</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Voice Requirements */}
                  <div className="mb-3 p-2 bg-gray-800 rounded">
                    <div className="text-xs font-medium text-orange-400 mb-1">
                      🎵 Voice Files: {renderStatus.voiceProgress}
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full ${
                          originalRenderStatus.availableVoices >= originalRenderStatus.requiredVoices 
                            ? 'bg-green-500' 
                            : 'bg-orange-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, (originalRenderStatus.availableVoices / originalRenderStatus.requiredVoices) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-300">
                      Required: {originalRenderStatus.requiredVoices} voices ({renderStatus.jsonCount} JSONs × 9 voices each)
                      {renderStatus.missingVoices > 0 && (
                        <span className="text-red-400 ml-2">Missing: {renderStatus.missingVoices}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Reward Requirements */}
                  <div className="mb-3 p-2 bg-gray-800 rounded">
                    <div className="text-xs font-medium text-yellow-400 mb-1">
                      🏆 Reward Videos: {renderStatus.rewardProgress}
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full ${
                          originalRenderStatus.availableRewards >= originalRenderStatus.requiredRewards 
                            ? 'bg-green-500' 
                            : 'bg-yellow-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, (originalRenderStatus.availableRewards / originalRenderStatus.requiredRewards) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-300">
                      Required: {originalRenderStatus.requiredRewards} rewards (1 per JSON)
                      {renderStatus.missingRewards > 0 && (
                        <span className="text-red-400 ml-2">Missing: {renderStatus.missingRewards}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Quiz 3 Image Options Requirements */}
                  <div className="mb-3 p-2 bg-gray-800 rounded">
                    <div className="text-xs font-medium text-purple-400 mb-1">
                      🖼️ Quiz 3 Image Options: {renderStatus.quiz3ImageProgress}
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                      <div 
                        className={`h-2 rounded-full ${
                          originalRenderStatus.availableQuiz3Images >= originalRenderStatus.requiredQuiz3Images 
                            ? 'bg-green-500' 
                            : 'bg-purple-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, (originalRenderStatus.availableQuiz3Images / originalRenderStatus.requiredQuiz3Images) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-300">
                      Required: {originalRenderStatus.requiredQuiz3Images} images ({renderStatus.jsonCount} JSONs × 4 images each)
                      {renderStatus.missingQuiz3Images > 0 && (
                        <span className="text-red-400 ml-2">Missing: {renderStatus.missingQuiz3Images}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Asset Status Tags */}
                  <div className="flex flex-wrap gap-2">
                    {renderStatus.statuses.map((status, index) => (
                      <span key={index} className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded">
                        {status}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Image */}
                  {group.assets.image && (
                    <div 
                      className="bg-gray-700 rounded-lg p-6 cursor-pointer hover:bg-gray-600 transition-colors border border-gray-600 hover:border-purple-500"
                      onClick={() => handlePreviewAsset(group.assets.image!)}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-4xl">🖼️</span>
                        <div className="flex-1">
                          <span className="text-lg font-semibold text-purple-400">Image</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300 border border-green-600">
                              ✅ Available
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-base text-gray-200 truncate mb-3 font-medium">{group.assets.image.name}</p>
                      <p className="text-base text-gray-400 mb-4">{formatFileSize(group.assets.image.size || 0)}</p>
                      <div className="text-base text-gray-300 bg-gray-800 rounded-lg px-4 py-2 text-center hover:bg-gray-700 transition-colors">Click to preview</div>
                    </div>
                  )}
                  
                  {/* Missing Image Placeholder */}
                  {!group.assets.image && (
                    <div className="bg-gray-700 rounded-lg p-6 border border-gray-600 border-dashed">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-4xl">🖼️</span>
                        <div className="flex-1">
                          <span className="text-lg font-semibold text-gray-400">Image</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-900 text-red-300 border border-red-600">
                              ❌ Missing
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-base text-gray-400 mb-3 font-medium">No image file found</p>
                      <p className="text-base text-gray-500 mb-4">Required for video rendering</p>
                      <button 
                        onClick={() => handleGenerateTopicImage(group)}
                        disabled={imageGeneratingStates[group.key]}
                        className="w-full text-base text-purple-300 bg-purple-900/50 rounded-lg px-4 py-2 text-center hover:bg-purple-900/70 disabled:bg-gray-600 disabled:text-gray-400 transition-colors border border-purple-600"
                      >
                        {imageGeneratingStates[group.key] ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-300"></div>
                            Generating...
                          </div>
                        ) : (
                          '🎨 Generate Image'
                        )}
                      </button>
                    </div>
                  )}
                  
                  {/* Videos */}
                  {group.assets.videos.map((video, index) => (
                    <div 
                      key={`${video.id}-${index}`} 
                      className="bg-gray-700 rounded-lg p-6 cursor-pointer hover:bg-gray-600 transition-colors border border-gray-600 hover:border-purple-500"
                      onClick={() => handlePreviewAsset(video)}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-4xl">🎥</span>
                        <div className="flex-1">
                          <span className="text-lg font-semibold text-blue-400">Video {index + 1}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300 border border-green-600">
                              ✅ Available
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-base text-gray-200 truncate mb-3 font-medium">{video.name}</p>
                      <p className="text-base text-gray-400 mb-4">{formatFileSize(video.size || 0)}</p>
                      <div className="text-base text-gray-300 bg-gray-800 rounded-lg px-4 py-2 text-center hover:bg-gray-700 transition-colors">Click to play</div>
                    </div>
                  ))}
                  
                  {/* Missing Videos Placeholder */}
                  {group.assets.videos.length === 0 && (
                    <div className="bg-gray-700 rounded-lg p-6 border border-gray-600 border-dashed">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-4xl">🎥</span>
                        <div className="flex-1">
                          <span className="text-lg font-semibold text-gray-400">Videos</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-900 text-red-300 border border-red-600">
                              ❌ Missing
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-base text-gray-400 mb-3 font-medium">No video files found</p>
                      <p className="text-base text-gray-500 mb-4">Required for video rendering</p>
                      <button className="w-full text-base text-blue-300 bg-blue-900/50 rounded-lg px-4 py-2 text-center hover:bg-blue-900/70 transition-colors border border-blue-600">
                        🎬 Generate Videos
                      </button>
                    </div>
                  )}
                  
                  {/* JSONs with Voice and Reward Status */}
                  {group.assets.jsonAssetPairs.map((pair, index) => (
                    <div 
                      key={`${pair.json.id}-${index}`} 
                      className="bg-gray-700 rounded-lg p-6 border border-gray-600"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-4xl">📄</span>
                        <div className="flex-1">
                          <span className="text-lg font-semibold text-green-400">JSON {pair.json.order || index + 1}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pair.hasAllVoices 
                                ? 'bg-green-900 text-green-300 border border-green-600' 
                                : 'bg-orange-900 text-orange-300 border border-orange-600'
                            }`}>
                              {pair.hasAllVoices ? '✅ All Voices' : `🎵 ${pair.voices.length}/9 Voices`}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pair.hasReward 
                                ? 'bg-green-900 text-green-300 border border-green-600' 
                                : 'bg-yellow-900 text-yellow-300 border border-yellow-600'
                            }`}>
                              {pair.hasReward ? '🏆 Has Reward' : '🏆 No Reward'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pair.quiz3ImageOptions.options.length === 0
                                ? 'bg-gray-900 text-gray-300 border border-gray-600'
                                : pair.quiz3ImageOptions.hasAllImages 
                                  ? 'bg-green-900 text-green-300 border border-green-600' 
                                  : 'bg-red-900 text-red-300 border border-red-600'
                            }`}>
                              {pair.quiz3ImageOptions.options.length === 0 
                                ? '🖼️ No Options'
                                : pair.quiz3ImageOptions.hasAllImages 
                                  ? '🖼️ All Images' 
                                  : `🖼️ ${pair.quiz3ImageOptions.availableImages.length}/${pair.quiz3ImageOptions.options.length} Images`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-base text-gray-200 truncate mb-3 font-medium">{pair.json.name}</p>
                      <p className="text-base text-gray-400 mb-4">{formatFileSize(pair.json.size || 0)}</p>
                      
                      {/* Voice Status Details */}
                      <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                        <div className="text-sm font-medium text-gray-300 mb-2">Voice Files:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.intro ? 'text-green-400' : 'text-red-400'}`}>
                            <span>{pair.voiceTypes.intro ? '✅' : '❌'}</span>
                            <span>Intro</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz1_question ? 'text-green-400' : 'text-red-400'}`}>
                            <span>{pair.voiceTypes.quiz1_question ? '✅' : '❌'}</span>
                            <span>Quiz 1 Q</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz1_answer ? 'text-green-400' : 'text-red-400'}`}>
                            <span>{pair.voiceTypes.quiz1_answer ? '✅' : '❌'}</span>
                            <span>Quiz 1 A</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz2_question ? 'text-green-400' : 'text-red-400'}`}>
                            <span>{pair.voiceTypes.quiz2_question ? '✅' : '❌'}</span>
                            <span>Quiz 2 Q</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz2_answer ? 'text-green-400' : 'text-red-400'}`}>
                            <span>{pair.voiceTypes.quiz2_answer ? '✅' : '❌'}</span>
                            <span>Quiz 2 A</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz3_question ? 'text-green-400' : 'text-red-400'}`}>
                            <span>{pair.voiceTypes.quiz3_question ? '✅' : '❌'}</span>
                            <span>Quiz 3 Q</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz3_answer ? 'text-green-400' : 'text-red-400'}`}>
                            <span>{pair.voiceTypes.quiz3_answer ? '✅' : '❌'}</span>
                            <span>Quiz 3 A</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.lesson ? 'text-green-400' : 'text-red-400'}`}>
                            <span>{pair.voiceTypes.lesson ? '✅' : '❌'}</span>
                            <span>Lesson</span>
                          </div>
                          <div className={`flex items-center gap-1 ${pair.voiceTypes.reward ? 'text-green-400' : 'text-red-400'}`}>
                            <span>{pair.voiceTypes.reward ? '✅' : '❌'}</span>
                            <span>Reward</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Reward Status */}
                      <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                        <div className="text-sm font-medium text-gray-300 mb-2">Reward Video:</div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${pair.hasReward ? 'text-green-400' : 'text-red-400'}`}>
                            {pair.hasReward ? '✅' : '❌'}
                          </span>
                          <span className="text-sm text-gray-300">
                            {pair.hasReward 
                              ? `Reward video available (${pair.reward?.name || 'Unknown'})`
                              : 'No reward video found'
                            }
                          </span>
                        </div>
                      </div>
                      
                      {/* Quiz 3 Image Options Status */}
                      <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                        <div className="text-sm font-medium text-gray-300 mb-2">Quiz 3 Image Options:</div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-lg ${pair.quiz3ImageOptions.hasAllImages ? 'text-green-400' : 'text-red-400'}`}>
                            {pair.quiz3ImageOptions.hasAllImages ? '✅' : '❌'}
                          </span>
                          <span className="text-sm text-gray-300">
                            {pair.quiz3ImageOptions.options.length === 0 
                              ? 'No quiz 3 options found'
                              : pair.quiz3ImageOptions.hasAllImages 
                                ? `${pair.quiz3ImageOptions.availableImages.length}/${pair.quiz3ImageOptions.options.length} Images Available`
                                : `${pair.quiz3ImageOptions.availableImages.length}/${pair.quiz3ImageOptions.options.length} Images Available`
                            }
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                          <div 
                            className={`h-2 rounded-full ${
                              pair.quiz3ImageOptions.hasAllImages 
                                ? 'bg-green-500' 
                                : 'bg-red-500'
                            }`}
                            style={{ 
                              width: `${pair.quiz3ImageOptions.completionRate}%` 
                            }}
                          ></div>
                        </div>
                        
                        {/* Options list */}
                        <div className="text-xs text-gray-300 mb-2">
                          {pair.quiz3ImageOptions.options.length === 0 
                            ? 'No quiz 3 options found in JSON'
                            : `Required: ${pair.quiz3ImageOptions.options.length} images for quiz 3 options`
                          }
                          {pair.quiz3ImageOptions.missingImages.length > 0 && (
                            <span className="text-red-400 ml-2">Missing: {pair.quiz3ImageOptions.missingImages.join(', ')}</span>
                          )}
                        </div>
                        
                        {/* Individual option status */}
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {pair.quiz3ImageOptions.options.map((option, idx) => (
                            <div 
                              key={idx}
                              className={`flex items-center gap-1 ${
                                pair.quiz3ImageOptions.availableImages.includes(option) 
                                  ? 'text-green-400' 
                                  : 'text-red-400'
                              }`}
                            >
                              <span>
                                {pair.quiz3ImageOptions.availableImages.includes(option) ? '✅' : '❌'}
                              </span>
                              <span className="truncate">{option}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePreviewAsset(pair.json)}
                          className="flex-1 text-base text-gray-300 bg-gray-800 rounded-lg px-4 py-2 text-center hover:bg-gray-700 transition-colors"
                        >
                          View JSON
                        </button>
                        <button
                          onClick={() => handlePreviewAsset(pair.json, true)}
                          className="flex-1 text-base text-purple-300 bg-purple-800 rounded-lg px-4 py-2 text-center hover:bg-purple-700 transition-colors"
                        >
                          🎬 Preview Video
                        </button>
                        {!pair.hasAllVoices && (
                          <button
                            onClick={() => handleGenerateVoice(pair.json)}
                            disabled={voiceGeneratingStates[`${pair.json.key}_${pair.json.order}`]}
                            className="flex-1 text-base text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:text-gray-400 rounded-lg px-4 py-2 text-center transition-colors"
                          >
                            {voiceGeneratingStates[`${pair.json.key}_${pair.json.order}`] ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Generating...
                              </div>
                            ) : (
                              'Generate Voice'
                            )}
                          </button>
                        )}
                        {!pair.hasReward && (
                          <button
                            onClick={() => handleGenerateReward(pair.json)}
                            className="flex-1 text-base text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg px-4 py-2 text-center transition-colors"
                          >
                            Generate Reward
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Rewards */}
                  {group.assets.rewards.map((reward, index) => (
                    <div 
                      key={`${reward.id}-${index}`} 
                      className="bg-gray-700 rounded-lg p-6 cursor-pointer hover:bg-gray-600 transition-colors border border-gray-600 hover:border-purple-500"
                      onClick={() => handlePreviewAsset(reward)}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-4xl">🏆</span>
                        <span className="text-lg font-semibold text-yellow-400">Reward {index + 1}</span>
                      </div>
                      <p className="text-base text-gray-200 truncate mb-3 font-medium">{reward.name}</p>
                      <p className="text-base text-gray-400 mb-4">{formatFileSize(reward.size || 0)}</p>
                      <div className="text-base text-gray-300 bg-gray-800 rounded-lg px-4 py-2 text-center hover:bg-gray-700 transition-colors">Click to play</div>
                    </div>
                  ))}
                </div>
                
                {/* Orphaned Voice files summary (voices not associated with any JSON) */}
                {(() => {
                  const orphanedVoices = group.assets.voices.filter(voice => {
                    // Check if this voice belongs to any JSON file
                    return !group.assets.jsonAssetPairs.some(pair => 
                      pair.voices.some(v => v.id === voice.id)
                    );
                  });
                  
                  return orphanedVoices.length > 0 ? (
                    <div className="mt-6 bg-gray-700 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">🎵</span>
                          <span className="text-xl font-semibold text-orange-400">Orphaned Voice Files ({orphanedVoices.length})</span>
                        </div>
                        <button
                          onClick={() => {
                            setPreviewAsset(orphanedVoices[0]);
                            setShowPreview(true);
                          }}
                          className="text-sm bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
                        >
                          Preview Sample
                        </button>
                      </div>
                      <div className="text-base text-gray-300 mb-3">
                        {orphanedVoices.length} voice files not associated with any JSON file
                      </div>
                      <div className="text-sm text-gray-500 mb-4">
                        These voices may need to be manually organized or deleted
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {orphanedVoices.slice(0, 12).map((voice, index) => (
                          <div 
                            key={`${voice.id}-${index}`} 
                            className="text-sm text-gray-400 truncate cursor-pointer hover:text-orange-400 transition-colors p-2 bg-gray-800 rounded hover:bg-gray-700"
                            onClick={() => handlePreviewAsset(voice)}
                            title={voice.name}
                          >
                            {voice.name}
                          </div>
                        ))}
                        {orphanedVoices.length > 12 && (
                          <div className="text-sm text-gray-500 p-2 bg-gray-800 rounded">
                            +{orphanedVoices.length - 12} more...
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}
              </motion.div>
            );
          })}
        </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center items-center gap-2 mt-8"
        >
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
          >
            ← Previous
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors"
          >
            Next →
          </button>
          
          <span className="text-sm text-gray-400 ml-4">
            Page {currentPage} of {totalPages} ({filteredAssetGroups.length} total)
          </span>
        </motion.div>
      )}



      {/* AI Generator Dialog */}
      <AnimatePresence>
        {showAIGenerator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">AI Content Generator</h2>
                <button
                  onClick={() => setShowAIGenerator(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="space-y-4">
                  {/* Generation Mode Tabs */}
                  <div className="flex bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => {
                        setAiPrompt("");
                        setSubjectsList("");
                        setBatchSize(1);
                        setIsBatchMode(false);
                      }}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        !isBatchMode ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Single Subject
                    </button>
                    <button
                      onClick={() => {
                        setAiPrompt("");
                        setSubjectsList("");
                        setBatchSize(1);
                        setIsBatchMode(true);
                      }}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        isBatchMode ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Batch Generation
                    </button>
                  </div>

                  {/* Single Subject Mode */}
                  {!isBatchMode && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={aiPrompt}
                          onChange={(e) => handleSubjectChange(e.target.value)}
                          placeholder="e.g., capybara, lion, tiger"
                          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                        />
                        {existingOrders.length > 0 && (
                          <p className="text-sm text-blue-400 mt-1">
                            ℹ️ Existing orders: {existingOrders.join(', ')} → Next: {Math.max(...existingOrders) + 1}
                          </p>
                        )}
                      </div>
                      
                      <button
                        onClick={generateAIContent}
                        disabled={aiGenerating || !aiPrompt.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                      >
                        {aiGenerating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <span className="text-xl">✨</span>
                            Generate Content
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Batch Generation Mode */}
                  {isBatchMode && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Subjects List (one per line, comma, or semicolon)
                        </label>
                        <textarea
                          value={subjectsList}
                          onChange={(e) => setSubjectsList(e.target.value)}
                          placeholder="capybara&#10;lion&#10;tiger&#10;elephant"
                          rows={4}
                          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                        />
                        {(() => {
                          const subjects = parseSubjectsList(subjectsList);
                          const existingOrdersMap = getExistingOrdersForSubjects(subjects);
                          return subjects.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-blue-400">
                                📋 {subjects.length} subjects detected
                              </p>
                              {subjects.slice(0, 3).map((subject, index) => {
                                const normalizedSubject = subject.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                const orders = existingOrdersMap[normalizedSubject] || [];
                                return (
                                  <p key={index} className="text-xs text-gray-400">
                                    • {subject}: {orders.length > 0 ? `Orders ${orders.join(', ')}` : 'No existing orders'}
                                  </p>
                                );
                              })}
                              {subjects.length > 3 && (
                                <p className="text-xs text-gray-500">
                                  ... and {subjects.length - 3} more subjects
                                </p>
                              )}
                            </div>
                          ) : null;
                        })()}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Content per Subject
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={batchSize}
                          onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Will generate {batchSize} content item(s) for each subject
                        </p>
                      </div>

                      {batchGenerating && batchProgress && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress: {batchProgress.current}/{batchProgress.total}</span>
                            <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Currently generating: {batchProgress.subject}
                          </p>
                        </div>
                      )}
                      
                      <button
                        onClick={generateBatchAIContent}
                        disabled={batchGenerating || parseSubjectsList(subjectsList).length === 0}
                        className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                      >
                        {batchGenerating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl">✨</span>
                            Generate {parseSubjectsList(subjectsList).length * batchSize} Items
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Common Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Description
                    </label>
                    <textarea
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      placeholder="Provide more details about the subject for better content generation..."
                      rows={3}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Language
                      </label>
                      <select
                        value={aiLanguage}
                        onChange={(e) => setAiLanguage(e.target.value)}
                        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                      >
                        <option value="vietnamese">Vietnamese</option>
                        <option value="english">English</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        AI Provider
                      </label>
                      <select
                        value={aiProvider}
                        onChange={(e) => setAiProvider(e.target.value)}
                        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                      >
                        <option value="grok">Grok (xAI)</option>
                        <option value="openai">OpenAI (GPT-4)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-400 bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-purple-400">📁</span>
                      <span>Target: {selectedChannel}/{selectedTopic}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Content will be generated for the current channel and topic selection.
                    </div>
                  </div>
                </div>
                
                {/* Preview Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Generated Content Preview</h3>
                    {previewItems.length > 0 && (
                      <button
                        onClick={clearAllPreviews}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  
                  {previewItems.length === 0 ? (
                    <div className="bg-gray-700 rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                      <div className="text-center text-gray-400 py-8">
                        <div className="text-4xl mb-2">📝</div>
                        <p>No preview items yet</p>
                        <p className="text-sm">Generate content to see previews here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {/* Group preview items by subject */}
                      {(() => {
                        const groupedItems = previewItems.reduce((groups, item) => {
                          const subject = item.key;
                          if (!groups[subject]) {
                            groups[subject] = [];
                          }
                          groups[subject].push(item);
                          return groups;
                        }, {} as { [key: string]: SK3QLRContent[] });

                        return Object.entries(groupedItems).map(([subject, items]) => (
                          <div key={subject} className="bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-purple-400 text-lg">
                                📁 {subject} ({items.length} items)
                              </h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    // Remove all items for this subject
                                    setPreviewItems(prev => prev.filter(item => item.key !== subject));
                                  }}
                                  className="text-red-400 hover:text-red-300 text-sm"
                                >
                                  Remove All
                                </button>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              {items.sort((a, b) => (a.order || 0) - (b.order || 0)).map((item, index) => (
                                <div key={item.id} className="bg-gray-800 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium text-blue-400 text-sm">
                                      Order {item.order}
                                    </h5>
                                    <button
                                      onClick={() => removePreviewItem(previewItems.findIndex(p => p.id === item.id))}
                                      className="text-red-400 hover:text-red-300 text-xs"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  
                                  <div className="space-y-2 text-xs">
                                    <div>
                                      <span className="text-gray-400">Intro:</span>
                                      <p className="text-gray-300 truncate">{item.intro.text}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Quiz 1:</span>
                                      <p className="text-gray-300 truncate">{item.quiz_1.question.text}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Quiz 2:</span>
                                      <p className="text-gray-300 truncate">{item.quiz_2.question.text}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Quiz 3:</span>
                                      <p className="text-gray-300 truncate">{item.quiz_3.question.text}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                  
                  <button
                    onClick={approveGeneratedContent}
                    disabled={previewItems.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                  >
                    Approve & Create {previewItems.length} Render File{previewItems.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asset Preview Modal */}
      <AnimatePresence>
        {showPreview && previewAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={handleClosePreview}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{previewAsset.name}</h3>
                  <p className="text-sm text-gray-400">
                    {previewAsset.type.toUpperCase()} • {formatFileSize(previewAsset.size || 0)}
                  </p>
                </div>
                <button
                  onClick={handleClosePreview}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mb-4">
                {getAssetPreviewContent(previewAsset)}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Download functionality
                    const link = document.createElement('a');
                    link.href = `/api/assets/preview?path=${encodeURIComponent(previewAsset.path)}`;
                    link.download = previewAsset.name;
                    link.click();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete "${previewAsset.name}"?`)) {
                      try {
                        const response = await fetch('/api/assets', {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ 
                            assetIds: [previewAsset.id],
                            paths: [previewAsset.path]
                          }),
                        });

                        if (!response.ok) {
                          throw new Error('Failed to delete asset');
                        }

                        // Close the preview and refresh assets
                        handleClosePreview();
                        fetchAssets();
                        alert('Asset deleted successfully!');
                      } catch (error) {
                        console.error('Error deleting asset:', error);
                        alert('Failed to delete asset. Please try again.');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={handleClosePreview}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Dialog */}
      <AnimatePresence>
        {showSuccessDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-green-400 mb-2">Success!</h3>
                <p className="text-gray-300 mb-6">{successMessage}</p>
                <button
                  onClick={() => setShowSuccessDialog(false)}
                  className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Generation Dialog */}
      <ImageGenerationDialog
        isOpen={showImageGenerationDialog}
        onClose={() => setShowImageGenerationDialog(false)}
        onImageGenerated={handleImageGenerated}
        category="image"
        channel={selectedChannel}
        topic={selectedTopic}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg max-w-md ${
              toast.type === 'success' 
                ? 'bg-green-600 text-white' 
                : toast.type === 'error' 
                ? 'bg-red-600 text-white' 
                : 'bg-blue-600 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 