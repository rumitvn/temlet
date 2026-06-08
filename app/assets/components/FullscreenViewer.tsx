import { ChevronUpIcon } from "@heroicons/react/24/outline";
import { XCircleIcon } from "@heroicons/react/24/solid";
import type { CrawlerResource, ResourceType, ResourceTarget } from "../types";

interface FullscreenViewerProps {
  image: CrawlerResource;
  onClose: () => void;
  showQuizMenu: boolean;
  onToggleQuizMenu: () => void;
  missingQuizOptions: string[];
  onSelectResource: (
    resourcePath: string,
    type: ResourceType,
    target: ResourceTarget,
    quizOption?: string,
  ) => void;
}

export default function FullscreenViewer({
  image,
  onClose,
  showQuizMenu,
  onToggleQuizMenu,
  missingQuizOptions,
  onSelectResource,
}: FullscreenViewerProps) {
  return (
    <div
      className="fixed inset-0 bg-black z-[100] flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-surface-sunken">
        <h3 className="text-xl font-semibold text-text">{image.name}</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text">
          <XCircleIcon className="w-8 h-8" />
        </button>
      </div>

      {/* Main Image */}
      <div className="flex-1 flex items-center justify-center p-4">
        <img
          src={image.url}
          alt={image.name}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Footer with Actions */}
      <div className="bg-surface-sunken p-4">
        <div className="flex flex-col gap-4 max-w-2xl mx-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectResource(image.path, "image", "main");
            }}
            className="w-full bg-info hover:opacity-90 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors"
          >
            Use as Main Image
          </button>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleQuizMenu();
              }}
              className="w-full bg-accent hover:bg-accent-hover text-accent-fg px-6 py-3 rounded-lg text-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              Use for Quiz Option
              <ChevronUpIcon
                className={`w-5 h-5 transition-transform ${showQuizMenu ? "rotate-180" : ""}`}
              />
            </button>

            {showQuizMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface rounded-lg shadow-xl overflow-hidden">
                {missingQuizOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleQuizMenu();
                      onSelectResource(image.path, "image", "quiz3", option);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-surface transition-colors flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent text-accent-fg flex items-center justify-center font-medium">
                      {index + 1}
                    </div>
                    <span>Use as Quiz Option {index + 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
