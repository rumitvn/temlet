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
  const [selectedAssetGroups, setSelectedAssetGroups] = useState<string[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [useAssetSelection, setUseAssetSelection] = useState(true);

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
      setSelectedAssetGroups([]);
      setRenderableAssets([]);
      setUseAssetSelection(true);
    }
  }, [isOpen]);

  // Fetch renderable assets when channel and topic change
  useEffect(() => {
    if (formData.channelName && formData.topic && useAssetSelection) {
      fetchRenderableAssets();
    }
  }, [formData.channelName, formData.topic, useAssetSelection]);

  const fetchRenderableAssets = async () => {
    try {
      setLoadingAssets(true);
      const response = await fetch(`/api/assets/renderable?channel=${formData.channelName}&topic=${formData.topic}`);
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
    }
  };

  const handleJsonFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setJsonFiles(Array.from(e.target.files));
    }
  };

  const handleAssetGroupSelect = (groupKey: string) => {
    setSelectedAssetGroups(prev => 
      prev.includes(groupKey) 
        ? prev.filter(key => key !== groupKey)
        : [...prev, groupKey]
    );
  };

  const handleSelectAllAssets = () => {
    setSelectedAssetGroups(renderableAssets.map(group => group.key));
  };

  const handleDeselectAllAssets = () => {
    setSelectedAssetGroups([]);
  };

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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useAssetSelection) {
      if (selectedAssetGroups.length === 0) {
        setError('Please select at least one asset group');
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
        // Create render items from selected asset groups
        const selectedGroups = renderableAssets.filter(group => selectedAssetGroups.includes(group.key));
        
        for (const group of selectedGroups) {
          for (const jsonAsset of group.assets.jsons) {
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
                _fileCount: selectedGroups.reduce((total, g) => total + g.assets.jsons.length, 0),
                _autoUpload: formData.autoUpload,
                _fileIndex: selectedGroups.reduce((total, g) => {
                  if (g.key === group.key) {
                    return total + group.assets.jsons.findIndex(j => j.id === jsonAsset.id);
                  }
                  return total + g.assets.jsons.length;
                }, 0)
              });
            } catch (fileError: any) {
              console.error('Error processing asset group:', group.key, fileError);
              
              if (fileError?.type === 'api') {
                throw fileError;
              }
              
              throw {
                type: 'data',
                message: `Failed to process asset group ${group.key}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
              };
            }
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
        ? selectedAssetGroups.reduce((total, key) => {
            const group = renderableAssets.find(g => g.key === key);
            return total + (group?.assets.jsons.length || 0);
          }, 0)
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
              className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
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

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    
                    {loadingAssets ? (
                      <div className="bg-gray-700 rounded-lg p-4 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
                        <p className="text-gray-400 mt-2">Loading renderable assets...</p>
                      </div>
                    ) : renderableAssets.length === 0 ? (
                      <div className="bg-gray-700 rounded-lg p-4 text-center">
                        <p className="text-gray-400">No renderable assets found for this channel and topic.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                        {renderableAssets.map((group) => (
                          <div
                            key={group.key}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedAssetGroups.includes(group.key)
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                            }`}
                            onClick={() => handleAssetGroupSelect(group.key)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-white">{group.name}</h4>
                                <p className="text-sm text-gray-400">
                                  {group.assets.jsons.length} JSON file{group.assets.jsons.length !== 1 ? 's' : ''}
                                </p>
                                <div className="text-xs text-gray-500 mt-1">
                                  <span>📄 JSON: {group.renderStatus.jsonOrders.length}</span>
                                  <span className="ml-2">🖼️ Image: {group.renderStatus.hasImage ? 'Yes' : 'No'}</span>
                                  <span className="ml-2">🎥 Videos: {group.assets.videos.length}</span>
                                  <span className="ml-2">🎵 Voices: {group.renderStatus.availableVoices}/{group.renderStatus.requiredVoices}</span>
                                  <span className="ml-2">🏆 Rewards: {group.renderStatus.availableRewards}/{group.renderStatus.requiredRewards}</span>
                                </div>
                              </div>
                              {selectedAssetGroups.includes(group.key) && (
                                <CheckIcon className="w-5 h-5 text-purple-400" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {selectedAssetGroups.length > 0 && (
                      <p className="mt-2 text-sm text-gray-400">
                        Selected {selectedAssetGroups.length} asset group{selectedAssetGroups.length !== 1 ? 's' : ''} 
                        ({selectedAssetGroups.reduce((total, key) => {
                          const group = renderableAssets.find(g => g.key === key);
                          return total + (group?.assets.jsons.length || 0);
                        }, 0)} total JSON files)
                      </p>
                    )}
                  </div>
                )}

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

                {/* Auto Render */}
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

                {/* Auto Create Metadata */}
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

                {/* Auto Upload */}
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

                {/* Submit Button */}
                <div className="flex justify-end mt-6">
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