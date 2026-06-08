"use client";

import React, { useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Button, Dialog, IconButton, Input } from '@/app/components/ui';
import { logger } from "@/app/lib/logger";

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
      logger.error('Error creating format:', error);
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
      logger.error('Error deleting format:', error);
      setError('Failed to delete format. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Manage Render Formats" size="md">
      {/* Create New Format */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            value={newFormatCode}
            onChange={(e) => setNewFormatCode(e.target.value)}
            placeholder="Enter format code"
            className="flex-1"
          />
          <Input
            type="text"
            value={newFormatName}
            onChange={(e) => setNewFormatName(e.target.value)}
            placeholder="Enter format name"
            className="flex-1"
          />
          <Button
            variant="primary"
            onClick={handleCreateFormat}
            disabled={isLoading}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            Add
          </Button>
        </div>
        {error && (
          <p className="text-danger text-sm">{error}</p>
        )}
      </div>

      {/* List of Formats */}
      <div className="space-y-4">
        {formats.map((format) => (
          <div
            key={format.id}
            className="flex items-center justify-between bg-surface-raised p-3 rounded-lg"
          >
            <div className="flex flex-col">
              <span className="text-text font-mono font-semibold">{format.code}</span>
              <span className="text-text-muted text-sm">{format.name}</span>
            </div>
            <IconButton
              aria-label="Delete format"
              variant="danger"
              size="sm"
              onClick={() => handleDeleteFormat(format.id)}
              title="Delete format"
            >
              <XMarkIcon className="w-5 h-5" />
            </IconButton>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
