import { Button } from "@/app/components/ui";

interface RenderSelectionToolbarProps {
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAction: (action: string) => void;
  onDelete: () => void;
}

export default function RenderSelectionToolbar({
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onAction,
  onDelete,
}: RenderSelectionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface-raised border-t border-border shadow-overlay p-4 flex justify-between items-center z-50">
      <div className="flex items-center space-x-4">
        <span className="text-sm text-text-muted">
          {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <Button variant="secondary" size="sm" onClick={onSelectAll}>
          Select All
        </Button>
        <Button variant="secondary" size="sm" onClick={onDeselectAll}>
          Deselect All
        </Button>
      </div>
      <div className="flex space-x-2">
        <Button variant="primary" size="sm" onClick={() => onAction("render")}>
          Render
        </Button>
        <Button variant="primary" size="sm" onClick={() => onAction("metadata")}>
          Metadata
        </Button>
        <Button variant="primary" size="sm" onClick={() => onAction("upload")}>
          Upload
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onAction("tiktok-upload")}
        >
          TikTok
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
