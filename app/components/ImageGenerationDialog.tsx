"use client";

import React, { useState, useEffect } from 'react';
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
import { Button, IconButton, Input, Textarea, Select, Label, Dialog } from "@/app/components/ui";

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
    model: 'comfyui' as 'openai' | 'grok' | 'comfyui',
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
        model: 'comfyui',
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
      return <CheckCircleIcon className="w-5 h-5 text-success" />;
    } else {
      return <ExclamationTriangleIcon className="w-5 h-5 text-danger" />;
    }
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        size="lg"
        showClose={false}
        className="p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-accent-muted rounded-lg">
              <PhotoIcon className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text">Generate Image</h2>
              <p className="text-sm text-text-muted">Create images using AI models</p>
            </div>
          </div>
          <IconButton aria-label="Close dialog" variant="ghost" onClick={handleClose}>
            <XMarkIcon className="w-6 h-6" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Model Selection */}
            <div>
              <Label className="mb-3">AI Model</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {models && Object.entries(models).map(([key, model]) => (
                  <div
                    key={key}
                    className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.model === key
                        ? 'border-accent bg-accent-muted'
                        : 'border-border hover:border-border-strong bg-surface-raised'
                    } ${!model.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => model.available && setFormData(prev => ({ ...prev, model: key as 'openai' | 'grok' | 'comfyui' }))}
                  >
                    <div className="flex items-center space-x-3">
                      {getModelIcon(key)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-text">{model.name}</span>
                          {getModelStatusIcon(model)}
                        </div>
                        {!model.available && (
                          <p className="text-xs text-danger mt-1">
                            {key === 'openai' ? 'API key not configured' : 'Not available'}
                          </p>
                        )}
                      </div>
                    </div>
                    {formData.model === key && (
                      <div className="absolute top-2 right-2">
                        <div className="w-3 h-3 bg-accent rounded-full"></div>
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
                    className="text-sm text-accent hover:text-accent-hover disabled:opacity-50"
                  >
                    {isCheckingComfyUI ? 'Checking...' : 'Check ComfyUI Connection'}
                  </button>
                </div>
              )}
            </div>

            {/* Prompt */}
            <div>
              <Label htmlFor="prompt" className="mb-2">Prompt *</Label>
              <Textarea
                id="prompt"
                name="prompt"
                value={formData.prompt}
                onChange={handleInputChange}
                rows={4}
                placeholder="Describe the image you want to generate..."
                required
              />
            </div>

            {/* Model-specific options */}
            {formData.model === 'openai' && models?.openai && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="size" className="mb-2">Size</Label>
                  <Select
                    id="size"
                    name="size"
                    value={formData.size}
                    onChange={handleInputChange}
                  >
                    {models.openai.sizes?.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quality" className="mb-2">Quality</Label>
                  <Select
                    id="quality"
                    name="quality"
                    value={formData.quality}
                    onChange={handleInputChange}
                  >
                    {models.openai.qualities?.map(quality => (
                      <option key={quality} value={quality}>{quality}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="style" className="mb-2">Style</Label>
                  <Select
                    id="style"
                    name="style"
                    value={formData.style}
                    onChange={handleInputChange}
                  >
                    {models.openai.styles?.map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </Select>
                </div>
              </div>
            )}

            {formData.model === 'grok' && models?.grok && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="size" className="mb-2">Size (Fixed)</Label>
                  <Select
                    id="size"
                    name="size"
                    value={formData.size}
                    onChange={handleInputChange}
                    disabled
                  >
                    {models.grok.sizes?.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quality" className="mb-2">Quality (Fixed)</Label>
                  <Select
                    id="quality"
                    name="quality"
                    value={formData.quality}
                    onChange={handleInputChange}
                    disabled
                  >
                    {models.grok.qualities?.map(quality => (
                      <option key={quality} value={quality}>{quality}</option>
                    ))}
                  </Select>
                </div>
              </div>
            )}

            {formData.model === 'comfyui' && models?.comfyui && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="size" className="mb-2">Size</Label>
                  <Select
                    id="size"
                    name="size"
                    value={formData.size}
                    onChange={handleInputChange}
                  >
                    {models.comfyui.sizes?.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="comfyuiUrl" className="mb-2">ComfyUI URL</Label>
                  <Input
                    type="url"
                    id="comfyuiUrl"
                    name="comfyuiUrl"
                    value={formData.comfyuiUrl}
                    onChange={handleInputChange}
                    placeholder="http://localhost:8188"
                  />
                </div>
              </div>
            )}

            {/* File options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="mb-2">Category</Label>
                <Input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="image"
                />
              </div>
              <div>
                <Label htmlFor="filename" className="mb-2">Filename (optional)</Label>
                <Input
                  type="text"
                  id="filename"
                  name="filename"
                  value={formData.filename}
                  onChange={handleInputChange}
                  placeholder="generated_image.png"
                />
              </div>
            </div>

            {/* Generated Image Preview */}
            {generatedImageUrl && (
              <div>
                <Label className="mb-2">Generated Image</Label>
                <div className="border border-border rounded-lg p-4">
                  <img
                    src={generatedImageUrl}
                    alt="Generated"
                    className="w-full h-64 object-contain rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || !formData.prompt.trim() || (models ? models[formData.model]?.available !== true : true)}
                leftIcon={<SparklesIcon className="w-4 h-4" />}
              >
                Generate Image
              </Button>
            </div>
          </form>
        </div>
      </Dialog>

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
