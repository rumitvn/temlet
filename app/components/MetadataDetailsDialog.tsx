import { useState } from 'react';
import { RenderItem } from '../types/render';
import { Button, Dialog, Input, Textarea } from '@/app/components/ui';
import { logger } from "@/app/lib/logger";

interface MetadataDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  renderItem: RenderItem;
  onMetadataUpdate?: (updated: RenderItem) => void;
}

export default function MetadataDetailsDialog({ isOpen, onClose, renderItem, onMetadataUpdate }: MetadataDetailsDialogProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(renderItem.youtubeMetadata?.title || '');
  const [description, setDescription] = useState(renderItem.youtubeMetadata?.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedMetadata = {
        ...renderItem.youtubeMetadata,
        title,
        description,
        tags: renderItem.youtubeMetadata?.tags ?? '',
        categoryId: renderItem.youtubeMetadata?.categoryId ?? '',
        defaultLanguage: renderItem.youtubeMetadata?.defaultLanguage ?? '',
        defaultAudioLanguage: renderItem.youtubeMetadata?.defaultAudioLanguage ?? '',
        scheduleDate: renderItem.youtubeMetadata?.scheduleDate ?? '',
        playlistId: renderItem.youtubeMetadata?.playlistId ?? '',
      };
      const res = await fetch(`/api/renders/${renderItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeMetadata: updatedMetadata }),
      });
      logger.debug('PATCH response', res);
      if (res.ok) {
        const updated = await res.json();
        setEditing(false);
        if (onMetadataUpdate) {
          onMetadataUpdate(updated);
        }
      } else {
        alert('Failed to update metadata');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Metadata Details"
      footer={
        <>
          {editing ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving || !title.trim() || [...title].length > 100}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {renderItem.youtubeMetadata ? (
          <>
            <div>
              <h4 className="text-sm font-medium text-text-muted mb-1">Title</h4>
              {editing ? (
                <Input
                  className="mb-1"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={120}
                />
              ) : (
                <p className="text-text">{renderItem.youtubeMetadata.title}</p>
              )}
              <div className="text-xs text-text-muted">{[...title].length} / 100</div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-text-muted mb-1">Description</h4>
              {editing ? (
                <Textarea
                  className="mb-1"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                />
              ) : (
                <p className="text-text whitespace-pre-wrap">{renderItem.youtubeMetadata.description}</p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium text-text-muted mb-1">Tags</h4>
              <p className="text-text">{renderItem.youtubeMetadata.tags}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-text-muted mb-1">Category</h4>
              <p className="text-text">{renderItem.youtubeMetadata.categoryId}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-text-muted mb-1">Language</h4>
              <p className="text-text">
                {renderItem.youtubeMetadata.defaultLanguage} / {renderItem.youtubeMetadata.defaultAudioLanguage}
              </p>
            </div>
            {renderItem.youtubeMetadata.playlistId && (
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-1">Playlist ID</h4>
                <p className="text-text">{renderItem.youtubeMetadata.playlistId}</p>
              </div>
            )}
            {renderItem.youtubeMetadata.scheduleDate && (
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-1">Schedule Date</h4>
                <p className="text-text">{renderItem.youtubeMetadata.scheduleDate}</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-text-muted">No metadata generated yet</p>
        )}
      </div>
    </Dialog>
  );
}
