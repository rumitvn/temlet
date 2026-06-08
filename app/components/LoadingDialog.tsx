import React from 'react';
import { Dialog } from '@/app/components/ui';

interface LoadingDialogProps {
  isOpen: boolean;
  message: string;
}

export default function LoadingDialog({ isOpen, message }: LoadingDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {}}
      size="sm"
      showClose={false}
      dismissible={false}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-accent" />
        <p className="text-text">{message}</p>
      </div>
    </Dialog>
  );
}
