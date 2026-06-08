import { motion } from "framer-motion";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import type { Dispatch, SetStateAction } from "react";
import { getSelectionKey } from "../utils";
import SelectionButton from "./SelectionButton";
import type {
  Asset,
  CrawlerResource,
  ResourceType,
  ResourceTarget,
  SelectionState,
} from "../types";

type ResourcesByOption = Record<
  string,
  { images: CrawlerResource[]; videos: CrawlerResource[] }
>;

interface CrawlerDialogProps {
  selectedJsonAsset: Asset | null;
  crawlerResources: { images: CrawlerResource[]; videos: CrawlerResource[] };
  crawlerResourcesByOption: ResourcesByOption;
  missingQuizOptions: string[];
  selectionState: SelectionState;
  updatedAssets: Set<string>;
  setShowCrawlerDialog: Dispatch<SetStateAction<boolean>>;
  setFullscreenImage: Dispatch<SetStateAction<CrawlerResource | null>>;
  setUpdatedAssets: Dispatch<SetStateAction<Set<string>>>;
  fetchAssets: (searchTerm?: string, isSearch?: boolean) => void;
  handleSelectCrawlerResource: (
    resourcePath: string,
    type: ResourceType,
    target: ResourceTarget,
    quizOption?: string,
  ) => void;
}

