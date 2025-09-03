"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  CloudIcon,
  ComputerDesktopIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

interface ProviderSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProviderSelect: (provider: 'openai' | 'grok' | 'comfyui') => void;
  title: string;
  description?: string;
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

export default function ProviderSelectionDialog({
  isOpen,
  onClose,
  onProviderSelect,
  title,
  description
}: ProviderSelectionDialogProps) {
  const [models, setModels] = useState<ModelsConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load available models on component mount
  useEffect(() => {
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  const loadModels = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/assets/generate-image?check_comfyui=true');
      if (response.ok) {
        const data = await response.json();
        setModels(data.models);
      }
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderSelect = (provider: 'openai' | 'grok' | 'comfyui') => {
    onProviderSelect(provider);
    onClose();
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return <CloudIcon className="w-6 h-6" />;
      case 'grok':
        return <SparklesIcon className="w-6 h-6" />;
      case 'comfyui':
        return <ComputerDesktopIcon className="w-6 h-6" />;
      default:
        return <SparklesIcon className="w-6 h-6" />;
    }
  };

  const getProviderStatusIcon = (model: ModelInfo | null) => {
    if (!model) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
    }
    if (model.available) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    } else {
      return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
    }
  };

  const getProviderInfo = (provider: string) => {
    if (!models) return null;
    
    const model = models[provider as keyof ModelsConfig];
    if (!model) return null;

    return {
      name: model.name,
      available: model.available,
      status: model.status
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-600">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <SparklesIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{title}</h2>
                  {description && (
                    <p className="text-sm text-gray-400">{description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <span className="ml-3 text-gray-300">Loading providers...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* ComfyUI Option */}
                  {(() => {
                    const info = getProviderInfo('comfyui');
                    return (
                      <button
                        onClick={() => handleProviderSelect('comfyui')}
                        disabled={!info?.available}
                        className={`w-full p-4 rounded-lg border transition-all hover:scale-105 ${
                          info?.available
                            ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500'
                            : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <ComputerDesktopIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">ComfyUI (Local)</div>
                              <div className="text-sm text-gray-400">High quality, local generation</div>
                            </div>
                          </div>
                          {getProviderStatusIcon(info)}
                        </div>
                      </button>
                    );
                  })()}

                  {/* Grok Option */}
                  {(() => {
                    const info = getProviderInfo('grok');
                    return (
                      <button
                        onClick={() => handleProviderSelect('grok')}
                        disabled={!info?.available}
                        className={`w-full p-4 rounded-lg border transition-all hover:scale-105 ${
                          info?.available
                            ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500'
                            : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <SparklesIcon className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">Grok-2 Image</div>
                              <div className="text-sm text-gray-400">Fast, cloud-based generation</div>
                            </div>
                          </div>
                          {getProviderStatusIcon(info)}
                        </div>
                      </button>
                    );
                  })()}

                  {/* OpenAI Option */}
                  {(() => {
                    const info = getProviderInfo('openai');
                    return (
                      <button
                        onClick={() => handleProviderSelect('openai')}
                        disabled={!info?.available}
                        className={`w-full p-4 rounded-lg border transition-all hover:scale-105 ${
                          info?.available
                            ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500'
                            : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <CloudIcon className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">OpenAI DALL-E 3</div>
                              <div className="text-sm text-gray-400">Premium quality, paid service</div>
                            </div>
                          </div>
                          {getProviderStatusIcon(info)}
                        </div>
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 