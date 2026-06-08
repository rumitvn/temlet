import { motion } from "framer-motion";
import { PencilIcon } from "@heroicons/react/24/solid";
import type { Dispatch, SetStateAction } from "react";
import {
  getRenderStatusDisplay,
  formatDate,
  formatFileSize,
  getEarliestJsonDate,
} from "../utils";
import type { Asset, AssetGroup, JSONAssetPair } from "../types";

interface AssetGroupCardProps {
  group: AssetGroup;
  sortBy: string;
  sortOrder: string;
  voiceGeneratingStates: { [key: string]: boolean };
  imageGeneratingStates: { [key: string]: boolean };
  handlePreviewAsset: (asset: Asset, videoMode?: boolean) => void;
  handleEditImage: (asset: Asset, type: "main" | "quiz3") => void;
  showProviderSelectionForMissingImages: (pair: JSONAssetPair) => void;
  showProviderSelectionForMainImage: (jsonAsset: Asset) => void;
  handleGenerateVoice: (jsonAsset: Asset) => void;
  handleGenerateReward: (jsonAsset: Asset) => void;
  handleFetchCrawlerResources: (jsonAsset: Asset | null) => void;
  setPreviewAsset: Dispatch<SetStateAction<Asset | null>>;
  setShowPreview: Dispatch<SetStateAction<boolean>>;
}