export default function CrawlerDialog({
  selectedJsonAsset,
  crawlerResources,
  crawlerResourcesByOption,
  missingQuizOptions,
  selectionState,
  updatedAssets,
  setShowCrawlerDialog,
  setFullscreenImage,
  setUpdatedAssets,
  fetchAssets,
  handleSelectCrawlerResource,
}: CrawlerDialogProps) {
  return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-surface rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
    >
                    <div className="flex flex-col gap-4 sticky top-0 bg-surface z-10 pb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Crawler Resources</h2>
                          <button
          onClick={async () => {
            setShowCrawlerDialog(false);
            if (updatedAssets.size > 0) {
              await fetchAssets();
              // Scroll to the first updated item
              const firstId = Array.from(updatedAssets)[0];
              setTimeout(() => {
                const itemElement = document.getElementById(`json-pair-${firstId}`);
                if (itemElement) {
                  itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 100);
              // Clear the updated assets set
              setUpdatedAssets(new Set());
            }
          }}
          className="text-text-muted hover:text-text"
        >
          <XCircleIcon className="w-6 h-6" />
        </button>
        </div>

        {/* Navigation Shortcuts */}
        <div className="flex gap-2">
          <button
            onClick={() => document.getElementById('crawler-main-image')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 px-4 py-2 bg-info text-white hover:opacity-90 rounded-lg text-sm font-medium"
          >
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-info text-white">1</span>
            Main Image
          </button>
          {missingQuizOptions.length > 0 && (
            <button
              onClick={() => document.getElementById('crawler-quiz-options')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-fg hover:bg-accent-hover rounded-lg text-sm font-medium"
            >
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-accent text-accent-fg">2</span>
              Quiz Options ({missingQuizOptions.length})
            </button>
          )}
          <button
            onClick={() => document.getElementById('crawler-main-video')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 px-4 py-2 bg-success text-white hover:opacity-90 rounded-lg text-sm font-medium"
          >
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-success text-white">3</span>
            Main Video
          </button>
        </div>
      </div>

      <div className="space-y-8 mt-4">
        {/* Main Image Section */}
        <div id="crawler-main-image">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-info text-white">1</span>
            Main Image
          </h3>
          {crawlerResources.images.length === 0 ? (
            <p className="text-text-muted">No images available.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {crawlerResources.images.map((image, index) => (
                <div key={index} className="relative group cursor-pointer">
                  <div className="aspect-square overflow-hidden rounded-lg relative group">
                    <img 
                      src={image.url}
                      alt={image.name}
                      className={`w-full h-full object-cover transform transition-all duration-200 ${
                        selectionState[getSelectionKey(image, 'image', 'main')]?.isSelected
                          ? 'scale-95 brightness-75'
                          : 'group-hover:scale-105'
                      }`}
                      onClick={() => setFullscreenImage(image)}
                    />
                    {/* Loading Overlay */}
                    {selectionState[getSelectionKey(image, 'image', 'main')]?.isLoading && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-info border-t-transparent"></div>
                      </div>
                    )}
                    {/* Success Overlay */}
                    {selectionState[getSelectionKey(image, 'image', 'main')]?.isSelected && (
                      <div className="absolute inset-0 bg-success bg-opacity-10 flex items-center justify-center z-20">
                        <div className="bg-success bg-opacity-90 rounded-full p-2">
                          <CheckCircleIcon className="w-10 h-10 text-white" />
                        </div>
                      </div>
                    )}
                    {/* Hover Overlay with Button */}
                    <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-10">
                      <SelectionButton
                        resource={image}
                        type="image"
                        target="main"
                        selectionState={selectionState}
                        onSelect={handleSelectCrawlerResource}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-text-muted truncate">{image.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quiz 3 Image Options Section */}
        {missingQuizOptions.length > 0 && (
          <div id="crawler-quiz-options">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-accent text-accent-fg">2</span>
              Quiz 3 Image Options
            </h3>
            <div className="space-y-6">
              {missingQuizOptions.map((option, optionIndex) => (
                <div key={option} className="bg-surface rounded-lg p-4">
                  <h4 className="text-base font-medium text-accent mb-3">Missing Option: {option}</h4>
                  {crawlerResourcesByOption[option]?.images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {crawlerResourcesByOption[option].images.map((image, index) => (
                        <div key={index} className="relative group cursor-pointer">
                                                          <div className="aspect-square overflow-hidden rounded-lg relative group">
                          <img 
                            src={image.url}
                            alt={image.name}
                            className={`w-full h-full object-cover transform transition-all duration-200 ${
                              selectionState[getSelectionKey(image, 'quiz3-image', 'quiz3', option)]?.isSelected
                                ? 'scale-95 brightness-75'
                                : 'group-hover:scale-105'
                            }`}
                            onClick={() => setFullscreenImage(image)}
                          />
                          {/* Loading Overlay */}
                          {selectionState[getSelectionKey(image, 'quiz3-image', 'quiz3', option)]?.isLoading && (
                            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20">
                              <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent"></div>
                            </div>
                          )}
                          {/* Success Overlay */}
                          {selectionState[getSelectionKey(image, 'quiz3-image', 'quiz3', option)]?.isSelected && (
                            <div className="absolute inset-0 bg-accent bg-opacity-10 flex items-center justify-center z-20">
                              <div className="bg-accent bg-opacity-90 rounded-full p-2">
                                <CheckCircleIcon className="w-10 h-10 text-white" />
                              </div>
                            </div>
                          )}
                          {/* Hover Overlay with Button */}
                          <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-10">
                            <SelectionButton
                              resource={image}
                              type="quiz3-image"
                              target="quiz3"
                              optionName={option}
                              selectionState={selectionState}
                              onSelect={handleSelectCrawlerResource}
                            />
                          </div>
                        </div>
                          <p className="mt-2 text-sm text-text-muted truncate">{image.name}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-muted">No images available for {option}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos Section */}
        <div id="crawler-main-video">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-success text-white">3</span>
            Main Video
          </h3>
          {crawlerResources.videos.length === 0 ? (
            <p className="text-text-muted">No videos available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {crawlerResources.videos.map((video, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-video overflow-hidden rounded-lg relative group">
                    <video 
                      src={video.url}
                      className={`w-full h-full object-cover transform transition-all duration-200 ${
                        selectionState[getSelectionKey(video, 'video', 'main')]?.isSelected
                          ? 'scale-95 brightness-75'
                          : 'group-hover:scale-105'
                      }`}
                      controls
                    />
                    {/* Loading Overlay */}
                    {selectionState[getSelectionKey(video, 'video', 'main')]?.isLoading && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-success border-t-transparent"></div>
                      </div>
                    )}
                    {/* Success Overlay */}
                    {selectionState[getSelectionKey(video, 'video', 'main')]?.isSelected && (
                      <div className="absolute inset-0 bg-success bg-opacity-10 flex items-center justify-center z-20">
                        <div className="bg-success bg-opacity-90 rounded-full p-2">
                          <CheckCircleIcon className="w-10 h-10 text-white" />
                        </div>
                      </div>
                    )}
                    {/* Hover Overlay with Button */}
                    <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-10">
                      <SelectionButton
                        resource={video}
                        type="video"
                        target="main"
                        selectionState={selectionState}
                        onSelect={handleSelectCrawlerResource}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-text-muted truncate">{video.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  </motion.div>
  );
}
