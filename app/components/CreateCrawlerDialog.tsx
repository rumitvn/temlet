"use client";

import { useState, useEffect } from "react";
import { logger } from "@/app/lib/logger";
import { channels, topics } from "@/app/data/filters";
import {
  PhotoIcon,
  VideoCameraIcon,
  GlobeAltIcon,
  ArrowDownTrayIcon,
  CogIcon,
  XMarkIcon
} from "@heroicons/react/24/solid";
import { Button, Input, Select, Label, Dialog } from "@/app/components/ui";

interface Site {
  id: string;
  name: string;
  type: 'image' | 'video' | 'both';
  url: string;
}

interface CreateCrawlerData {
  name: string;
  keyword: string;
  sites: string[];
  type: 'image' | 'video';
  channel: string;
  topic: string;
  settings: {
    maxItems: number;
    quality: 'low' | 'medium' | 'high';
    format: string;
  };
}

interface FormErrors {
  name?: string;
  keyword?: string;
  sites?: string;
  type?: string;
  channel?: string;
  topic?: string;
  settings?: {
    maxItems?: string;
    quality?: string;
    format?: string;
  };
}

interface CreateCrawlerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCrawlerData) => void;
}

const defaultSites: Site[] = [
  { id: "freepik", name: "Freepik", type: "video", url: "https://www.freepik.com/videos" },
  { id: "mixkit", name: "Mixkit", type: "video", url: "https://mixkit.co" },
  { id: "pexels", name: "Pexels", type: "image", url: "https://www.pexels.com" },
  { id: "pixabay", name: "Pixabay", type: "image", url: "https://pixabay.com" },
  { id: "unsplash", name: "Unsplash", type: "image", url: "https://unsplash.com" }
];

// Helper function to get available sites for a content type
const getAvailableSitesForType = (contentType: 'image' | 'video'): Site[] => {
  return defaultSites.filter(site => 
    site.type === "both" || site.type === contentType
  );
};

const defaultChannels = channels;
const defaultTopics = topics;

