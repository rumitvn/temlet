"use client";

import React, { useState, useEffect } from 'react';
import {
  CloudIcon,
  ComputerDesktopIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import { Dialog } from '@/app/components/ui';

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

  const getProviderStatusIcon = (model: ModelInfo | null) => {
    if (!model) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-danger" />;
    }
    if (model.available) {
      return <CheckCircleIcon className="w-5 h-5 text-success" />;
    } else {
      return <ExclamationTriangleIcon className="w-5 h-5 text-danger" />;
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

  const providerButtonClass = (available: boolean | undefined) =>
    `w-full p-4 rounded-lg border transition-all hover:scale-105 ${
      available
        ? 'bg-surface-raised border-border text-text hover:border-border-strong'
        : 'bg-surface border-border text-text-faint cursor-not-allowed'
    }`;

  const dialogTitle = (
    <div className="flex items-center space-x-3">
      <div className="p-2 bg-accent-muted rounded-lg">
        <SparklesIcon className="w-6 h-6 text-accent" />
      </div>
      <div>
        <span className="text-xl font-semibold text-text">{title}</span>
        {description && (
          <p className="text-sm text-text-muted">{description}</p>
        )}
      </div>
    </div>
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={dialogTitle} size="sm">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <span className="ml-3 text-text-muted">Loading providers...</span>
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
                className={providerButtonClass(info?.available)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-info-bg rounded-lg">
                      <ComputerDesktopIcon className="w-5 h-5 text-info" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">ComfyUI (Local)</div>
                      <div className="text-sm text-text-muted">High quality, local generation</div>
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
                className={providerButtonClass(info?.available)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-accent-muted rounded-lg">
                      <SparklesIcon className="w-5 h-5 text-accent" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Grok-2 Image</div>
                      <div className="text-sm text-text-muted">Fast, cloud-based generation</div>
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
                className={providerButtonClass(info?.available)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-success-bg rounded-lg">
                      <CloudIcon className="w-5 h-5 text-success" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">OpenAI DALL-E 3</div>
                      <div className="text-sm text-text-muted">Premium quality, paid service</div>
                    </div>
                  </div>
                  {getProviderStatusIcon(info)}
                </div>
              </button>
            );
          })()}
        </div>
      )}
    </Dialog>
  );
}
