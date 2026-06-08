"use client";

import React, { useState, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import { Button, Input, Select, Label, Dialog } from "@/app/components/ui";
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

  const clearCache = () => {
    try {
      Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('🔧 Cache cleared');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
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
      const cachedTopic = loadFromCache(CACHE_KEYS.LAST_TOPIC);
      
      console.log('🔧 Loading cached values - cachedChannelId:', cachedChannelId, 'cachedChannel:', cachedChannel?.name, 'cachedTopic:', cachedTopic);
      
      // Only load cached values if the form is empty (first time opening)
      setFormData(prev => {
        const shouldLoadCache = !prev.channelName && !prev.topic;
        
        if (shouldLoadCache) {
          console.log('🔧 Loading from cache (form was empty)');
          return {
            ...prev,
            channelId: cachedChannelId,
            channelName: cachedChannel?.name || '',
            topic: cachedTopic,
            type: loadFromCache(CACHE_KEYS.LAST_TYPE),
            outputFolderPath: loadFromCache(CACHE_KEYS.LAST_OUTPUT_FOLDER),
            templateAeUrl: loadFromCache(CACHE_KEYS.LAST_TEMPLATE_AE_URL),
            templateAeComposition: loadFromCache(CACHE_KEYS.LAST_TEMPLATE_AE_COMPOSITION) || 'Final',
            templateAeRenderFormat: cachedRenderFormat ? {
              id: cachedRenderFormat.id,
              name: cachedRenderFormat.name,
              code: cachedRenderFormat.code || ''
            } : { id: '', name: '', code: '' },
          };
        } else {
          console.log('🔧 Not loading from cache (form has values)');
          return prev;
        }
      });
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
    
    console.log('🔧 Form submission - formData.channelName:', formData.channelName, 'formData.topic:', formData.topic);
    
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
              // Extract channel and topic from the JSON file path
              const pathParts = jsonAsset.path.split(/[\\\/]/);
              const minimateIndex = pathParts.findIndex(part => part.toLowerCase() === 'minimate');
              let detectedTopic = formData.topic;
              
              if (minimateIndex !== -1 && minimateIndex + 1 < pathParts.length) {
                detectedTopic = pathParts[minimateIndex + 1];
                console.log('🔧 Detected topic from JSON path:', detectedTopic);
                
                // Update form data with detected topic if it's different
                if (detectedTopic !== formData.topic) {
                  console.log('🔧 Updating form topic from', formData.topic, 'to', detectedTopic);
                  setFormData(prev => ({
                    ...prev,
                    topic: detectedTopic
                  }));
                }
              }
              
              // Read JSON content from file using detected topic
              const response = await fetch(`/api/assets/json-content?path=${encodeURIComponent(jsonAsset.path)}&channel=${encodeURIComponent(formData.channelName)}&topic=${encodeURIComponent(detectedTopic)}`);
              if (!response.ok) {
                throw new Error(`Failed to read JSON file: ${jsonAsset.name}`);
              }
              
              const jsonContent = await response.json();
              const fileName = jsonAsset.name.replace('.json', '');
              
              const { outputFolderPath, outputFolderPathValue, ...rest } = formData;
              
              // Create the render data with detected topic
              const renderData: CreateRenderItemDto = {
                ...rest,
                topic: detectedTopic, // Use the detected topic instead of form data
                fileName,
                jsonContent,
                nexrenderUid: '',
                mp4Link: '',
                renderOutputFolder: outputFolderPath,
                templateAeAssets: [],
                type: formData.type as 'short' | 'long',
              };

              // Generate assets using the generateAssets function with detected topic
              console.log('🔧 generateAssets called with channel:', formData.channelName, 'topic:', detectedTopic);
              const templateAeAssets = generateAssets(renderData as any, formData.channelName, detectedTopic);
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

            console.log('🔧 generateAssets called with channel:', formData.channelName, 'topic:', formData.topic);
            const templateAeAssets = generateAssets(renderData as any, formData.channelName, formData.topic);
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
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        size="3xl"
        title="Create New Render"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-8">
          {/* Left Column - Basic Settings */}
          <div className="space-y-4">
            {/* Channel Selection */}
            <div>
              <Label className="mb-2">Channel</Label>
              <Select
                name="channelId"
                value={formData.channelId}
                onChange={handleChannelChange}
                required
              >
                <option value="">Select a channel</option>
                {channels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </Select>
              <div className="text-xs text-text-faint mt-1">
                Debug: channelName="{formData.channelName}", topic="{formData.topic}"
                <button
                  type="button"
                  onClick={clearCache}
                  className="ml-2 text-info hover:text-text"
                >
                  Clear Cache
                </button>
              </div>
            </div>

            {/* Topic Selection */}
            <div>
              <Label className="mb-2">Topic</Label>
              <Select
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a topic</option>
                {topics.map(topic => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </Select>
            </div>

            {/* Type Selection */}
            <div>
              <Label className="mb-2">Type</Label>
              <Select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a type</option>
                {types.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>

            {/* Output Folder */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Render Output Folder</Label>
                <button
                  onClick={() => setIsOutputFolderManagerOpen(true)}
                  className="text-accent hover:text-accent-hover text-sm"
                >
                  Edit
                </button>
              </div>
              <Select
                name="outputFolderPath"
                value={formData.outputFolderPath}
                onChange={handleInputChange}
                required
              >
                <option value="">Select an output folder</option>
                {outputFolders.map(folder => (
                  <option key={folder.id} value={folder.path}>
                    {folder.path.split('/').pop()}
                  </option>
                ))}
                <option value="custom">Enter new folder path...</option>
              </Select>
              {formData.outputFolderPath === 'custom' && (
                <div className="flex gap-2 mt-2">
                  <Input
                    type="text"
                    placeholder="Enter or paste folder path"
                    value={formData.outputFolderPathValue || ''}
                    onChange={e => setFormData(prev => ({ ...prev, outputFolderPathValue: e.target.value }))}
                    required
                  />
                  <Button
                    type="button"
                    variant="primary"
                    className="whitespace-nowrap"
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
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Asset Selection Method */}
                  <div>
                    <Label className="mb-2">Asset Selection Method</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="assetMethod"
                          checked={useAssetSelection}
                          onChange={() => setUseAssetSelection(true)}
                          className="mr-2"
                        />
                        <span className="text-text-muted">Select from Assets</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="assetMethod"
                          checked={!useAssetSelection}
                          onChange={() => setUseAssetSelection(false)}
                          className="mr-2"
                        />
                        <span className="text-text-muted">Upload JSON Files</span>
                      </label>
                    </div>
                  </div>

                  {/* Render JSONs (only show when not using asset selection) */}
                  {!useAssetSelection && (
                    <div>
                      <Label className="mb-2">Render JSONs</Label>
                      <Input
                        type="file"
                        accept=".json"
                        multiple
                        onChange={handleJsonFilesChange}
                        required={!useAssetSelection}
                      />
                      {jsonFiles.length > 0 && (
                        <p className="mt-2 text-sm text-text-muted">
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
                        <Label>Select Renderable Assets</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={fetchRenderableAssets}
                            disabled={loadingAssets}
                            className="text-sm text-info hover:text-text disabled:text-text-faint"
                          >
                            🔄 Refresh
                          </button>
                          <button
                            type="button"
                            onClick={handleSelectAllAssets}
                            className="text-sm text-accent hover:text-accent-hover"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={handleDeselectAllAssets}
                            className="text-sm text-accent hover:text-accent-hover"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      {/* Search and Sort Controls */}
                      <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                          <Input
                            type="text"
                            placeholder="Search by group name or JSON file..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'date' | 'unrendered')}
                            className="text-sm"
                          >
                            <option value="unrendered">Sort by Unrendered Count</option>
                            <option value="date">Sort by Latest Date</option>
                          </Select>
                        </div>
                      </div>

                      {loadingAssets ? (
                        <div className="bg-surface-raised rounded-lg p-4 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                          <p className="text-text-muted mt-2">Loading renderable assets...</p>
                        </div>
                      ) : filteredAndSortedAssets.length === 0 ? (
                        <div className="bg-surface-raised rounded-lg p-4 text-center">
                          <p className="text-text-muted">
                            {searchTerm ? 'No assets found matching your search.' : 'No renderable assets found for this channel and topic.'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-64 overflow-y-auto">
                          {filteredAndSortedAssets.map((group) => (
                            <div key={group.key} className="border border-border rounded-lg p-4">
                              <div
                                className="flex items-center justify-between mb-3 cursor-pointer hover:bg-surface-raised p-2 rounded transition-colors"
                                onClick={() => handleSelectGroupUnrendered(group)}
                                title={getUnrenderedCount(group) > 0 ? `Click to select all ${getUnrenderedCount(group)} unrendered items` : 'No unrendered items to select'}
                              >
                                <h4 className="font-medium text-text">{group.name}</h4>
                                <div className="text-xs text-text-faint">
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
                                        ? 'border-border bg-surface-raised text-text-muted cursor-not-allowed'
                                        : selectedJsonFiles.includes(json.id)
                                        ? 'border-accent bg-accent-muted text-text'
                                        : 'border-border bg-surface-raised hover:border-border-strong text-text'
                                    }`}
                                    onClick={() => !json.rendered && handleJsonFileSelect(json.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>{json.name.replace('.json', '')}</span>
                                      {json.rendered ? (
                                        <span className="text-success text-xs">✅ Rendered</span>
                                      ) : selectedJsonFiles.includes(json.id) ? (
                                        <CheckIcon className="w-4 h-4 text-accent" />
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
                        <div className="mt-2 text-sm text-text-muted">
                          <p>Selected {selectedJsonFiles.length} JSON file{selectedJsonFiles.length !== 1 ? 's' : ''}</p>
                          <p className="text-xs text-text-faint mt-1">
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
                      <Label>Template After Effects Render Format</Label>
                      <button
                        type="button"
                        onClick={() => setIsRenderFormatManagerOpen(true)}
                        className="text-accent hover:text-accent-hover text-sm"
                      >
                        Edit
                      </button>
                    </div>
                    <Select
                      name="templateAeRenderFormat"
                      value={formData.templateAeRenderFormat.id}
                      onChange={handleRenderFormatChange}
                      required
                    >
                      <option value="">Select a render format</option>
                      {renderFormats.map(format => (
                        <option key={format.id} value={format.id}>
                          {format.code ? `${format.code}: ${format.name}` : format.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Template After Effects */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Template After Effects File</Label>
                      <button
                        type="button"
                        onClick={() => setIsTemplateManagerOpen(true)}
                        className="text-accent hover:text-accent-hover text-sm"
                      >
                        Edit
                      </button>
                    </div>
                    <Select
                      name="templateAeUrl"
                      value={formData.templateAeUrl}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select a template</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.path}>
                          {template.path.split('/').pop()}
                        </option>
                      ))}
                      <option value="custom">Enter full template path...</option>
                    </Select>
                    {formData.templateAeUrl === 'custom' && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="text"
                          placeholder="Enter or paste full template path"
                          value={formData.templateAeUrlValue || ''}
                          onChange={e => setFormData(prev => ({ ...prev, templateAeUrlValue: e.target.value }))}
                          required
                        />
                        <Button
                          type="button"
                          variant="primary"
                          className="whitespace-nowrap"
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
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Composition After Effects */}
                  <div>
                    <Label className="mb-2">Composition After Effects</Label>
                    <Input
                      type="text"
                      name="templateAeComposition"
                      value={formData.templateAeComposition}
                      onChange={handleInputChange}
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
                        className="mr-2 accent-accent"
                      />
                      <label className="text-text-muted">Auto Render</label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="autoCreateMetadata"
                        checked={formData.autoCreateMetadata}
                        onChange={handleInputChange}
                        className="mr-2 accent-accent"
                      />
                      <label className="text-text-muted">Auto Create Metadata</label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="autoUpload"
                        checked={formData.autoUpload}
                        onChange={handleInputChange}
                        className="mr-2 accent-accent"
                      />
                      <label className="text-text-muted">Auto Upload</label>
                    </div>
                  </div>

                  {/* YouTube Config */}
                  {formData.autoUpload && (
                    <div className="space-y-4 border-t border-border pt-4 mt-4">
                      <h3 className="text-lg font-medium text-text">YouTube Config</h3>

                      {/* Playlist */}
                      <div>
                        <Label className="mb-2">Playlist</Label>
                        <Input
                          type="text"
                          name="youtubeMetadata.playlistId"
                          value={formData.youtubeMetadata.playlistId}
                          onChange={handleInputChange}
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <Label className="mb-2">Category</Label>
                        <Input
                          type="text"
                          name="youtubeMetadata.categoryId"
                          value={formData.youtubeMetadata.categoryId}
                          onChange={handleInputChange}
                        />
                      </div>

                      {/* Language */}
                      <div>
                        <Label className="mb-2">Language</Label>
                        <Select
                          name="youtubeMetadata.defaultLanguage"
                          value={formData.youtubeMetadata.defaultLanguage}
                          onChange={handleInputChange}
                        >
                          <option value="vi">Vietnamese</option>
                          <option value="en">English</option>
                        </Select>
                      </div>

                      {/* Audio Language */}
                      <div>
                        <Label className="mb-2">Audio Language</Label>
                        <Select
                          name="youtubeMetadata.defaultAudioLanguage"
                          value={formData.youtubeMetadata.defaultAudioLanguage}
                          onChange={handleInputChange}
                        >
                          <option value="vi">Vietnamese</option>
                          <option value="en">English</option>
                        </Select>
                      </div>

                      {/* Schedule Date */}
                      <div>
                        <Label className="mb-2">Schedule Date</Label>
                        <Input
                          type="datetime-local"
                          name="youtubeMetadata.scheduleDate"
                          value={formData.youtubeMetadata.scheduleDate}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button - Full Width */}
                <div className="col-span-2 flex justify-end mt-6">
                  <Button type="submit" variant="primary" size="lg">
                    Create
                  </Button>
                </div>
              </form>
      </Dialog>

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