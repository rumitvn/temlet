"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import LoadingDialog from './LoadingDialog';

interface RenderFormat {
  id: string;
  name: string;
  code: string;
}

interface RenderFormatManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formats: RenderFormat[];
  onFormatsChange: () => void;
}

export default function RenderFormatManagerDialog({
  isOpen,
  onClose,
  formats,
  onFormatsChange,
}: RenderFormatManagerDialogProps) {
  const [newFormatName, setNewFormatName] = useState('');
  const [newFormatCode, setNewFormatCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateFormat = async () => {
    if (!newFormatName.trim() || !newFormatCode.trim()) {
      setError('Please enter both name and code');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/render-formats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: newFormatName,
          code: newFormatCode 
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create format');
      }

      setNewFormatName('');
      setNewFormatCode('');
      onFormatsChange();
    } catch (error) {
      console.error('Error creating format:', error);
      setError(error instanceof Error ? error.message : 'Failed to create format. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFormat = async (id: string) => {
    if (!confirm('Are you sure you want to delete this format?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/render-formats/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete format');
      }

      onFormatsChange();
    } catch (error) {
      console.error('Error deleting format:', error);
      setError('Failed to delete format. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
            className="bg-gray-800 rounded-lg p-6 inline-block max-w-fit"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Manage Render Formats</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Create New Format */}
            <div className="mb-6 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFormatCode}
                  onChange={(e) => setNewFormatCode(e.target.value)}
                  placeholder="Enter format code"
                  className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2"
                />
                <input
                  type="text"
                  value={newFormatName}
                  onChange={(e) => setNewFormatName(e.target.value)}
                  placeholder="Enter format name"
                  className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2"
                />
                <button
                  onClick={handleCreateFormat}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
            </div>

            {/* List of Formats */}
            <div className="space-y-4">
              {formats.map((format) => (
                <div
                  key={format.id}
                  className="flex items-center justify-between bg-gray-700 p-3 rounded-lg"
                >
                  <div className="flex flex-col">
                    <span className="text-white font-mono font-semibold">{format.code}</span>
                    <span className="text-gray-400 text-sm">{format.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteFormat(format.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete format"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 