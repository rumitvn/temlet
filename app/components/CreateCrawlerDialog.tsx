"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  XMarkIcon,
  PhotoIcon,
  VideoCameraIcon,
  GlobeAltIcon,
  ArrowDownTrayIcon,
  CogIcon
} from "@heroicons/react/24/outline";

interface CreateCrawlerData {
  name: string;
  keyword: string;
  site: string;
  type: 'image' | 'video';
  channel: string;
  topic: string;
  settings: {
    maxItems: number;
    quality: 'low' | 'medium' | 'high';
    format: string;
  };
}

interface CreateCrawlerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCrawlerData) => void;
}

const defaultSites = [
  { id: "pexels", name: "Pexels", type: "both", url: "https://www.pexels.com" },
  { id: "pixabay", name: "Pixabay", type: "both", url: "https://pixabay.com" },
  { id: "unsplash", name: "Unsplash", type: "image", url: "https://unsplash.com" },
  { id: "pexels-videos", name: "Pexels Videos", type: "video", url: "https://www.pexels.com/videos" },
  { id: "pixabay-videos", name: "Pixabay Videos", type: "video", url: "https://pixabay.com/videos" }
];

const defaultChannels = [
  "MiniMate",
  "RumitX Studio",
  "RumitX Shorts",
  "RumitX Nature",
  "RumitX Science",
  "RumitX History"
];

const defaultTopics = [
  "Animals",
  "Plants",
  "Histories",
  "Science",
  "Technology",
  "Nature",
  "Space",
  "Ocean",
  "Weather",
  "Geography"
];

export default function CreateCrawlerDialog({ isOpen, onClose, onSubmit }: CreateCrawlerDialogProps) {
  const [formData, setFormData] = useState<CreateCrawlerData>({
    name: "",
    keyword: "",
    site: "",
    type: "image",
    channel: "",
    topic: "",
    settings: {
      maxItems: 10,
      quality: "medium",
      format: "jpg"
    }
  });

  const [errors, setErrors] = useState<Partial<CreateCrawlerData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        keyword: "",
        site: "",
        type: "image",
        channel: "",
        topic: "",
        settings: {
          maxItems: 10,
          quality: "medium",
          format: "jpg"
        }
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateCrawlerData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.keyword.trim()) {
      newErrors.keyword = "Keyword is required";
    }

    if (!formData.site) {
      newErrors.site = "Site is required";
    }

    if (!formData.channel) {
      newErrors.channel = "Channel is required";
    }

    if (!formData.topic) {
      newErrors.topic = "Topic is required";
    }

    if (formData.settings.maxItems < 1 || formData.settings.maxItems > 100) {
      newErrors.settings = { ...newErrors.settings, maxItems: "Max items must be between 1 and 100" };
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
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error creating crawler:', error);
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
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
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

  const getAvailableSites = () => {
    return defaultSites.filter(site => 
      site.type === "both" || site.type === formData.type
    );
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <GlobeAltIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Create New Crawler</h2>
                  <p className="text-gray-400">Download images and videos from websites</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CogIcon className="w-5 h-5 text-purple-400" />
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Crawler Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.name ? "border-red-500" : "border-gray-600"
                      }`}
                      placeholder="e.g., Capybara Videos"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                    )}
                  </div>

                  {/* Keyword */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Search Keyword *
                    </label>
                    <input
                      type="text"
                      value={formData.keyword}
                      onChange={(e) => handleInputChange("keyword", e.target.value)}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.keyword ? "border-red-500" : "border-gray-600"
                      }`}
                      placeholder="e.g., capybara"
                    />
                    {errors.keyword && (
                      <p className="mt-1 text-sm text-red-400">{errors.keyword}</p>
                    )}
                  </div>
                </div>

                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Content Type *
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleInputChange("type", "image")}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.type === "image"
                          ? "border-purple-500 bg-purple-500/20 text-purple-400"
                          : "border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      <PhotoIcon className="w-5 h-5" />
                      <span>Images</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange("type", "video")}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.type === "video"
                          ? "border-purple-500 bg-purple-500/20 text-purple-400"
                          : "border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500"
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
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <GlobeAltIcon className="w-5 h-5 text-blue-400" />
                  Source & Destination
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Site Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Source Website *
                    </label>
                    <select
                      value={formData.site}
                      onChange={(e) => handleInputChange("site", e.target.value)}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.site ? "border-red-500" : "border-gray-600"
                      }`}
                    >
                      <option value="">Select a website</option>
                      {getAvailableSites().map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                    {errors.site && (
                      <p className="mt-1 text-sm text-red-400">{errors.site}</p>
                    )}
                  </div>

                  {/* Channel Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Channel *
                    </label>
                    <select
                      value={formData.channel}
                      onChange={(e) => handleInputChange("channel", e.target.value)}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.channel ? "border-red-500" : "border-gray-600"
                      }`}
                    >
                      <option value="">Select a channel</option>
                      {defaultChannels.map((channel) => (
                        <option key={channel} value={channel}>
                          {channel}
                        </option>
                      ))}
                    </select>
                    {errors.channel && (
                      <p className="mt-1 text-sm text-red-400">{errors.channel}</p>
                    )}
                  </div>
                </div>

                {/* Topic Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Topic *
                  </label>
                  <select
                    value={formData.topic}
                    onChange={(e) => handleInputChange("topic", e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.topic ? "border-red-500" : "border-gray-600"
                    }`}
                  >
                    <option value="">Select a topic</option>
                    {defaultTopics.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                  {errors.topic && (
                    <p className="mt-1 text-sm text-red-400">{errors.topic}</p>
                  )}
                </div>
              </div>

              {/* Download Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ArrowDownTrayIcon className="w-5 h-5 text-green-400" />
                  Download Settings
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Max Items */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Items
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.settings.maxItems}
                      onChange={(e) => handleSettingsChange("maxItems", parseInt(e.target.value))}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.settings?.maxItems ? "border-red-500" : "border-gray-600"
                      }`}
                    />
                    {errors.settings?.maxItems && (
                      <p className="mt-1 text-sm text-red-400">{errors.settings.maxItems}</p>
                    )}
                  </div>

                  {/* Quality */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Quality
                    </label>
                    <select
                      value={formData.settings.quality}
                      onChange={(e) => handleSettingsChange("quality", e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Format */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Format
                    </label>
                    <select
                      value={formData.settings.format}
                      onChange={(e) => handleSettingsChange("format", e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {getFormatOptions().map((format) => (
                        <option key={format} value={format}>
                          {format.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Output Path Preview */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Output Path
                  </label>
                  <div className="text-sm text-gray-400 font-mono bg-gray-800 px-3 py-2 rounded border border-gray-600">
                    /{formData.channel?.toLowerCase().replace(/\s+/g, '') || 'channel'}/{formData.topic?.toLowerCase() || 'topic'}/crawler/{formData.type}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <GlobeAltIcon className="w-5 h-5" />
                      Create Crawler
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 