"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  ChevronUpIcon
} from "@heroicons/react/24/outline";
import { 
  PhotoIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/solid";
import { config } from "../../lib/config";
import ImageGenerationDialog from "../components/ImageGenerationDialog";
import ProviderSelectionDialog from "../components/ProviderSelectionDialog";
import ImageEditor from "../components/ImageEditor";
import { logger } from "@/app/lib/logger";

import type {
  Asset,
  AssetCategory,
  JSONVoicePair,
  JSONAssetPair,
  AssetGroup,
  SK3QLRContent,
  OverviewStatus,
  MissingResource,
  MissingItem,
  GroupUploadItem,
  CrawlerResource,
  ResourceType,
  ApiResourceType,
  ResourceTarget,
  SelectionState,
} from "./types";
import {
  extractKeyAndOrder,
  organizeJSONAssetPairs,
  getValidOptionsForAvailableImages,
  getEarliestJsonDate,
  formatDate,
  formatFileSize,
  getUploadKey,
  getSelectionKey,
} from "./utils";
import FullscreenViewer from "./components/FullscreenViewer";
import SelectionButton from "./components/SelectionButton";
import JSONPreview from "./components/JSONPreview";
import AssetGroupCard from "./components/AssetGroupCard";
import AIGeneratorDialog from "./components/AIGeneratorDialog";
import UploadAssetsDialog from "./components/UploadAssetsDialog";
import AssetOverviewBar from "./components/AssetOverviewBar";
import AssetSearchFilters from "./components/AssetSearchFilters";
import AssetPreviewModal from "./components/AssetPreviewModal";
import { useAssetActions } from "./useAssetActions";
import { useAssetData } from "./useAssetData";
import { useAssetDerivations } from "./useAssetDerivations";
export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("minimate");
  const [selectedTopic, setSelectedTopic] = useState("animals");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showImageGenerationDialog, setShowImageGenerationDialog] = useState(false);
  const [showProviderSelectionDialog, setShowProviderSelectionDialog] = useState(false);
  const [providerSelectionConfig, setProviderSelectionConfig] = useState<{
    title: string;
    description?: string;
    onSelect: (provider: 'openai' | 'grok' | 'comfyui') => void;
  } | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Sync upload dialog state to prevent main search interference
  useEffect(() => {
    setIsUploadDialogOpen(showUploadDialog);
  }, [showUploadDialog]);

  // Optimized upload search handler - use ref to avoid re-renders
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const handleUploadSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Update state without causing re-render of the input
    setUploadSearchQuery(e.target.value);
  }, []);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [uploadingStates, setUploadingStates] = useState<{ [key: string]: boolean }>({});
  // State for tracking voice generation progress per JSON asset
  const [voiceGeneratingStates, setVoiceGeneratingStates] = useState<{ [key: string]: boolean }>({});
  const [aiGenerating, setAiGenerating] = useState(false);

  // Image editor state
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImage, setEditingImage] = useState<{ asset: Asset; type: 'main' | 'quiz3' } | null>(null);

  // Upload dialog search and filter state
  const [uploadSearchQuery, setUploadSearchQuery] = useState("");
  const [debouncedUploadSearchQuery, setDebouncedUploadSearchQuery] = useState("");
  const [uploadResourceFilter, setUploadResourceFilter] = useState<'all' | 'image' | 'video' | 'quiz3-image' | 'reward'>('all');
  const [uploadSortBy, setUploadSortBy] = useState<'priority' | 'name' | 'count'>('priority');
  const [uploadSortOrder, setUploadSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  // Removed groupSearchQuery state - no longer needed

  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewVideoMode, setPreviewVideoMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'createDate'>('createDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Overview status filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'missing-json' | 'missing-image' | 'missing-videos' | 'missing-voices' | 'missing-rewards' | 'missing-quiz3-images' | 'incomplete'>('all');

  // Calculate missing resources for upload dialog
  const {
    calculateMissingResources,
    baseMissingResources,
    searchIndex,
    calculateOverviewStatus,
    filteredAssets,
    filteredAssetGroups,
    totalPages,
    paginatedAssetGroups,
    filteredMissingResources,
    setFilteredMissingResources,
  } = useAssetDerivations({
    assets,
    assetGroups,
    searchQuery,
    sortBy,
    sortOrder,
    statusFilter,
    currentPage,
    itemsPerPage,
    uploadSearchQuery,
    uploadResourceFilter,
    uploadSortBy,
    uploadSortOrder,
  });

  // Filter options
  // AI Generator state
  const [aiContent, setAiContent] = useState<SK3QLRContent>({
    id: "",
    key: "",
    order: 1,
    intro: { text: "", voice: "" },
    quiz_1: {
      question: { text: "", voice: "" },
      options: ["", "", "", ""],
      answer: { position: 1, voice: "" }
    },
    quiz_2: {
      question: { text: "", voice: "" },
      options: ["", ""],
      answer: { position: 1, voice: "" }
    },
    quiz_3: {
      question: { text: "", voice: "" },
      options: ["", "", "", ""],
      answer: { position: 1, voice: "" }
    },
    lesson: { voice: "" },
    reward: { voice: "" }
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [aiLanguage, setAiLanguage] = useState("vietnamese");
  const [aiProvider, setAiProvider] = useState("grok");
  const [existingOrders, setExistingOrders] = useState<number[]>([]);
  const [previewItems, setPreviewItems] = useState<SK3QLRContent[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // New batch generation state
  const [batchSize, setBatchSize] = useState(1);
  const [subjectsList, setSubjectsList] = useState("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; subject: string } | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);





  // Function to pre-load JSON content for quiz 3 options
  const { fetchAssets } = useAssetData({
    assets,
    searchQuery,
    selectedChannel,
    selectedTopic,
    isUploadDialogOpen,
    setAssets,
    setAssetGroups,
    setLoading,
    setSearching,
  });


  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedChannel, selectedTopic, sortBy, sortOrder]);

  // Client-side filtered assets for immediate search feedback

  const getAssetIcon = (type: string) => {
    // Return a simple text representation for now
    return () => <span className="text-2xl">{type === 'voice' ? '🎵' : type === 'image' ? '🖼️' : type === 'video' ? '🎥' : '📄'}</span>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return CheckCircleIcon;
      case 'missing': return XCircleIcon;
      case 'processing': return ExclamationTriangleIcon;
      default: return ExclamationTriangleIcon;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-success';
      case 'missing': return 'text-danger';
      case 'processing': return 'text-warning';
      default: return 'text-text-muted';
    }
  };




  const {
    handleAssetSelect,
    handleSelectAll,
    handleDeselectAll,
    handleDeleteSelected,
    handleUploadAssets,
    handleUploadSpecificAsset,
    updateGroupAfterUpload,
    checkDuplicateSubject,
    checkExistingOrders,
    handleSubjectChange,
    parseSubjectsList,
    getExistingOrdersForSubjects,
    generateAIContent,
    generateBatchAIContent,
    removePreviewItem,
    clearAllPreviews,
    approveGeneratedContent,
    handlePreviewAsset,
    handleClosePreview,
    handleGenerateVoice,
    handleGenerateReward,
    handleImageGenerated,
    handleGenerateTopicImage,
    showProviderSelectionForMainImage,
    handleGenerateMainImage,
    showProviderSelectionForMissingImages,
    handleEditImage,
    handleImageEditorSave,
    handleImageEditorClose,
    handleFetchCrawlerResources,
    handleSelectCrawlerResource,
    imageGeneratingStates,
    showCrawlerDialog,
    setShowCrawlerDialog,
    selectedJsonAsset,
    setSelectedJsonAsset,
    crawlerResources,
    crawlerResourcesByOption,
    selectionState,
    fullscreenImage,
    setFullscreenImage,
    showQuizOptionMenu,
    setShowQuizOptionMenu,
    missingQuizOptions,
    updatedAssets,
    setUpdatedAssets,
  } = useAssetActions({
    assets,
    assetGroups,
    filteredAssets,
    selectedChannel,
    selectedTopic,
    selectedAssets,
    editingImage,
    aiPrompt,
    aiDescription,
    aiLanguage,
    aiProvider,
    existingOrders,
    previewItems,
    batchSize,
    subjectsList,
    batchGenerating,
    isBatchMode,
    fetchAssets,
    setAssets,
    setAssetGroups,
    setSelectedAssets,
    setEditingImage,
    setAiPrompt,
    setAiGenerating,
    setBatchGenerating,
    setBatchProgress,
    setExistingOrders,
    setPreviewItems,
    setPreviewAsset,
    setPreviewVideoMode,
    setProviderSelectionConfig,
    setShowAIGenerator,
    setShowImageEditor,
    setShowImageGenerationDialog,
    setShowPreview,
    setShowProviderSelectionDialog,
    setShowSuccessDialog,
    setSuccessMessage,
    setToast,
    setUploadingStates,
    setVoiceGeneratingStates,
  });

  const getAssetPreviewContent = (asset: Asset) => {
    const previewUrl = `/api/assets/preview?path=${encodeURIComponent(asset.path)}&channel=${selectedChannel}&topic=${selectedTopic}`;
    
    switch (asset.type) {
      case 'image':
        return (
          <div className="text-center">
            <img 
              src={previewUrl}
              alt={asset.name}
              className="max-w-full max-h-96 object-contain rounded-lg"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2Ij5JbWFnZSBQcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K';
              }}
            />
          </div>
        );
      case 'video':
        return (
          <video 
            controls 
            autoPlay
            className="max-w-full max-h-96 rounded-lg"
            src={previewUrl}
          >
            Your browser does not support the video tag.
          </video>
        );
      case 'voice':
        return (
          <div className="text-center space-y-4">
            <div className="text-6xl">🎵</div>
            <audio controls autoPlay className="w-full">
              <source src={previewUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            <p className="text-text-muted">{asset.name}</p>
          </div>
        );
      case 'json':
        return (
          <JSONPreview
            asset={asset}
            initialViewMode={previewVideoMode ? 'video' : 'json'}
            selectedChannel={selectedChannel}
            selectedTopic={selectedTopic}
            setToast={setToast}
            setAssetGroups={setAssetGroups}
          />
        );
      default:
        return <div className="text-center text-text-muted">Preview not available</div>;
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text p-8">
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: var(--color-accent);
          cursor: pointer;
          border: 2px solid var(--color-surface);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: var(--color-accent);
          cursor: pointer;
          border: 2px solid var(--color-surface);
        }
        
        .slider::-ms-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: var(--color-accent);
          cursor: pointer;
          border: 2px solid var(--color-surface);
        }
      `}</style>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className="text-4xl font-bold text-accent">
            Assets Management
          </h1>
          <p className="text-text-muted mt-2">Manage your SK3QLR video assets and generate content</p>
        </div>
        
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover px-4 py-2 rounded-lg transition-colors"
            onClick={() => setShowAIGenerator(true)}
          >
            <span className="text-xl">✨</span>
            <span>AI Generator</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-surface-raised text-text border border-border hover:border-border-strong px-4 py-2 rounded-lg transition-colors"
            onClick={() => setShowImageGenerationDialog(true)}
          >
            <PhotoIcon className="w-5 h-5" />
            <span>Generate Image</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-surface-raised text-text border border-border hover:border-border-strong px-4 py-2 rounded-lg transition-colors"
            onClick={() => setShowUploadDialog(true)}
          >
            <PlusIcon className="w-5 h-5" />
            <span>Upload Assets</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Overview Status Bar */}
      <AssetOverviewBar
        calculateOverviewStatus={calculateOverviewStatus}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* Search and Filters */}
      <AssetSearchFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        selectedChannel={selectedChannel}
        setSelectedChannel={setSelectedChannel}
        selectedTopic={selectedTopic}
        setSelectedTopic={setSelectedTopic}
        selectedAssets={selectedAssets}
        handleDeleteSelected={handleDeleteSelected}
        handleDeselectAll={handleDeselectAll}
      />

      {/* Assets Display */}
      <motion.div layout className="space-y-6">
        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-text-muted">
          <div>
            Showing {paginatedAssetGroups.length} of {filteredAssetGroups.length} groups
            {statusFilter !== 'all' && (
              <span className="ml-2 text-accent">
                (filtered by {statusFilter.replace('-', ' ')})
              </span>
            )}
          </div>
          <div>
            Page {currentPage} of {Math.ceil(filteredAssetGroups.length / itemsPerPage)}
          </div>
        </div>

        {searching && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-text-muted">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
              <span>Searching...</span>
            </div>
          </div>
        )}
          {paginatedAssetGroups.map((group) => (
            <AssetGroupCard
              key={`${group.key}-${sortBy}-${sortOrder}`}
              group={group}
              sortBy={sortBy}
              sortOrder={sortOrder}
              voiceGeneratingStates={voiceGeneratingStates}
              imageGeneratingStates={imageGeneratingStates}
              handlePreviewAsset={handlePreviewAsset}
              handleEditImage={handleEditImage}
              showProviderSelectionForMissingImages={showProviderSelectionForMissingImages}
              showProviderSelectionForMainImage={showProviderSelectionForMainImage}
              handleGenerateVoice={handleGenerateVoice}
              handleGenerateReward={handleGenerateReward}
              handleFetchCrawlerResources={handleFetchCrawlerResources}
              setPreviewAsset={setPreviewAsset}
              setShowPreview={setShowPreview}
            />
          ))}
        </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center items-center gap-2 mt-8"
        >
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-surface-raised hover:bg-surface disabled:bg-surface disabled:text-text-muted rounded-lg transition-colors"
          >
            ← Previous
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface-raised hover:bg-surface text-text-muted'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-surface-raised hover:bg-surface disabled:bg-surface disabled:text-text-muted rounded-lg transition-colors"
          >
            Next →
          </button>
          
          <span className="text-sm text-text-muted ml-4">
            Page {currentPage} of {totalPages} ({filteredAssetGroups.length} total)
          </span>
        </motion.div>
      )}



      {/* AI Generator Dialog */}
      <AnimatePresence>
        {showAIGenerator && (
          <AIGeneratorDialog
            selectedChannel={selectedChannel}
            selectedTopic={selectedTopic}
            aiPrompt={aiPrompt}
            aiDescription={aiDescription}
            aiProvider={aiProvider}
            aiLanguage={aiLanguage}
            batchSize={batchSize}
            subjectsList={subjectsList}
            previewItems={previewItems}
            existingOrders={existingOrders}
            isBatchMode={isBatchMode}
            aiGenerating={aiGenerating}
            batchGenerating={batchGenerating}
            batchProgress={batchProgress}
            setAiPrompt={setAiPrompt}
            setAiDescription={setAiDescription}
            setAiLanguage={setAiLanguage}
            setAiProvider={setAiProvider}
            setBatchSize={setBatchSize}
            setIsBatchMode={setIsBatchMode}
            setPreviewItems={setPreviewItems}
            setSubjectsList={setSubjectsList}
            setShowAIGenerator={setShowAIGenerator}
            generateAIContent={generateAIContent}
            generateBatchAIContent={generateBatchAIContent}
            approveGeneratedContent={approveGeneratedContent}
            clearAllPreviews={clearAllPreviews}
            removePreviewItem={removePreviewItem}
            handleSubjectChange={handleSubjectChange}
            parseSubjectsList={parseSubjectsList}
            getExistingOrdersForSubjects={getExistingOrdersForSubjects}
          />
        )}
      </AnimatePresence>

      {/* Asset Preview Modal */}
      <AnimatePresence>
        {showPreview && previewAsset && (
          <AssetPreviewModal
            previewAsset={previewAsset}
            handleClosePreview={handleClosePreview}
            getAssetPreviewContent={getAssetPreviewContent}
            fetchAssets={fetchAssets}
          />
        )}
      </AnimatePresence>

      {/* Success Dialog */}
      <AnimatePresence>
        {showSuccessDialog && (
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
              className="bg-surface rounded-lg p-6 w-full max-w-md"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-success mb-2">Success!</h3>
                <p className="text-text-muted mb-6">{successMessage}</p>
                <button
                  onClick={() => setShowSuccessDialog(false)}
                  className="w-full bg-accent text-accent-fg hover:bg-accent-hover px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Assets Dialog */}
      <AnimatePresence>
        {showUploadDialog && (
          <UploadAssetsDialog
            baseMissingResources={baseMissingResources}
            filteredMissingResources={filteredMissingResources}
            uploadSearchQuery={uploadSearchQuery}
            uploadResourceFilter={uploadResourceFilter}
            uploadSortBy={uploadSortBy}
            uploadSortOrder={uploadSortOrder}
            uploadingStates={uploadingStates}
            setShowUploadDialog={setShowUploadDialog}
            setUploadSearchQuery={setUploadSearchQuery}
            setUploadResourceFilter={setUploadResourceFilter}
            setUploadSortBy={setUploadSortBy}
            setUploadSortOrder={setUploadSortOrder}
            handleUploadSpecificAsset={handleUploadSpecificAsset}
          />
        )}
      </AnimatePresence>

      {/* Image Generation Dialog */}
      <ImageGenerationDialog
        isOpen={showImageGenerationDialog}
        onClose={() => setShowImageGenerationDialog(false)}
        onImageGenerated={handleImageGenerated}
        category="image"
        channel={selectedChannel}
        topic={selectedTopic}
      />

      {/* Provider Selection Dialog */}
      {providerSelectionConfig && (
        <ProviderSelectionDialog
          isOpen={showProviderSelectionDialog}
          onClose={() => setShowProviderSelectionDialog(false)}
          onProviderSelect={providerSelectionConfig.onSelect}
          title={providerSelectionConfig.title}
          description={providerSelectionConfig.description}
        />
      )}

      {/* Image Editor */}
      {editingImage && (
        <ImageEditor
          isOpen={showImageEditor}
          onClose={handleImageEditorClose}
          imageUrl={`/api/assets/preview?path=${encodeURIComponent(editingImage.asset.path)}&channel=${selectedChannel}&topic=${selectedTopic}`}
          imageName={editingImage.asset.name}
          onSave={handleImageEditorSave}
          defaultSize={512}
        />
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg max-w-md ${
              toast.type === 'success' 
                ? 'bg-success text-white' 
                : toast.type === 'error' 
                ? 'bg-danger text-white' 
                : 'bg-info text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Viewer */}
      <AnimatePresence>
        {fullscreenImage && (
          <FullscreenViewer
            image={fullscreenImage}
            onClose={() => setFullscreenImage(null)}
            showQuizMenu={showQuizOptionMenu}
            onToggleQuizMenu={() => setShowQuizOptionMenu(!showQuizOptionMenu)}
            missingQuizOptions={missingQuizOptions}
            onSelectResource={handleSelectCrawlerResource}
          />
        )}
      </AnimatePresence>

      {/* Crawler Dialog */}
      <AnimatePresence>
        {showCrawlerDialog && (
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
        )}
      </AnimatePresence>
    </div>
  );
} 