export default function AssetGroupCard({
  group,
  sortBy,
  sortOrder,
  voiceGeneratingStates,
  imageGeneratingStates,
  handlePreviewAsset,
  handleEditImage,
  showProviderSelectionForMissingImages,
  showProviderSelectionForMainImage,
  handleGenerateVoice,
  handleGenerateReward,
  handleFetchCrawlerResources,
  setPreviewAsset,
  setShowPreview,
}: AssetGroupCardProps) {
  const renderStatus = getRenderStatusDisplay(group.renderStatus);
  const originalRenderStatus = group.renderStatus;
  return (
    <motion.div
      key={`${group.key}-${sortBy}-${sortOrder}`}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-2xl font-bold text-accent">{group.name}</h3>
          <div className="flex gap-2 text-sm text-text-muted">
            <span>📄 {group.assets.jsonAssetPairs.length} JSON-Asset Pairs</span>
            <span>🏆 {group.assets.rewards.length} Rewards</span>
            <span className="text-info">
              📅 {formatDate(getEarliestJsonDate(group))}
            </span>
          </div>
        </div>
        
        {/* Render Status Badge */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            renderStatus.isComplete 
              ? 'bg-success-bg text-success border border-success' 
              : 'bg-surface-raised text-text-muted border border-border'
          }`}>
            {renderStatus.isComplete ? '✅ Ready to Render' : `${renderStatus.completionRate}% Complete`}
          </div>
        </div>
      </div>
      
      {/* Render Status Details */}
      <div className="mb-4 p-3 bg-surface-raised rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-muted">Render Status:</span>
          <span className={`text-sm font-bold ${renderStatus.statusColor}`}>
            {renderStatus.completionRate}% Complete
          </span>
        </div>
        
        {/* JSON Requirements */}
        {renderStatus.jsonCount > 0 && (
          <div className="mb-3 p-2 bg-surface rounded">
            <div className="text-xs font-medium text-accent mb-1">
              📄 JSON Files: {renderStatus.jsonCount} found
            </div>
            <div className="text-xs text-text-muted">
              Orders: {originalRenderStatus.jsonOrders.sort((a: number, b: number) => a - b).join(', ')}
            </div>
          </div>
        )}
        
        {/* Image Requirements */}
        <div className="mb-3 p-2 bg-surface rounded">
          <div className="text-xs font-medium text-info mb-1">
            🖼️ Images: {renderStatus.imageProgress}
          </div>
          <div className="w-full bg-surface-raised rounded-full h-2 mb-1">
            <div 
              className={`h-2 rounded-full ${
                originalRenderStatus.availableImages >= originalRenderStatus.requiredImages 
                  ? 'bg-success' 
                  : 'bg-danger'
              }`}
              style={{ 
                width: `${Math.min(100, (originalRenderStatus.availableImages / originalRenderStatus.requiredImages) * 100)}%` 
              }}
            ></div>
          </div>
          <div className="text-xs text-text-muted">
            Required: {originalRenderStatus.requiredImages} images (1 per JSON with matching order)
            {renderStatus.missingImageOrders.length > 0 && (
              <span className="text-danger ml-2">Missing orders: {renderStatus.missingImageOrders.join(', ')}</span>
            )}
          </div>
        </div>
        
        {/* Video Requirements */}
        <div className="mb-3 p-2 bg-surface rounded">
          <div className="text-xs font-medium text-info mb-1">
            🎥 Videos: {renderStatus.videoProgress}
          </div>
          <div className="w-full bg-surface-raised rounded-full h-2 mb-1">
            <div 
              className={`h-2 rounded-full ${
                originalRenderStatus.availableVideos >= originalRenderStatus.requiredVideos 
                  ? 'bg-success' 
                  : 'bg-danger'
              }`}
              style={{ 
                width: `${Math.min(100, (originalRenderStatus.availableVideos / originalRenderStatus.requiredVideos) * 100)}%` 
              }}
            ></div>
          </div>
          <div className="text-xs text-text-muted">
            Required: {originalRenderStatus.requiredVideos} videos (1 per JSON with matching order)
            {renderStatus.missingVideoOrders.length > 0 && (
              <span className="text-danger ml-2">Missing orders: {renderStatus.missingVideoOrders.join(', ')}</span>
            )}
          </div>
        </div>
        
        {/* Voice Requirements */}
        <div className="mb-3 p-2 bg-surface rounded">
          <div className="text-xs font-medium text-warning mb-1">
            🎵 Voice Files: {renderStatus.voiceProgress}
          </div>
          <div className="w-full bg-surface-raised rounded-full h-2 mb-1">
            <div 
              className={`h-2 rounded-full ${
                originalRenderStatus.availableVoices >= originalRenderStatus.requiredVoices 
                  ? 'bg-success' 
                  : 'bg-warning'
              }`}
              style={{ 
                width: `${Math.min(100, (originalRenderStatus.availableVoices / originalRenderStatus.requiredVoices) * 100)}%` 
              }}
            ></div>
          </div>
          <div className="text-xs text-text-muted">
            Required: {originalRenderStatus.requiredVoices} voices ({renderStatus.jsonCount} JSONs × 9 voices each)
            {renderStatus.missingVoices > 0 && (
              <span className="text-danger ml-2">Missing: {renderStatus.missingVoices}</span>
            )}
          </div>
        </div>
        
        {/* Reward Requirements */}
        <div className="mb-3 p-2 bg-surface rounded">
          <div className="text-xs font-medium text-warning mb-1">
            🏆 Reward Videos: {renderStatus.rewardProgress}
          </div>
          <div className="w-full bg-surface-raised rounded-full h-2 mb-1">
            <div 
              className={`h-2 rounded-full ${
                originalRenderStatus.availableRewards >= originalRenderStatus.requiredRewards 
                  ? 'bg-success' 
                  : 'bg-warning'
              }`}
              style={{ 
                width: `${Math.min(100, (originalRenderStatus.availableRewards / originalRenderStatus.requiredRewards) * 100)}%` 
              }}
            ></div>
          </div>
          <div className="text-xs text-text-muted">
            Required: {originalRenderStatus.requiredRewards} rewards (1 per JSON)
            {renderStatus.missingRewards > 0 && (
              <span className="text-danger ml-2">Missing: {renderStatus.missingRewards}</span>
            )}
          </div>
        </div>
        
        {/* Quiz 3 Image Options Requirements */}
        <div className="mb-3 p-2 bg-surface rounded">
          <div className="text-xs font-medium text-accent mb-1">
            🖼️ Quiz 3 Image Options: {renderStatus.quiz3ImageProgress}
          </div>
          <div className="w-full bg-surface-raised rounded-full h-2 mb-1">
            <div 
              className={`h-2 rounded-full ${
                originalRenderStatus.availableQuiz3Images >= originalRenderStatus.requiredQuiz3Images 
                  ? 'bg-success' 
                  : 'bg-accent'
              }`}
              style={{ 
                width: `${Math.min(100, (originalRenderStatus.availableQuiz3Images / originalRenderStatus.requiredQuiz3Images) * 100)}%` 
              }}
            ></div>
          </div>
          <div className="text-xs text-text-muted">
            Required: {originalRenderStatus.requiredQuiz3Images} images ({renderStatus.jsonCount} JSONs × 4 images each)
            {renderStatus.missingQuiz3Images > 0 && (
              <span className="text-danger ml-2">Missing: {renderStatus.missingQuiz3Images}</span>
            )}
          </div>
        </div>
        
        {/* Asset Status Tags */}
        <div className="flex flex-wrap gap-2">
          {renderStatus.statuses.map((status, index) => (
            <span key={index} className="text-xs bg-surface-raised text-text-muted px-2 py-1 rounded">
              {status}
            </span>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        
        {/* JSONs with Voice and Reward Status */}
        {group.assets.jsonAssetPairs.map((pair, index) => (
          <div 
            key={`${pair.json.id}-${index}`}
            id={`json-pair-${pair.json.id}`}
            className="bg-surface-raised rounded-lg p-6 border border-border"
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">📄</span>
              <div className="flex-1">
                <span className="text-lg font-semibold text-success">JSON {pair.json.order || index + 1}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pair.hasAllVoices 
                      ? 'bg-success-bg text-success border border-success' 
                      : 'bg-warning-bg text-warning border border-warning'
                  }`}>
                    {pair.hasAllVoices ? '✅ All Voices' : `🎵 ${pair.voices.length}/9 Voices`}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pair.hasReward 
                      ? 'bg-success-bg text-success border border-success' 
                      : 'bg-warning-bg text-warning border border-warning'
                  }`}>
                    {pair.hasReward ? '🏆 Has Reward' : '🏆 No Reward'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pair.quiz3ImageOptions.options.length === 0
                      ? 'bg-surface-sunken text-text-muted border border-border'
                      : pair.quiz3ImageOptions.hasAllImages 
                        ? 'bg-success-bg text-success border border-success' 
                        : 'bg-danger-bg text-danger border border-danger'
                  }`}>
                    {pair.quiz3ImageOptions.options.length === 0 
                      ? '🖼️ No Options'
                      : pair.quiz3ImageOptions.hasAllImages 
                        ? '🖼️ All Images' 
                        : `🖼️ ${pair.quiz3ImageOptions.availableImages.length}/${pair.quiz3ImageOptions.options.length} Images`
                    }
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-base text-text-muted truncate mb-3 font-medium">{pair.json.name}</p>
            <p className="text-base text-text-muted mb-4">{formatFileSize(pair.json.size || 0)}</p>
            
            {/* Voice Status Details */}
            <div className="mb-4 p-3 bg-surface rounded-lg">
              <div className="text-sm font-medium text-text-muted mb-2">Voice Files:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`flex items-center gap-1 ${pair.voiceTypes.intro ? 'text-success' : 'text-danger'}`}>
                  <span>{pair.voiceTypes.intro ? '✅' : '❌'}</span>
                  <span>Intro</span>
                </div>
                <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz1_question ? 'text-success' : 'text-danger'}`}>
                  <span>{pair.voiceTypes.quiz1_question ? '✅' : '❌'}</span>
                  <span>Quiz 1 Q</span>
                </div>
                <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz1_answer ? 'text-success' : 'text-danger'}`}>
                  <span>{pair.voiceTypes.quiz1_answer ? '✅' : '❌'}</span>
                  <span>Quiz 1 A</span>
                </div>
                <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz2_question ? 'text-success' : 'text-danger'}`}>
                  <span>{pair.voiceTypes.quiz2_question ? '✅' : '❌'}</span>
                  <span>Quiz 2 Q</span>
                </div>
                <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz2_answer ? 'text-success' : 'text-danger'}`}>
                  <span>{pair.voiceTypes.quiz2_answer ? '✅' : '❌'}</span>
                  <span>Quiz 2 A</span>
                </div>
                <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz3_question ? 'text-success' : 'text-danger'}`}>
                  <span>{pair.voiceTypes.quiz3_question ? '✅' : '❌'}</span>
                  <span>Quiz 3 Q</span>
                </div>
                <div className={`flex items-center gap-1 ${pair.voiceTypes.quiz3_answer ? 'text-success' : 'text-danger'}`}>
                  <span>{pair.voiceTypes.quiz3_answer ? '✅' : '❌'}</span>
                  <span>Quiz 3 A</span>
                </div>
                <div className={`flex items-center gap-1 ${pair.voiceTypes.lesson ? 'text-success' : 'text-danger'}`}>
                  <span>{pair.voiceTypes.lesson ? '✅' : '❌'}</span>
                  <span>Lesson</span>
                </div>
                <div className={`flex items-center gap-1 ${pair.voiceTypes.reward ? 'text-success' : 'text-danger'}`}>
                  <span>{pair.voiceTypes.reward ? '✅' : '❌'}</span>
                  <span>Reward</span>
                </div>
              </div>
            </div>
            
            {/* Reward Status */}
            <div className="mb-4 p-3 bg-surface rounded-lg">
              <div className="text-sm font-medium text-text-muted mb-2">Reward Video:</div>
              <div className="flex items-center gap-2">
                <span className={`text-lg ${pair.hasReward ? 'text-success' : 'text-danger'}`}>
                  {pair.hasReward ? '✅' : '❌'}
                </span>
                <span className="text-sm text-text-muted">
                  {pair.hasReward 
                    ? `Reward video available (${pair.reward?.name || 'Unknown'})`
                    : 'No reward video found'
                  }
                </span>
              </div>
            </div>
            
            {/* Quiz 3 Image Options Status */}
            <div className="mb-4 p-3 bg-surface rounded-lg">
              <div className="text-sm font-medium text-text-muted mb-2">Quiz 3 Image Options:</div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-lg ${pair.quiz3ImageOptions.hasAllImages ? 'text-success' : 'text-danger'}`}>
                  {pair.quiz3ImageOptions.hasAllImages ? '✅' : '❌'}
                </span>
                <span className="text-sm text-text-muted">
                  {pair.quiz3ImageOptions.options.length === 0 
                    ? 'No quiz 3 options found'
                    : pair.quiz3ImageOptions.hasAllImages 
                      ? `${pair.quiz3ImageOptions.availableImages.length}/${pair.quiz3ImageOptions.options.length} Images Available`
                      : `${pair.quiz3ImageOptions.availableImages.length}/${pair.quiz3ImageOptions.options.length} Images Available`
                  }
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-surface-raised rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full ${
                    pair.quiz3ImageOptions.hasAllImages 
                      ? 'bg-success' 
                      : 'bg-danger'
                  }`}
                  style={{ 
                    width: `${pair.quiz3ImageOptions.completionRate}%` 
                  }}
                ></div>
              </div>
              
              {/* Options list */}
              <div className="text-xs text-text-muted mb-2">
                {pair.quiz3ImageOptions.options.length === 0 
                  ? 'No quiz 3 options found in JSON'
                  : `Required: ${pair.quiz3ImageOptions.options.length} images for quiz 3 options`
                }
                {pair.quiz3ImageOptions.missingImages.length > 0 && (
                  <span className="text-danger ml-2">Missing: {pair.quiz3ImageOptions.missingImages.join(', ')}</span>
                )}
              </div>
              
              {/* Individual option status */}
              <div className="grid grid-cols-2 gap-1 text-xs">
                {pair.quiz3ImageOptions.options.map((option, idx) => {
                  const isAvailable = pair.quiz3ImageOptions.availableImages.includes(option);
                  const matchingImage = group.assets.images.find(img => 
                    img.type === 'image' && 
                    img.path.includes('options') && 
                    img.name.replace(/\.(jpg|jpeg|png|gif|bmp)$/i, '').toLowerCase() === option.toLowerCase()
                  );
                  
                  return (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between ${
                        isAvailable 
                          ? 'text-success' 
                          : 'text-danger'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span>
                          {isAvailable ? '✅' : '❌'}
                        </span>
                        <span className="truncate">{option}</span>
                      </div>
                      {isAvailable && matchingImage && (
                        <button
                          onClick={() => handleEditImage(matchingImage, 'quiz3')}
                          className="flex items-center gap-1 text-xs text-info hover:text-info bg-info-bg/30 hover:bg-surface/50 rounded px-1 py-0.5 transition-colors"
                        >
                          <PencilIcon className="w-2 h-2" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Generate missing images button */}
              {pair.quiz3ImageOptions.missingImages.length > 0 && (
                <button
                  onClick={() => showProviderSelectionForMissingImages(pair)}
                  disabled={imageGeneratingStates[`${pair.json.key}_${pair.json.order}`]}
                  className="w-full mt-2 text-sm text-white bg-info hover:opacity-90 disabled:bg-surface-raised disabled:text-text-muted rounded-lg px-3 py-2 text-center transition-colors"
                >
                  {imageGeneratingStates[`${pair.json.key}_${pair.json.order}`] ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Generating {pair.quiz3ImageOptions.missingImages.length} missing images...
                    </div>
                  ) : (
                    `Generate Missing Images (${pair.quiz3ImageOptions.missingImages.length})`
                  )}
                </button>
              )}
            </div>
            
            {/* Image Status */}
            <div className="mb-4 p-3 bg-surface rounded-lg">
              <div className="text-sm font-medium text-text-muted mb-2">Main Image:</div>
              {(() => {
                const matchingImage = group.assets.images.find(img => img.order === pair.json.order);
                return matchingImage ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg text-success">✅</span>
                      <span className="text-sm text-text-muted">
                        Image available ({matchingImage.name})
                      </span>
                    </div>
                    <button
                      onClick={() => handleEditImage(matchingImage, 'main')}
                      className="flex items-center gap-1 text-xs text-info hover:text-info bg-info-bg/30 hover:bg-surface/50 rounded px-2 py-1 transition-colors"
                    >
                      <PencilIcon className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg text-danger">❌</span>
                      <span className="text-sm text-text-muted">
                        No image found for order {pair.json.order}
                      </span>
                    </div>
                    <button
                      onClick={() => showProviderSelectionForMainImage(pair.json)}
                      disabled={imageGeneratingStates[`${pair.json.key}_${pair.json.order}`]}
                      className="text-sm text-white bg-info hover:opacity-90 disabled:bg-surface-raised disabled:text-text-muted rounded px-3 py-1 transition-colors"
                    >
                      {imageGeneratingStates[`${pair.json.key}_${pair.json.order}`] ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          Generating...
                        </div>
                      ) : (
                        'Generate Image'
                      )}
                    </button>
                  </div>
                );
              })()}
            </div>
            
            {/* Video Status */}
            <div className="mb-4 p-3 bg-surface rounded-lg">
              <div className="text-sm font-medium text-text-muted mb-2">Main Video:</div>
              {(() => {
                const matchingVideo = group.assets.videos.find(vid => vid.order === pair.json.order);
                return matchingVideo ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-success">✅</span>
                    <span className="text-sm text-text-muted">
                      Video available ({matchingVideo.name})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-danger">❌</span>
                    <span className="text-sm text-text-muted">
                      No video found for order {pair.json.order}
                    </span>
                  </div>
                );
              })()}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePreviewAsset(pair.json)}
                className="flex-1 text-base text-text-muted bg-surface rounded-lg px-4 py-2 text-center hover:bg-surface transition-colors"
              >
                View JSON
              </button>
              <button
                onClick={() => handlePreviewAsset(pair.json, true)}
                className="flex-1 text-base text-accent bg-accent-muted rounded-lg px-4 py-2 text-center hover:bg-accent-hover transition-colors"
              >
                🎬 Preview Video
              </button>
              {!pair.hasAllVoices && (
                <button
                  onClick={() => handleGenerateVoice(pair.json)}
                  disabled={voiceGeneratingStates[`${pair.json.key}_${pair.json.order}`]}
                  className="flex-1 text-base text-white bg-warning hover:opacity-90 disabled:bg-surface-raised disabled:text-text-muted rounded-lg px-4 py-2 text-center transition-colors"
                >
                  {voiceGeneratingStates[`${pair.json.key}_${pair.json.order}`] ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </div>
                  ) : (
                    'Generate Voice'
                  )}
                </button>
              )}
                                        <button
                onClick={() => handleFetchCrawlerResources(pair.json)}
                className="flex-1 text-base text-white bg-info hover:opacity-90 rounded-lg px-4 py-2 text-center transition-colors"
              >
                🖼️ Use Crawled Media
              </button>
              {!pair.hasReward && (
                <button
                  onClick={() => handleGenerateReward(pair.json)}
                  className="flex-1 text-base text-white bg-warning hover:opacity-90 rounded-lg px-4 py-2 text-center transition-colors"
                >
                  Generate Reward
                </button>
              )}
            </div>
          </div>
        ))}
        
        {/* Rewards */}
        {group.assets.rewards.map((reward, index) => (
          <div 
            key={`${reward.id}-${index}`} 
            className="bg-surface-raised rounded-lg p-6 cursor-pointer hover:bg-surface transition-colors border border-border hover:border-accent"
            onClick={() => handlePreviewAsset(reward)}
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">🏆</span>
              <span className="text-lg font-semibold text-warning">Reward {index + 1}</span>
            </div>
            <p className="text-base text-text-muted truncate mb-3 font-medium">{reward.name}</p>
            <p className="text-base text-text-muted mb-4">{formatFileSize(reward.size || 0)}</p>
            <div className="text-base text-text-muted bg-surface rounded-lg px-4 py-2 text-center hover:bg-surface transition-colors">Click to play</div>
          </div>
        ))}
      </div>
      
      {/* Orphaned Voice files summary (voices not associated with any JSON) */}
      {(() => {
        const orphanedVoices = group.assets.voices.filter(voice => {
          // Check if this voice belongs to any JSON file
          return !group.assets.jsonAssetPairs.some(pair => 
            pair.voices.some(v => v.id === voice.id)
          );
        });
        
        return orphanedVoices.length > 0 ? (
          <div className="mt-6 bg-surface-raised rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎵</span>
                <span className="text-xl font-semibold text-warning">Orphaned Voice Files ({orphanedVoices.length})</span>
              </div>
              <button
                onClick={() => {
                  setPreviewAsset(orphanedVoices[0]);
                  setShowPreview(true);
                }}
                className="text-sm bg-warning text-white hover:opacity-90 px-4 py-2 rounded-lg transition-colors"
              >
                Preview Sample
              </button>
            </div>
            <div className="text-base text-text-muted mb-3">
              {orphanedVoices.length} voice files not associated with any JSON file
            </div>
            <div className="text-sm text-text-muted mb-4">
              These voices may need to be manually organized or deleted
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {orphanedVoices.slice(0, 12).map((voice, index) => (
                <div 
                  key={`${voice.id}-${index}`} 
                  className="text-sm text-text-muted truncate cursor-pointer hover:text-warning transition-colors p-2 bg-surface rounded hover:bg-surface"
                  onClick={() => handlePreviewAsset(voice)}
                  title={voice.name}
                >
                  {voice.name}
                </div>
              ))}
              {orphanedVoices.length > 12 && (
                <div className="text-sm text-text-muted p-2 bg-surface rounded">
                  +{orphanedVoices.length - 12} more...
                </div>
              )}
            </div>
          </div>
        ) : null;
      })()}
    </motion.div>
  );
}
