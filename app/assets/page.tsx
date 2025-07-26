"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon
} from "@heroicons/react/24/outline";
import { 
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/solid";
import { config } from "../../lib/config";

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
  };
}

interface SK3QLRContent {
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
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

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
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Helper function to extract key and order from filename
  const extractKeyAndOrder = (filename: string, type: string): { key: string; order?: number } => {
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
      // Extract from format like "bear_1_voice_title.mp3" or "blue_tang_1_voice_title.mp3"
      const match = filename.match(/^(.+?)_(\d+)_voice_/);
      if (match) {
        const key = match[1];
        const order = parseInt(match[2]);
        console.log(`Extracted from voice ${filename}: key="${key}", order=${order}`); // Debug log
        return { key, order };
      }
      // For voice files without animal prefix, try to extract from path or use a generic key
      const pathMatch = filename.match(/voice_(.+?)\.mp3/);
      if (pathMatch) {
        return { key: 'voice_' + pathMatch[1] };
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
  const organizeJSONAssetPairs = (jsons: Asset[], voices: Asset[], rewards: Asset[]): JSONAssetPair[] => {
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

      matchingVoices.forEach(voice => {
        const voiceName = voice.name.toLowerCase();
        
        // Match the actual naming pattern from the image
        if (voiceName.includes('voice_title')) {
          voiceTypes.intro = true;
        } else if (voiceName.includes('voice_q1_title')) {
          voiceTypes.quiz1_question = true;
        } else if (voiceName.includes('voice_q1_ans')) {
          voiceTypes.quiz1_answer = true;
        } else if (voiceName.includes('voice_q2_title')) {
          voiceTypes.quiz2_question = true;
        } else if (voiceName.includes('voice_q2_ans')) {
          voiceTypes.quiz2_answer = true;
        } else if (voiceName.includes('voice_q3_title')) {
          voiceTypes.quiz3_question = true;
        } else if (voiceName.includes('voice_q3_ans')) {
          voiceTypes.quiz3_answer = true;
        } else if (voiceName.includes('voice_lesson')) {
          voiceTypes.lesson = true;
        } else if (voiceName.includes('voice_reward')) {
          voiceTypes.reward = true;
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

      const hasAllVoices = missingVoices.length === 0;
      const hasReward = !!matchingReward;

      return {
        json,
        voices: matchingVoices,
        reward: matchingReward,
        hasAllVoices,
        hasReward,
        missingVoices,
        voiceTypes
      };
    });
  };

  const fetchAssets = useCallback(async (searchTerm?: string, isSearch = false) => {
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
        const { key, order } = extractKeyAndOrder(asset.name, asset.type);
        console.log(`Processing asset: ${asset.name} -> key: "${key}", order: ${order}`); // Debug log
        return { ...asset, key, order };
      });
      
      setAssets(processedAssets);
      
      // Group assets by key - prioritize animal keys over voice type keys
      const groupedAssets = processedAssets.reduce((groups: { [key: string]: AssetGroup }, asset: Asset) => {
        let key = asset.key || 'unknown';
        
        // For voice files, try to extract the actual animal key from the path
        if (asset.type === 'voice' && asset.path) {
          // Extract animal key from path like "C:/.../animals/voice/bear_1/voice_title.mp3" or "blue_tang_1/voice_title.mp3"
          const pathMatch = asset.path.match(/animals[\/\\]voice[\/\\]([^\/\\]+)[\/\\]/);
          if (pathMatch) {
            const fullKey = pathMatch[1]; // This could be "bear_1" or "blue_tang_1"
            // Extract the animal name part (everything before the last underscore and number)
            const animalKeyMatch = fullKey.match(/^(.+?)_\d+$/);
            if (animalKeyMatch) {
              const animalKey = animalKeyMatch[1]; // This will be "bear" or "blue_tang"
              if (animalKey && animalKey !== 'voice') {
                key = animalKey;
                console.log(`Extracted animal key from voice path: ${fullKey} -> "${animalKey}"`); // Debug log
              }
            }
          }
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
              jsonOrders: []
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
        
        // Update render status
        if (asset.type === 'image' && asset.category === 'image') {
          groups[key].renderStatus.hasImage = true;
        } else if (asset.type === 'video' && asset.category === 'video') {
          groups[key].renderStatus.hasVideos = true;
        } else if (asset.type === 'voice') {
          groups[key].renderStatus.hasVoices = true;
          groups[key].renderStatus.availableVoices++;
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
        
        // Check if complete (has all required assets)
        const hasRequiredAssets = groups[key].renderStatus.hasJson && 
                                 groups[key].renderStatus.hasImage && 
                                 groups[key].renderStatus.hasVideos && 
                                 groups[key].renderStatus.availableVoices >= groups[key].renderStatus.requiredVoices &&
                                 groups[key].renderStatus.availableRewards >= groups[key].renderStatus.requiredRewards;
        groups[key].renderStatus.isComplete = hasRequiredAssets;
        
        return groups;
      }, {});
      
      // Organize JSON-Asset pairs for each group
      Object.values(groupedAssets).forEach((group) => {
        (group as AssetGroup).assets.jsonAssetPairs = organizeJSONAssetPairs((group as AssetGroup).assets.jsons, (group as AssetGroup).assets.voices, (group as AssetGroup).assets.rewards);
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
        fetchAssets(searchQuery, true); // isSearch = true
      } else {
        fetchAssets('', true); // Reset to all assets, but still use search state
      }
    }, 300); // 300ms delay

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
  }, [searchQuery, selectedChannel, selectedTopic]);

  // Client-side filtered assets for immediate search feedback
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [assets, searchQuery]);

  // Client-side filtered asset groups for immediate search feedback
  const filteredAssetGroups = useMemo(() => {
    return assetGroups.filter(group => 
      searchQuery === '' || 
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.assets.jsons.some(json => json.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      group.assets.videos.some(video => video.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      group.assets.voices.some(voice => voice.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [assetGroups, searchQuery]);

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
    
    // Calculate completion rate based on all requirements
    const totalRequirements = 4; // JSON, Image, Videos, Voices
    const metRequirements = [
      renderStatus.hasJson,
      renderStatus.hasImage,
      renderStatus.hasVideos,
      renderStatus.availableVoices >= renderStatus.requiredVoices && renderStatus.availableRewards >= renderStatus.requiredRewards
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
      missingRewards: Math.max(0, renderStatus.requiredRewards - renderStatus.availableRewards)
    };
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
      const newContent = { ...data.content, order: nextOrder };
      
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

  const removePreviewItem = (index: number) => {
    setPreviewItems(prev => {
      const newItems = prev.filter((_, i) => i !== index);
      // Recalculate existing orders
      const removedOrder = prev[index]?.order;
      if (removedOrder) {
        setExistingOrders(prev => prev.filter(order => order !== removedOrder));
      }
      return newItems;
    });
  };

  const clearAllPreviews = () => {
    setPreviewItems([]);
    // Reset existing orders to original state
    checkExistingOrders(aiPrompt);
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

  const handlePreviewAsset = (asset: Asset) => {
    setPreviewAsset(asset);
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
          <JSONPreview asset={asset} />
        );
      default:
        return <div className="text-center text-gray-400">Preview not available</div>;
    }
  };

  // JSON Preview Component
  const JSONPreview = ({ asset }: { asset: Asset }) => {
    const [jsonContent, setJsonContent] = useState<string>('Loading...');
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState<string>('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      const loadJSON = async () => {
        try {
          // Add cache-busting parameter to ensure fresh content
          const timestamp = Date.now();
          const response = await fetch(`/api/assets/preview?path=${encodeURIComponent(asset.path)}&channel=${selectedChannel}&topic=${selectedTopic}&t=${timestamp}`);
          if (response.ok) {
            const content = await response.text();
            const formattedContent = JSON.stringify(JSON.parse(content), null, 2);
            setJsonContent(formattedContent);
            setEditContent(formattedContent);
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
          const formattedContent = JSON.stringify(JSON.parse(content), null, 2);
          setJsonContent(formattedContent);
          setEditContent(formattedContent);
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

    return (
      <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold text-purple-400">JSON Content</h4>
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                >
                  Edit
                </button>
              ) : (
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
            
            {isEditing ? (
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
              updatedGroup.assets.jsonAssetPairs = organizeJSONAssetPairs(
                updatedGroup.assets.jsons, 
                updatedGroup.assets.voices, 
                updatedGroup.assets.rewards
              );
              
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

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>📁</span>
            <span>{selectedChannel}/{selectedTopic}</span>
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
                key={group.key}
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
                      <span>�� {group.assets.jsonAssetPairs.length} JSON-Asset Pairs</span>
                      <span>🏆 {group.assets.rewards.length} Rewards</span>
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
                        <span className="text-lg font-semibold text-purple-400">Image</span>
                      </div>
                      <p className="text-base text-gray-200 truncate mb-3 font-medium">{group.assets.image.name}</p>
                      <p className="text-base text-gray-400 mb-4">{formatFileSize(group.assets.image.size || 0)}</p>
                      <div className="text-base text-gray-300 bg-gray-800 rounded-lg px-4 py-2 text-center hover:bg-gray-700 transition-colors">Click to preview</div>
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
                        <span className="text-lg font-semibold text-blue-400">Video {index + 1}</span>
                      </div>
                      <p className="text-base text-gray-200 truncate mb-3 font-medium">{video.name}</p>
                      <p className="text-base text-gray-400 mb-4">{formatFileSize(video.size || 0)}</p>
                      <div className="text-base text-gray-300 bg-gray-800 rounded-lg px-4 py-2 text-center hover:bg-gray-700 transition-colors">Click to play</div>
                    </div>
                  ))}
                  
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
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePreviewAsset(pair.json)}
                          className="flex-1 text-base text-gray-300 bg-gray-800 rounded-lg px-4 py-2 text-center hover:bg-gray-700 transition-colors"
                        >
                          View JSON
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
                  
                  <div className="text-sm text-gray-400 bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-purple-400">📁</span>
                      <span>Target: {selectedChannel}/{selectedTopic}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Content will be generated for the current channel and topic selection.
                    </div>
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
                      {previewItems.map((item, index) => (
                        <div key={index} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-purple-400">
                              {item.key}_{item.order}.json
                            </h4>
                            <button
                              onClick={() => removePreviewItem(index)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                          
                          <div className="space-y-3 text-sm">
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
              className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
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