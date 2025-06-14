"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';
import TemplateManagerDialog from './TemplateManagerDialog';
import LoadingDialog from './LoadingDialog';
import ErrorDialog from './ErrorDialog';
import SuccessDialog from './SuccessDialog';
import OutputFolderManagerDialog from './OutputFolderManagerDialog';
import RenderFormatManagerDialog from './RenderFormatManagerDialog';

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
    templateAeComposition: 'Final',
    templateAeRenderFormat: { id: '', name: '' },
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

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        channelId: '',
        channelName: '',
        topic: '',
        type: '',
        templateAeUrl: '',
        templateAeComposition: 'Final',
        templateAeRenderFormat: { id: '', name: '' },
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
    }
  }, [isOpen]);

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
          name: selectedFormat.name
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (jsonFiles.length === 0) {
      setError('Please select at least one JSON file');
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage('Creating render items...');
      setError(null); // Clear any previous errors

      // Create a render item for each JSON file
      for (const jsonFile of jsonFiles) {
        try {
          const jsonContent = await jsonFile.text();
          const fileName = jsonFile.name.replace('.json', '');
          
          const { outputFolderPath, outputFolderPathValue, ...rest } = formData;
          const renderData = {
            ...rest,
            fileName,
            jsonContent: JSON.parse(jsonContent),
            nexrenderUid: '', // This will be generated by the server
            mp4Link: '', // This will be set after rendering
            status: 'new',
            renderOutputFolder: outputFolderPath,
          };

          await onSave(renderData);
        } catch (fileError: any) {
          console.error('Error processing file:', jsonFile.name, fileError);
          
          // If it's an API error, show the actual error message
          if (fileError?.type === 'api') {
            throw fileError; // Re-throw API errors to be handled by the outer catch
          }
          
          // Otherwise, it's a file processing error
          throw {
            type: 'data',
            message: `Failed to process file ${jsonFile.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
          };
        }
      }

      // Show success message
      setSuccessMessage(`Successfully created ${jsonFiles.length} render item${jsonFiles.length > 1 ? 's' : ''}`);
      onClose();
    } catch (error: any) {
      console.error('Error creating render items:', error);
      
      // Handle different types of errors
      if (error?.type === 'api') {
        // API errors (400, 500, etc.)
        setError(error.message);
      } else if (error?.type === 'network') {
        // Network errors
        setError('Network error occurred. Please check your connection and try again.');
      } else if (error?.type === 'data') {
        // Data processing errors
        setError(error.message);
      } else {
        // Unknown errors
        setError('An unexpected error occurred. Please try again.');
      }
      
      // Don't close the dialog on error
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
              className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
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
                        {format.name}
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
                    <option value="custom">Select from file...</option>
                  </select>
                  {formData.templateAeUrl === 'custom' && (
                    <input
                      type="file"
                      accept=".aep"
                      onChange={handleCustomTemplateChange}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mt-2"
                      required
                    />
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

                {/* Render JSONs */}
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
                    required
                  />
                  {jsonFiles.length > 0 && (
                    <p className="mt-2 text-sm text-gray-400">
                      Selected {jsonFiles.length} file(s)
                    </p>
                  )}
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