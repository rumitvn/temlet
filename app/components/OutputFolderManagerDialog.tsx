import React from 'react';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Manage Output Folders</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <ul className="space-y-2">
          {outputFolders.length === 0 && <li className="text-gray-400">No output folders saved.</li>}
          {outputFolders.map(folder => (
            <li key={folder.id} className="flex justify-between items-center bg-gray-700 rounded px-4 py-2">
              <span className="truncate max-w-xs">{folder.path}</span>
              <button
                onClick={() => handleDelete(folder.id)}
                className="ml-4 px-2 py-1 text-sm bg-red-600 hover:bg-red-700 rounded text-white"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">Close</button>
        </div>
      </div>
    </div>
  );
} 