import React from 'react';
import { Button, Dialog } from '@/app/components/ui';

interface OutputFolderManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  outputFolders: { id: string; path: string }[];
  onOutputFoldersChange: () => void;
}

export default function OutputFolderManagerDialog({
  isOpen,
  onClose,
  outputFolders,
  onOutputFoldersChange,
}: OutputFolderManagerDialogProps) {
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this output folder?')) return;
    try {
      const res = await fetch(`/api/output-folders?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete output folder');
      onOutputFoldersChange();
    } catch (err) {
      alert('Failed to delete output folder.');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Output Folders"
      size="md"
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ul className="space-y-2">
        {outputFolders.length === 0 && (
          <li className="text-text-muted">No output folders saved.</li>
        )}
        {outputFolders.map(folder => (
          <li
            key={folder.id}
            className="flex justify-between items-center bg-surface-raised rounded-md px-4 py-2"
          >
            <span className="truncate max-w-xs text-text">{folder.path}</span>
            <Button
              variant="danger"
              size="sm"
              className="ml-4"
              onClick={() => handleDelete(folder.id)}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
