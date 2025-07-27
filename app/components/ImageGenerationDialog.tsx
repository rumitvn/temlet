"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhotoIcon, 
  XMarkIcon, 
  SparklesIcon,
  ComputerDesktopIcon,
  CloudIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import LoadingDialog from './LoadingDialog';
import ErrorDialog from './ErrorDialog';
import SuccessDialog from './SuccessDialog';

interface ImageGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated: (asset: any) => void;
  category?: string;
  filename?: string;
  channel?: string;
  topic?: string;
}

interface ModelInfo {
  name: string;
  available: boolean;
  sizes?: string[];
  qualities?: string[];
  styles?: string[];
  defaultUrl?: string;
  status?: any;
}

interface ModelsConfig {
  openai: ModelInfo;
  grok: ModelInfo;
  comfyui: ModelInfo;
}

export default function ImageGenerationDialog({
  isOpen,
  onClose,
  onImageGenerated,
  category = 'image',
  filename,
  channel = 'minimate',
  topic = 'animals'
}: ImageGenerationDialogProps) {
  const [formData, setFormData] = useState({
    prompt: '',
    model: 'openai' as 'openai' | 'grok' | 'comfyui',
    size: '1024x1024',
    quality: 'standard' as 'standard' | 'hd',
    style: 'vivid' as 'vivid' | 'natural',
    category: category,
    filename: filename || '',
    comfyuiUrl: 'http://localhost:8188',
    channel: channel,
    topic: topic
  });

  const [models, setModels] = useState<ModelsConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | undefined>(undefined);
  const [isCheckingComfyUI, setIsCheckingComfyUI] = useState(false);

  // Load available models on component mount
  useEffect(() => {
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        prompt: '',
        model: 'openai',
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
        category: category,
        filename: filename || '',
        comfyuiUrl: 'http://localhost:8188',
        channel: channel,
        topic: topic
      });
      setGeneratedImageUrl(undefined);
      setError(undefined);
      setSuccessMessage(undefined);
    }
  }, [isOpen, category, filename]);

  const loadModels = async () => {
    try {
      const response = await fetch('/api/assets/generate-image?check_comfyui=true');
      if (response.ok) {
        const data = await response.json();
        setModels(data.models);
      }
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const checkComfyUI = async () => {
    setIsCheckingComfyUI(true);
    try {
      await loadModels();
    } finally {
      setIsCheckingComfyUI(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.prompt.trim()) {
      setError('Please enter a prompt for image generation');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Generating image...');
    setError(undefined);
    setGeneratedImageUrl(undefined);

    try {
      const response = await fetch('/api/assets/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      if (data.success) {
        setGeneratedImageUrl(data.imageUrl);
        setSuccessMessage('Image generated successfully!');
        
        // If the image was saved as an asset, notify the parent
        if (data.savedAsset) {
          onImageGenerated(data.savedAsset);
        }
      } else {
        throw new Error('Image generation failed');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleClose = () => {
    onClose();
  };

  const getModelIcon = (model: string) => {
    return model === 'openai' ? <CloudIcon className="w-5 h-5" /> : <ComputerDesktopIcon className="w-5 h-5" />;
  };

  const getModelStatusIcon = (model: ModelInfo) => {
    if (model.available) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    } else {
      return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
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
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <PhotoIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Generate Image</h2>
                    <p className="text-sm text-gray-500">Create images using AI models</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Model Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      AI Model
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {models && Object.entries(models).map(([key, model]) => (
                        <div
                          key={key}
                          className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            formData.model === key
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${!model.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                     onClick={() => model.available && setFormData(prev => ({ ...prev, model: key as 'openai' | 'grok' | 'comfyui' }))}
                        >
                          <div className="flex items-center space-x-3">
                            {getModelIcon(key)}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{model.name}</span>
                                {getModelStatusIcon(model)}
                              </div>
                              {!model.available && (
                                <p className="text-xs text-red-500 mt-1">
                                  {key === 'openai' ? 'API key not configured' : 'Not available'}
                                </p>
                              )}
                            </div>
                          </div>
                          {formData.model === key && (
                            <div className="absolute top-2 right-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {models?.comfyui && !models.comfyui.available && (
                      <div className="mt-3 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={checkComfyUI}
                          disabled={isCheckingComfyUI}
                          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          {isCheckingComfyUI ? 'Checking...' : 'Check ComfyUI Connection'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Prompt */}
                  <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                      Prompt *
                    </label>
                    <textarea
                      id="prompt"
                      name="prompt"
                      value={formData.prompt}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      placeholder="Describe the image you want to generate..."
                      required
                    />
                  </div>

                  {/* Model-specific options */}
                  {formData.model === 'openai' && models?.openai && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
                          Size
                        </label>
                        <select
                          id="size"
                          name="size"
                          value={formData.size}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                        >
                          {models.openai.sizes?.map(size => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="quality" className="block text-sm font-medium text-gray-700 mb-2">
                          Quality
                        </label>
                        <select
                          id="quality"
                          name="quality"
                          value={formData.quality}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                        >
                          {models.openai.qualities?.map(quality => (
                            <option key={quality} value={quality}>{quality}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
                          Style
                        </label>
                        <select
                          id="style"
                          name="style"
                          value={formData.style}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                        >
                          {models.openai.styles?.map(style => (
                            <option key={style} value={style}>{style}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {formData.model === 'grok' && models?.grok && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
                          Size (Fixed)
                        </label>
                        <select
                          id="size"
                          name="size"
                          value={formData.size}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                          disabled
                        >
                          {models.grok.sizes?.map(size => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="quality" className="block text-sm font-medium text-gray-700 mb-2">
                          Quality (Fixed)
                        </label>
                        <select
                          id="quality"
                          name="quality"
                          value={formData.quality}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                          disabled
                        >
                          {models.grok.qualities?.map(quality => (
                            <option key={quality} value={quality}>{quality}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {formData.model === 'comfyui' && models?.comfyui && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
                          Size
                        </label>
                        <select
                          id="size"
                          name="size"
                          value={formData.size}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                        >
                          {models.comfyui.sizes?.map(size => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="comfyuiUrl" className="block text-sm font-medium text-gray-700 mb-2">
                          ComfyUI URL
                        </label>
                        <input
                          type="url"
                          id="comfyuiUrl"
                          name="comfyuiUrl"
                          value={formData.comfyuiUrl}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="http://localhost:8188"
                        />
                      </div>
                    </div>
                  )}

                  {/* File options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <input
                        type="text"
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                        placeholder="image"
                      />
                    </div>
                    <div>
                      <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-2">
                        Filename (optional)
                      </label>
                      <input
                        type="text"
                        id="filename"
                        name="filename"
                        value={formData.filename}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                        placeholder="generated_image.png"
                      />
                    </div>
                  </div>

                  {/* Generated Image Preview */}
                  {generatedImageUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Generated Image
                      </label>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <img
                          src={generatedImageUrl}
                          alt="Generated"
                          className="w-full h-64 object-contain rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !formData.prompt.trim() || (models && models[formData.model]?.available !== true)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      <SparklesIcon className="w-4 h-4" />
                      <span>Generate Image</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Dialog */}
      <LoadingDialog
        isOpen={isLoading}
        message={loadingMessage}
      />

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={error !== undefined}
        message={error || ''}
        onClose={() => setError(undefined)}
      />

      {/* Success Dialog */}
      <SuccessDialog
        isOpen={successMessage !== undefined}
        message={successMessage || ''}
        onClose={() => setSuccessMessage(undefined)}
      />
    </>
  );
} 