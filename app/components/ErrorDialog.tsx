import React from 'react';
import { Button, Dialog } from '@/app/components/ui';

interface ErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export default function ErrorDialog({ isOpen, onClose, message }: ErrorDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={<span className="text-danger">Error</span>}
      footer={
        <Button variant="danger" onClick={onClose}>
          Close
        </Button>
      }
    >
      <p className="text-text">{message}</p>
    </Dialog>
  );
}