export default function CreateCrawlerDialog({ isOpen, onClose, onSubmit }: CreateCrawlerDialogProps) {
  // Get initial sites based on default type (image)
  const initialSites = getAvailableSitesForType("image").map(site => site.id);
  
  const [formData, setFormData] = useState<CreateCrawlerData>({
    name: "",
    keyword: "",
    sites: initialSites, // Initialize with all available sites
    type: "image",
    channel: "",
    topic: "",
    settings: {
      maxItems: 10,
      quality: "medium",
      format: "jpg"
    }
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load persisted values after component mounts
  useEffect(() => {
    // Only access localStorage after component mounts in browser
    if (typeof window !== 'undefined') {
      const lastChannel = localStorage.getItem('lastUsedChannel');
      const lastTopic = localStorage.getItem('lastUsedTopic');

      if (lastChannel || lastTopic) {
        setFormData(prev => ({
          ...prev,
          channel: lastChannel || prev.channel,
          topic: lastTopic || prev.topic
        }));
      }
    }
  }, []);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Get available sites for the current type
      const availableSites = getAvailableSitesForType("image").map(site => site.id);
      
      setFormData({
        name: "",
        keyword: "",
        sites: availableSites, // Set all available sites
        type: "image",
        channel: localStorage.getItem('lastUsedChannel') || "",
        topic: localStorage.getItem('lastUsedTopic') || "",
        settings: {
          maxItems: 10,
          quality: "medium",
          format: "jpg"
        }
      });
      setErrors({});
    }
  }, [isOpen]);

  // Auto-fill name when keyword changes
  useEffect(() => {
    if (formData.keyword) {
      const capitalizedKeyword = formData.keyword.charAt(0).toUpperCase() + formData.keyword.slice(1);
      const typeText = formData.type === "image" ? "Images" : "Videos";
      setFormData(prev => ({ ...prev, name: `${capitalizedKeyword} ${typeText}` }));
    }
  }, [formData.keyword, formData.type]);

  // Select all available sites when type changes
  useEffect(() => {
    const availableSites = getAvailableSitesForType(formData.type).map(site => site.id);
    setFormData(prev => ({
      ...prev,
      sites: availableSites // Update to all available sites for the new type
    }));
  }, [formData.type]);

  // Save channel and topic to localStorage when they change
  useEffect(() => {
    // Only save to localStorage in browser environment
    if (typeof window !== 'undefined') {
      if (formData.channel) {
        localStorage.setItem('lastUsedChannel', formData.channel);
      }
      if (formData.topic) {
        localStorage.setItem('lastUsedTopic', formData.topic);
      }
    }
  }, [formData.channel, formData.topic]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.keyword.trim()) {
      newErrors.keyword = "Keyword is required";
    }

    if (formData.sites.length === 0) {
      newErrors.sites = "At least one site must be selected";
    }

    if (!formData.channel) {
      newErrors.channel = "Channel is required";
    }

    if (!formData.topic) {
      newErrors.topic = "Topic is required";
    }

    if (formData.settings.maxItems < 1 || formData.settings.maxItems > 100) {
      newErrors.settings = {
        ...newErrors.settings,
        maxItems: "Max items must be between 1 and 100"
      };
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      logger.debug('Submitting form data:', formData); // Add logging
      await onSubmit(formData);
      onClose();
    } catch (error) {
      logger.error('Error creating crawler:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CreateCrawlerData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (field in errors) {
      const newErrors = { ...errors };
      delete newErrors[field as keyof FormErrors];
      setErrors(newErrors);
    }
  };

  const handleSettingsChange = (field: keyof CreateCrawlerData['settings'], value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
    
    // Clear settings error for this field
    if (errors.settings?.[field]) {
      setErrors(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [field]: undefined
        }
      }));
    }
  };

  const getFormatOptions = () => {
    if (formData.type === "image") {
      return ["jpg", "png", "webp"];
    } else {
      return ["mp4", "webm", "avi"];
    }
  };

  const generateName = () => {
    if (formData.keyword && formData.type) {
      const capitalizedKeyword = formData.keyword.charAt(0).toUpperCase() + formData.keyword.slice(1);
      const typeText = formData.type === "image" ? "Images" : "Videos";
      return `${capitalizedKeyword} ${typeText}`;
    }
    return "";
  };

  // Auto-generate name when keyword or type changes
  useEffect(() => {
    if (!formData.name || formData.name === generateName()) {
      const generatedName = generateName();
      if (generatedName) {
        setFormData(prev => ({ ...prev, name: generatedName }));
      }
    }
  }, [formData.keyword, formData.type]);

  // Update SiteSelection component to include "Select All" functionality
  const SiteSelection = () => {
    const availableSites = getAvailableSitesForType(formData.type);
    const allSelected = availableSites.every(site => formData.sites.includes(site.id));

    const handleSelectAll = () => {
      if (allSelected) {
        // Deselect all
        setFormData(prev => ({
          ...prev,
          sites: []
        }));
      } else {
        // Select all
        setFormData(prev => ({
          ...prev,
          sites: availableSites.map(site => site.id)
        }));
      }
    };

    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Source Websites *</Label>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-sm text-accent hover:text-accent-hover"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="space-y-2">
          {availableSites.map((site) => (
            <label key={site.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.sites.includes(site.id)}
                onChange={(e) => {
                  const newSites = e.target.checked
                    ? [...formData.sites, site.id]
                    : formData.sites.filter(s => s !== site.id);
                  handleInputChange("sites", newSites);
                }}
                className="rounded border-border bg-surface-sunken accent-accent"
              />
              <span className="text-text-muted">{site.name}</span>
            </label>
          ))}
        </div>
        {errors.sites && (
          <p className="mt-1 text-sm text-danger">{errors.sites}</p>
        )}
      </div>
    );
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg" showClose={false} className="p-0">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent rounded-lg">
            <GlobeAltIcon className="w-6 h-6 text-accent-fg" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text">Create New Crawler</h2>
            <p className="text-text-muted">Download images and videos from websites</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-surface-raised rounded-lg transition-colors"
        >
          <XMarkIcon className="w-6 h-6 text-text-muted" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <CogIcon className="w-5 h-5 text-accent" />
            Basic Information
          </h3>

          {/* Move keyword field before name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Keyword */}
            <div>
              <Label className="mb-2">Search Keyword *</Label>
              <Input
                type="text"
                value={formData.keyword}
                onChange={(e) => handleInputChange("keyword", e.target.value)}
                error={!!errors.keyword}
                placeholder="e.g., capybara"
                autoFocus
              />
              {errors.keyword && (
                <p className="mt-1 text-sm text-danger">{errors.keyword}</p>
              )}
            </div>

            {/* Name */}
            <div>
              <Label className="mb-2">Crawler Name *</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                error={!!errors.name}
                placeholder="Auto-generated from keyword"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-danger">{errors.name}</p>
              )}
            </div>
          </div>

          {/* Type Selection */}
          <div>
            <Label className="mb-3">Content Type *</Label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  logger.debug('Setting type to image'); // Add logging
                  handleInputChange("type", "image");
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  formData.type === "image"
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-border bg-surface-raised text-text-muted hover:border-border-strong"
                }`}
              >
                <PhotoIcon className="w-5 h-5" />
                <span>Images</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  logger.debug('Setting type to video'); // Add logging
                  handleInputChange("type", "video");
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  formData.type === "video"
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-border bg-surface-raised text-text-muted hover:border-border-strong"
                }`}
              >
                <VideoCameraIcon className="w-5 h-5" />
                <span>Videos</span>
              </button>
            </div>
          </div>
        </div>

        {/* Site and Channel Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <GlobeAltIcon className="w-5 h-5 text-info" />
            Source & Destination
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Replace site dropdown with SiteSelection component */}
            <SiteSelection />

            {/* Channel Selection */}
            <div>
              <Label className="mb-2">Channel *</Label>
              <Select
                value={formData.channel}
                onChange={(e) => handleInputChange("channel", e.target.value)}
                error={!!errors.channel}
              >
                <option value="">Select a channel</option>
                {defaultChannels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </Select>
              {errors.channel && (
                <p className="mt-1 text-sm text-danger">{errors.channel}</p>
              )}
            </div>
          </div>

          {/* Topic Selection */}
          <div>
            <Label className="mb-2">Topic *</Label>
            <Select
              value={formData.topic}
              onChange={(e) => handleInputChange("topic", e.target.value)}
              error={!!errors.topic}
            >
              <option value="">Select a topic</option>
              {defaultTopics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </Select>
            {errors.topic && (
              <p className="mt-1 text-sm text-danger">{errors.topic}</p>
            )}
          </div>
        </div>

        {/* Download Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <ArrowDownTrayIcon className="w-5 h-5 text-success" />
            Download Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Max Items */}
            <div>
              <Label className="mb-2">Max Items</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.settings.maxItems}
                onChange={(e) => handleSettingsChange("maxItems", parseInt(e.target.value))}
                error={!!errors.settings?.maxItems}
              />
              {errors.settings?.maxItems && (
                <p className="mt-1 text-sm text-danger">{errors.settings.maxItems}</p>
              )}
            </div>

            {/* Quality */}
            <div>
              <Label className="mb-2">Quality</Label>
              <Select
                value={formData.settings.quality}
                onChange={(e) => handleSettingsChange("quality", e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>

            {/* Format */}
            <div>
              <Label className="mb-2">Format</Label>
              <Select
                value={formData.settings.format}
                onChange={(e) => handleSettingsChange("format", e.target.value)}
              >
                {getFormatOptions().map((format) => (
                  <option key={format} value={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Output Path Preview */}
          <div className="bg-surface-raised rounded-lg p-4">
            <Label className="mb-2">Output Path</Label>
            <div className="text-sm text-text-muted font-mono bg-bg px-3 py-2 rounded border border-border">
              /{formData.channel?.toLowerCase().replace(/\s+/g, '') || 'channel'}/{formData.topic?.toLowerCase() || 'topic'}/crawler/{formData.type}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            loading={isSubmitting}
            className="flex-1"
            leftIcon={<GlobeAltIcon className="w-5 h-5" />}
          >
            {isSubmitting ? 'Creating...' : 'Create Crawler'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
} 