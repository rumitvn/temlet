import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';
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
              className="bg-gray-800 rounded-lg p-6 w-full max-w-lg"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Manage Templates</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between bg-gray-700 p-3 rounded-lg"
                  >
                    <span className="text-white">
                      {template.path.split('/').pop()}
                    </span>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete template"
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

      <LoadingDialog isOpen={isLoading} message={loadingMessage} />
    </>
  );
} 