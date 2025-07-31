"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';
import TemplateManagerDialog from './TemplateManagerDialog';
import LoadingDialog from './LoadingDialog';
import ErrorDialog from './ErrorDialog';
import SuccessDialog from './SuccessDialog';
import OutputFolderManagerDialog from './OutputFolderManagerDialog';
import RenderFormatManagerDialog from './RenderFormatManagerDialog';
import { generateAssets } from '../services/render';
import { CreateRenderItemDto, TemplateAeAsset } from '../types/render';

interface Asset {
  id: string;
  name: string;
  type: 'voice' | 'image' | 'video' | 'json';
  category: string;
  path: string;
  size?: number;
  lastModified?: Date;
  status: 'available' | 'missing' | 'processing';
  key?: string;
  order?: number;
  rendered?: boolean; // Whether this asset has been rendered
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
  };
  renderStatus: {
    hasJson: boolean;
    hasImage: boolean;
    hasVideos: boolean;
    hasVoices: boolean;
    isComplete: boolean;
    requiredVoices: number;
    availableVoices: number;
    requiredRewards: number;
    availableRewards: number;
    jsonOrders: number[];
    hasQuiz3Images: boolean;
    requiredQuiz3Images: number;
    availableQuiz3Images: number;
  };
}

interface CreateRenderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  channels: { id: string; name: string }[];
  topics: string[];
  types: string[];
  templates: { id: string; path: string }[];
  outputFolders: { id: string; path: string }[];
  renderFormats: { id: string; name: string; code: string }[];
  onSave: (data: any) => void;
  onTemplatesChange: () => void;
  onOutputFoldersChange: () => void;
  onRenderFormatsChange: () => void;
}

