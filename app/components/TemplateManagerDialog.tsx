import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { Dialog, IconButton } from '@/app/components/ui';
import LoadingDialog from './LoadingDialog';

interface TemplateManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templates: { id: string; path: string }[];
  onTemplatesChange: () => void;
}

export default function TemplateManagerDialog({
  isOpen,
  onClose,
  templates,
  onTemplatesChange,
}: TemplateManagerDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleDeleteTemplate = async (id: string) => {
    try {
      setIsLoading(true);
      setLoadingMessage('Deleting template...');

      const response = await fetch(`/api/templates?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      onTemplatesChange();
    } catch (error) {
      console.error('Error deleting template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog isOpen={isOpen} onClose={onClose} title="Manage Templates" size="md">
        <div className="space-y-4">
          {templates.map(template => (
            <div
              key={template.id}
              className="flex items-center justify-between bg-surface-raised p-3 rounded-lg"
            >
              <span className="text-text">
                {template.path.split('/').pop()}
              </span>
              <IconButton
                aria-label="Delete template"
                variant="danger"
                size="sm"
                onClick={() => handleDeleteTemplate(template.id)}
                title="Delete template"
              >
                <XMarkIcon className="w-5 h-5" />
              </IconButton>
            </div>
          ))}
        </div>
      </Dialog>

      <LoadingDialog isOpen={isLoading} message={loadingMessage} />
    </>
  );
}