export default function CreateRenderDialog({
  isOpen,
  onClose,
  channels,
  topics,
  types,
  templates,
  outputFolders,
  renderFormats,
  onSave,
  onTemplatesChange,
  onOutputFoldersChange,
  onRenderFormatsChange,
}: CreateRenderDialogProps) {
  // Cache keys for localStorage
  const CACHE_KEYS = {
    LAST_CHANNEL: 'createRender_lastChannel',
    LAST_TOPIC: 'createRender_lastTopic',
    LAST_TYPE: 'createRender_lastType',
    LAST_OUTPUT_FOLDER: 'createRender_lastOutputFolder',
    LAST_TEMPLATE_AE_URL: 'createRender_lastTemplateAeUrl',
    LAST_TEMPLATE_AE_COMPOSITION: 'createRender_lastTemplateAeComposition',
    LAST_TEMPLATE_AE_RENDER_FORMAT: 'createRender_lastTemplateAeRenderFormat'
  };

  // Helper functions for caching
  const saveToCache = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Failed to save to cache:', error);
    }
  };

  const loadFromCache = (key: string): string => {
    try {
      return localStorage.getItem(key) || '';
    } catch (error) {
      console.warn('Failed to load from cache:', error);
      return '';
    }
  };

  const [formData, setFormData] = useState({
    channelId: '',
    channelName: '',
    topic: '',
    type: '',
    templateAeUrl: '',
    templateAeUrlValue: '',
    templateAeComposition: 'Final',
    templateAeRenderFormat: { id: '', name: '', code: '' },
    outputFolderPath: '',
    autoRender: true,
    autoCreateMetadata: true,
    autoUpload: false,
    youtubeMetadata: {
      playlistId: '',
      categoryId: '',
      defaultLanguage: 'vi',
      defaultAudioLanguage: 'vi',
      scheduleDate: '',
    },
    outputFolderPathValue: '',
  });

  const [jsonFiles, setJsonFiles] = useState<File[]>([]);
  const [customTemplate, setCustomTemplate] = useState<File | null>(null);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isOutputFolderManagerOpen, setIsOutputFolderManagerOpen] = useState(false);
  const [isRenderFormatManagerOpen, setIsRenderFormatManagerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New state for asset selection
  const [renderableAssets, setRenderableAssets] = useState<AssetGroup[]>([]);
  const [selectedJsonFiles, setSelectedJsonFiles] = useState<string[]>([]); // Store JSON file IDs
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [useAssetSelection, setUseAssetSelection] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'unrendered'>('unrendered');

  // Load cached values when component mounts
  useEffect(() => {
    if (isOpen) {
      const cachedChannelId = loadFromCache(CACHE_KEYS.LAST_CHANNEL);
      const cachedChannel = channels.find(c => c.id === cachedChannelId);
      const cachedRenderFormatId = loadFromCache(CACHE_KEYS.LAST_TEMPLATE_AE_RENDER_FORMAT);
      const cachedRenderFormat = renderFormats.find(f => f.id === cachedRenderFormatId);
      
      setFormData(prev => ({
        ...prev,
        channelId: cachedChannelId,
        channelName: cachedChannel?.name || '',
        topic: loadFromCache(CACHE_KEYS.LAST_TOPIC),
        type: loadFromCache(CACHE_KEYS.LAST_TYPE),
        outputFolderPath: loadFromCache(CACHE_KEYS.LAST_OUTPUT_FOLDER),
        templateAeUrl: loadFromCache(CACHE_KEYS.LAST_TEMPLATE_AE_URL),
        templateAeComposition: loadFromCache(CACHE_KEYS.LAST_TEMPLATE_AE_COMPOSITION) || 'Final',
        templateAeRenderFormat: cachedRenderFormat ? {
          id: cachedRenderFormat.id,
          name: cachedRenderFormat.name,
          code: cachedRenderFormat.code || ''
        } : { id: '', name: '', code: '' },
      }));
    }
  }, [isOpen, channels, renderFormats]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        channelId: '',
        channelName: '',
        topic: '',
        type: '',
        templateAeUrl: '',
        templateAeUrlValue: '',
        templateAeComposition: 'Final',
        templateAeRenderFormat: { id: '', name: '', code: '' },
        outputFolderPath: '',
        autoRender: true,
        autoCreateMetadata: true,
        autoUpload: false,
        youtubeMetadata: {
          playlistId: '',
          categoryId: '',
          defaultLanguage: 'vi',
          defaultAudioLanguage: 'vi',
          scheduleDate: '',
        },
        outputFolderPathValue: '',
      });
      setJsonFiles([]);
      setSelectedJsonFiles([]);
      setRenderableAssets([]);
      setUseAssetSelection(true);
    }
  }, [isOpen]);

  // Fetch renderable assets when channel, topic, or output folder change
  useEffect(() => {
    if (formData.channelName && formData.topic && useAssetSelection) {
      fetchRenderableAssets();
    }
  }, [formData.channelName, formData.topic, formData.outputFolderPath, useAssetSelection]);

  const fetchRenderableAssets = async () => {
    try {
      setLoadingAssets(true);
      const params = new URLSearchParams({
        channel: formData.channelName,
        topic: formData.topic
      });
      
      // Add output folder if selected to check render status
      if (formData.outputFolderPath) {
        params.append('outputFolder', formData.outputFolderPath);
      }
      
      const response = await fetch(`/api/assets/renderable?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch renderable assets');
      }
      const data = await response.json();
      setRenderableAssets(data.groups || []);
    } catch (error) {
      console.error('Error fetching renderable assets:', error);
      setError('Failed to fetch renderable assets');
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }));
    } else if (name.startsWith('youtubeMetadata.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        youtubeMetadata: {
          ...prev.youtubeMetadata,
          [field]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
      
      // Save specific fields to cache
      if (name === 'topic') {
        saveToCache(CACHE_KEYS.LAST_TOPIC, value);
      } else if (name === 'type') {
        saveToCache(CACHE_KEYS.LAST_TYPE, value);
      } else if (name === 'outputFolderPath') {
        saveToCache(CACHE_KEYS.LAST_OUTPUT_FOLDER, value);
      } else if (name === 'templateAeUrl') {
        saveToCache(CACHE_KEYS.LAST_TEMPLATE_AE_URL, value);
      } else if (name === 'templateAeComposition') {
        saveToCache(CACHE_KEYS.LAST_TEMPLATE_AE_COMPOSITION, value);
      }
    }
  };

  const handleChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedChannel = channels.find(c => c.id === e.target.value);
    if (selectedChannel) {
      setFormData(prev => ({
        ...prev,
        channelId: selectedChannel.id,
        channelName: selectedChannel.name,
      }));
      // Save to cache
      saveToCache(CACHE_KEYS.LAST_CHANNEL, selectedChannel.id);
    }
  };

  const handleJsonFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setJsonFiles(Array.from(e.target.files));
    }
  };

  const handleJsonFileSelect = (jsonFileId: string) => {
    setSelectedJsonFiles(prev => 
      prev.includes(jsonFileId) 
        ? prev.filter(id => id !== jsonFileId)
        : [...prev, jsonFileId]
    );
  };

  const handleSelectAllAssets = () => {
    const allJsonFileIds: string[] = [];
    renderableAssets.forEach(group => {
      group.assets.jsons.forEach(json => {
        if (!json.rendered) {
          allJsonFileIds.push(json.id);
        }
      });
    });
    setSelectedJsonFiles(allJsonFileIds);
  };

  const handleDeselectAllAssets = () => {
    setSelectedJsonFiles([]);
  };

  // Helper function to get unrendered JSON count for a group
  const getUnrenderedCount = (group: AssetGroup) => {
    return group.assets.jsons.filter(json => !json.rendered).length;
  };

  // Helper function to get latest JSON date for a group
  const getLatestJsonDate = (group: AssetGroup) => {
    const dates = group.assets.jsons
      .map(json => json.lastModified)
      .filter(Boolean)
      .map(date => {
        // Handle both Date objects and date strings
        if (date instanceof Date) {
          return date.getTime();
        } else if (typeof date === 'string') {
          return new Date(date).getTime();
        }
        return 0;
      })
      .filter(time => time > 0);
    
    return dates.length > 0 ? Math.max(...dates) : 0;
  };

  // Helper function to select all unrendered JSONs in a group
  const handleSelectGroupUnrendered = (group: AssetGroup) => {
    const unrenderedJsonIds = group.assets.jsons
      .filter(json => !json.rendered)
      .map(json => json.id);
    
    setSelectedJsonFiles(prev => {
      const newSelection = [...prev];
      unrenderedJsonIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  // Filter and sort assets
  const filteredAndSortedAssets = renderableAssets
    .filter(group => {
      if (!searchTerm) return true;
      return group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             group.assets.jsons.some(json => 
               json.name.toLowerCase().includes(searchTerm.toLowerCase())
             );
    })
    .sort((a, b) => {
      if (sortBy === 'unrendered') {
        const aUnrendered = getUnrenderedCount(a);
        const bUnrendered = getUnrenderedCount(b);
        if (aUnrendered !== bUnrendered) {
          return bUnrendered - aUnrendered; // Descending order
        }
      } else if (sortBy === 'date') {
        const aDate = getLatestJsonDate(a);
        const bDate = getLatestJsonDate(b);
        if (aDate !== bDate) {
          return bDate - aDate; // Descending order (latest first)
        }
      }
      // Fallback to alphabetical order
      return a.name.localeCompare(b.name);
    });

  const handleCustomTemplateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomTemplate(file);

      try {
        setIsLoading(true);
        setLoadingMessage('Uploading template...');

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/templates', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload template');
        }

        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          templateAeUrl: data.path,
        }));
        
        onTemplatesChange();
      } catch (error) {
        console.error('Error uploading template:', error);
        setError('Failed to upload template. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCustomOutputFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomTemplate(file);

      try {
        setIsLoading(true);
        setLoadingMessage('Uploading output folder...');

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/output-folders', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload output folder');
        }

        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          outputFolderPath: data.path,
        }));
        
        onOutputFoldersChange();
      } catch (error) {
        console.error('Error uploading output folder:', error);
        setError('Failed to upload output folder. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRenderFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedFormat = renderFormats.find(f => f.id === e.target.value);
    if (selectedFormat) {
      setFormData(prev => ({
        ...prev,
        templateAeRenderFormat: {
          id: selectedFormat.id,
          name: selectedFormat.name,
          code: selectedFormat.code || ''
        }
      }));
      // Save to cache
      saveToCache(CACHE_KEYS.LAST_TEMPLATE_AE_RENDER_FORMAT, selectedFormat.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useAssetSelection) {
      if (selectedJsonFiles.length === 0) {
        setError('Please select at least one JSON file');
        return;
      }
    } else {
      if (jsonFiles.length === 0) {
        setError('Please select at least one JSON file');
        return;
      }
    }

    try {
      setIsLoading(true);
      setLoadingMessage('Creating render items...');
      setError(null);

      if (useAssetSelection) {
        // Create render items from selected JSON files
        const selectedJsonAssets: Asset[] = [];
        
        // Find all selected JSON assets
        renderableAssets.forEach(group => {
          group.assets.jsons.forEach(json => {
            if (selectedJsonFiles.includes(json.id)) {
              selectedJsonAssets.push(json);
            }
          });
        });
        
        for (const jsonAsset of selectedJsonAssets) {
            try {
              // Read JSON content from file
              const response = await fetch(`/api/assets/json-content?path=${encodeURIComponent(jsonAsset.path)}`);
              if (!response.ok) {
                throw new Error(`Failed to read JSON file: ${jsonAsset.name}`);
              }
              
              const jsonContent = await response.json();
              const fileName = jsonAsset.name.replace('.json', '');
              
              const { outputFolderPath, outputFolderPathValue, ...rest } = formData;
              
              // Create the render data
              const renderData: CreateRenderItemDto = {
                ...rest,
                fileName,
                jsonContent,
                nexrenderUid: '',
                mp4Link: '',
                renderOutputFolder: outputFolderPath,
                templateAeAssets: [],
                type: formData.type as 'short' | 'long',
              };

              // Generate assets using the generateAssets function
              const templateAeAssets = generateAssets(renderData as any);
              renderData.templateAeAssets = templateAeAssets as TemplateAeAsset[];

              await onSave({
                ...renderData,
                _fileCount: selectedJsonAssets.length,
                _autoUpload: formData.autoUpload,
                _fileIndex: selectedJsonAssets.indexOf(jsonAsset)
              });
            } catch (fileError: any) {
              console.error('Error processing JSON file:', jsonAsset.name, fileError);
              
              if (fileError?.type === 'api') {
                throw fileError;
              }
              
              throw {
                type: 'data',
                message: `Failed to process JSON file ${jsonAsset.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
              };
            }
          }
      } else {
        // Original JSON file upload logic
        for (const jsonFile of jsonFiles) {
          try {
            const jsonContent = await jsonFile.text();
            const fileName = jsonFile.name.replace('.json', '');
            const parsedContent = JSON.parse(jsonContent);
            
            const { outputFolderPath, outputFolderPathValue, ...rest } = formData;
            
            const renderData: CreateRenderItemDto = {
              ...rest,
              fileName,
              jsonContent: parsedContent,
              nexrenderUid: '',
              mp4Link: '',
              renderOutputFolder: outputFolderPath,
              templateAeAssets: [],
              type: formData.type as 'short' | 'long',
            };

            const templateAeAssets = generateAssets(renderData as any);
            renderData.templateAeAssets = templateAeAssets as TemplateAeAsset[];

            await onSave({
              ...renderData,
              _fileCount: jsonFiles.length,
              _autoUpload: formData.autoUpload,
              _fileIndex: jsonFiles.indexOf(jsonFile)
            });
          } catch (fileError: any) {
            console.error('Error processing file:', jsonFile.name, fileError);
            
            if (fileError?.type === 'api') {
              throw fileError;
            }
            
            throw {
              type: 'data',
              message: `Failed to process file ${jsonFile.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
            };
          }
        }
      }

      const totalItems = useAssetSelection 
        ? selectedJsonFiles.length
        : jsonFiles.length;

      setSuccessMessage(`Successfully created ${totalItems} render item${totalItems > 1 ? 's' : ''}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      onClose();
    } catch (error: any) {
      console.error('Error creating render items:', error);
      
      if (error?.type === 'api') {
        setError(error.message);
      } else if (error?.type === 'network') {
        setError('Network error occurred. Please check your connection and try again.');
      } else if (error?.type === 'data') {
        setError(error.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Create New Render</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8">
                {/* Left Column - Basic Settings */}
                <div className="space-y-4">
                  {/* Channel Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Channel
                    </label>
                    <select
                      name="channelId"
                      value={formData.channelId}
                      onChange={handleChannelChange}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                      required
                    >
                      <option value="">Select a channel</option>
                      {channels.map(channel => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Topic Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Topic
                    </label>
                    <select
                      name="topic"
                      value={formData.topic}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                      required
                    >
                      <option value="">Select a topic</option>
                      {topics.map(topic => (
                        <option key={topic} value={topic}>
                          {topic}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Type
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                      required
                    >
                      <option value="">Select a type</option>
                      {types.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Output Folder */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-400">
                        Render Output Folder
                      </label>
                      <button
                        onClick={() => setIsOutputFolderManagerOpen(true)}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        Edit
                      </button>
                    </div>
                    <select
                      name="outputFolderPath"
                      value={formData.outputFolderPath}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                      required
                    >
                      <option value="">Select an output folder</option>
                      {outputFolders.map(folder => (
                        <option key={folder.id} value={folder.path}>
                          {folder.path.split('/').pop()}
                        </option>
                      ))}
                      <option value="custom">Enter new folder path...</option>
                    </select>
                    {formData.outputFolderPath === 'custom' && (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Enter or paste folder path"
                          value={formData.outputFolderPathValue || ''}
                          onChange={e => setFormData(prev => ({ ...prev, outputFolderPathValue: e.target.value }))}
                          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                          required
                        />
                        <button
                          type="button"
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                          onClick={async () => {
                            if (!formData.outputFolderPathValue) return;
                            try {
                              setIsLoading(true);
                              setLoadingMessage('Saving output folder...');
                              const response = await fetch('/api/output-folders', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ path: formData.outputFolderPathValue })
                              });
                              if (!response.ok) throw new Error('Failed to save output folder');
                              setFormData(prev => ({ ...prev, outputFolderPath: formData.outputFolderPathValue, outputFolderPathValue: '' }));
                              onOutputFoldersChange();
                            } catch (error) {
                              setError('Failed to save output folder. Please try again.');
                            } finally {
                              setIsLoading(false);
                              setLoadingMessage('');
                            }
                          }}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Asset Selection Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Asset Selection Method
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="assetMethod"
                          checked={useAssetSelection}
                          onChange={() => setUseAssetSelection(true)}
                          className="mr-2"
                        />
                        <span className="text-gray-300">Select from Assets</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="assetMethod"
                          checked={!useAssetSelection}
                          onChange={() => setUseAssetSelection(false)}
                          className="mr-2"
                        />
                        <span className="text-gray-300">Upload JSON Files</span>
                      </label>
                    </div>
                  </div>

                  {/* Render JSONs (only show when not using asset selection) */}
                  {!useAssetSelection && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Render JSONs
                      </label>
                      <input
                        type="file"
                        accept=".json"
                        multiple
                        onChange={handleJsonFilesChange}
                        className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                        required={!useAssetSelection}
                      />
                      {jsonFiles.length > 0 && (
                        <p className="mt-2 text-sm text-gray-400">
                          Selected {jsonFiles.length} file(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column - Asset Selection and Render Settings */}
                <div className="space-y-4">
                  {/* Asset Selection */}
                  {useAssetSelection && formData.channelName && formData.topic && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-400">
                          Select Renderable Assets
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={fetchRenderableAssets}
                            disabled={loadingAssets}
                            className="text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-500"
                          >
                            🔄 Refresh
                          </button>
                          <button
                            type="button"
                            onClick={handleSelectAllAssets}
                            className="text-sm text-purple-400 hover:text-purple-300"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={handleDeselectAllAssets}
                            className="text-sm text-purple-400 hover:text-purple-300"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      {/* Search and Sort Controls */}
                      <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Search by group name or JSON file..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'date' | 'unrendered')}
                            className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="unrendered">Sort by Unrendered Count</option>
                            <option value="date">Sort by Latest Date</option>
                          </select>
                        </div>
                      </div>
                      
                      {loadingAssets ? (
                        <div className="bg-gray-700 rounded-lg p-4 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
                          <p className="text-gray-400 mt-2">Loading renderable assets...</p>
                        </div>
                      ) : filteredAndSortedAssets.length === 0 ? (
                        <div className="bg-gray-700 rounded-lg p-4 text-center">
                          <p className="text-gray-400">
                            {searchTerm ? 'No assets found matching your search.' : 'No renderable assets found for this channel and topic.'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-64 overflow-y-auto">
                          {filteredAndSortedAssets.map((group) => (
                            <div key={group.key} className="border border-gray-600 rounded-lg p-4">
                              <div 
                                className="flex items-center justify-between mb-3 cursor-pointer hover:bg-gray-700/50 p-2 rounded transition-colors"
                                onClick={() => handleSelectGroupUnrendered(group)}
                                title={getUnrenderedCount(group) > 0 ? `Click to select all ${getUnrenderedCount(group)} unrendered items` : 'No unrendered items to select'}
                              >
                                <h4 className="font-medium text-white">{group.name}</h4>
                                <div className="text-xs text-gray-500">
                                  <span>📄 JSON: {group.renderStatus.jsonOrders.length}</span>
                                  <span className="ml-2">🖼️ Image: {group.renderStatus.hasImage ? 'Yes' : 'No'}</span>
                                  <span className="ml-2">🎥 Videos: {group.assets.videos.length}</span>
                                  <span className="ml-2">🎵 Voices: {group.renderStatus.availableVoices}/{group.renderStatus.requiredVoices}</span>
                                  <span className="ml-2">🏆 Rewards: {group.renderStatus.availableRewards}/{group.renderStatus.requiredRewards}</span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {group.assets.jsons.map((json) => (
                                  <div
                                    key={json.id}
                                    className={`p-2 rounded border-2 cursor-pointer transition-all text-sm ${
                                      json.rendered
                                        ? 'border-gray-500 bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : selectedJsonFiles.includes(json.id)
                                        ? 'border-purple-500 bg-purple-500/10 text-white'
                                        : 'border-gray-600 bg-gray-700 hover:border-gray-500 text-white'
                                    }`}
                                    onClick={() => !json.rendered && handleJsonFileSelect(json.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>{json.name.replace('.json', '')}</span>
                                      {json.rendered ? (
                                        <span className="text-green-400 text-xs">✅ Rendered</span>
                                      ) : selectedJsonFiles.includes(json.id) ? (
                                        <CheckIcon className="w-4 h-4 text-purple-400" />
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {selectedJsonFiles.length > 0 && (
                        <div className="mt-2 text-sm text-gray-400">
                          <p>Selected {selectedJsonFiles.length} JSON file{selectedJsonFiles.length !== 1 ? 's' : ''}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            From {new Set(selectedJsonFiles.map(id => {
                              const group = renderableAssets.find(g => 
                                g.assets.jsons.some(json => json.id === id)
                              );
                              return group?.name;
                            }).filter(Boolean)).size} group{new Set(selectedJsonFiles.map(id => {
                              const group = renderableAssets.find(g => 
                                g.assets.jsons.some(json => json.id === id)
                              );
                              return group?.name;
                            }).filter(Boolean)).size !== 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Template After Effects Render Format */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-400">
                        Template After Effects Render Format
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsRenderFormatManagerOpen(true)}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        Edit
                      </button>
                    </div>
                    <select
                      name="templateAeRenderFormat"
                      value={formData.templateAeRenderFormat.id}
                      onChange={handleRenderFormatChange}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                      required
                    >
                      <option value="">Select a render format</option>
                      {renderFormats.map(format => (
                        <option key={format.id} value={format.id}>
                          {format.code ? `${format.code}: ${format.name}` : format.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Template After Effects */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-400">
                        Template After Effects File
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsTemplateManagerOpen(true)}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        Edit
                      </button>
                    </div>
                    <select
                      name="templateAeUrl"
                      value={formData.templateAeUrl}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                      required
                    >
                      <option value="">Select a template</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.path}>
                          {template.path.split('/').pop()}
                        </option>
                      ))}
                      <option value="custom">Enter full template path...</option>
                    </select>
                    {formData.templateAeUrl === 'custom' && (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Enter or paste full template path"
                          value={formData.templateAeUrlValue || ''}
                          onChange={e => setFormData(prev => ({ ...prev, templateAeUrlValue: e.target.value }))}
                          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                          required
                        />
                        <button
                          type="button"
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                          onClick={async () => {
                            if (!formData.templateAeUrlValue) return;
                            try {
                              setIsLoading(true);
                              setLoadingMessage('Saving template path...');
                              const response = await fetch('/api/templates', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ path: formData.templateAeUrlValue })
                              });
                              if (!response.ok) throw new Error('Failed to save template path');
                              setFormData(prev => ({ ...prev, templateAeUrl: formData.templateAeUrlValue, templateAeUrlValue: '' }));
                              onTemplatesChange();
                            } catch (error) {
                              setError('Failed to save template path. Please try again.');
                            } finally {
                              setIsLoading(false);
                              setLoadingMessage('');
                            }
                          }}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Composition After Effects */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Composition After Effects
                    </label>
                    <input
                      type="text"
                      name="templateAeComposition"
                      value={formData.templateAeComposition}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                      required
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="autoRender"
                        checked={formData.autoRender}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <label className="text-gray-400">Auto Render</label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="autoCreateMetadata"
                        checked={formData.autoCreateMetadata}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <label className="text-gray-400">Auto Create Metadata</label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="autoUpload"
                        checked={formData.autoUpload}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <label className="text-gray-400">Auto Upload</label>
                    </div>
                  </div>

                  {/* YouTube Config */}
                  {formData.autoUpload && (
                    <div className="space-y-4 border-t border-gray-700 pt-4 mt-4">
                      <h3 className="text-lg font-medium">YouTube Config</h3>
                      
                      {/* Playlist */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Playlist
                        </label>
                        <input
                          type="text"
                          name="youtubeMetadata.playlistId"
                          value={formData.youtubeMetadata.playlistId}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Category
                        </label>
                        <input
                          type="text"
                          name="youtubeMetadata.categoryId"
                          value={formData.youtubeMetadata.categoryId}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                        />
                      </div>

                      {/* Language */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Language
                        </label>
                        <select
                          name="youtubeMetadata.defaultLanguage"
                          value={formData.youtubeMetadata.defaultLanguage}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                        >
                          <option value="vi">Vietnamese</option>
                          <option value="en">English</option>
                        </select>
                      </div>

                      {/* Audio Language */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Audio Language
                        </label>
                        <select
                          name="youtubeMetadata.defaultAudioLanguage"
                          value={formData.youtubeMetadata.defaultAudioLanguage}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                        >
                          <option value="vi">Vietnamese</option>
                          <option value="en">English</option>
                        </select>
                      </div>

                      {/* Schedule Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Schedule Date
                        </label>
                        <input
                          type="datetime-local"
                          name="youtubeMetadata.scheduleDate"
                          value={formData.youtubeMetadata.scheduleDate}
                          onChange={handleInputChange}
                          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button - Full Width */}
                <div className="col-span-2 flex justify-end mt-6">
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LoadingDialog isOpen={isLoading} message={loadingMessage} />
      <ErrorDialog
        isOpen={!!error}
        onClose={() => setError(null)}
        message={error || ''}
      />
      <SuccessDialog
        isOpen={!!successMessage}
        onClose={() => setSuccessMessage(null)}
        message={successMessage || ''}
      />
      <TemplateManagerDialog
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        templates={templates}
        onTemplatesChange={onTemplatesChange}
      />
      <OutputFolderManagerDialog
        isOpen={isOutputFolderManagerOpen}
        onClose={() => setIsOutputFolderManagerOpen(false)}
        outputFolders={outputFolders}
        onOutputFoldersChange={onOutputFoldersChange}
      />
      <RenderFormatManagerDialog
        isOpen={isRenderFormatManagerOpen}
        onClose={() => setIsRenderFormatManagerOpen(false)}
        formats={renderFormats}
        onFormatsChange={onRenderFormatsChange}
      />
    </>
  );
} 