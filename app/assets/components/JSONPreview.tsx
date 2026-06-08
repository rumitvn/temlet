import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { config } from "../../../lib/config";
import { logger } from "@/app/lib/logger";
import type { Asset, AssetGroup, Toast } from "../types";

interface JSONPreviewProps {
  asset: Asset;
  initialViewMode?: "json" | "video";
  selectedChannel: string;
  selectedTopic: string;
  setToast: Dispatch<SetStateAction<Toast | null>>;
  setAssetGroups: Dispatch<SetStateAction<AssetGroup[]>>;
}

export default function JSONPreview({
  asset,
  initialViewMode = "json",
  selectedChannel,
  selectedTopic,
  setToast,
  setAssetGroups,
}: JSONPreviewProps) {
  const [jsonContent, setJsonContent] = useState<string>('Loading...');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'json' | 'video'>(initialViewMode);
  const [parsedJson, setParsedJson] = useState<any>(null);

  useEffect(() => {
    const loadJSON = async () => {
      try {
        // Add cache-busting parameter to ensure fresh content
        const timestamp = Date.now();
        const response = await fetch(`/api/assets/preview?path=${encodeURIComponent(asset.path)}&channel=${selectedChannel}&topic=${selectedTopic}&t=${timestamp}`);
        if (response.ok) {
          const content = await response.text();
          const parsed = JSON.parse(content);
          const formattedContent = JSON.stringify(parsed, null, 2);
          setJsonContent(formattedContent);
          setEditContent(formattedContent);
          setParsedJson(parsed);
        } else {
          setJsonContent('Failed to load JSON content');
        }
      } catch (error) {
        setJsonContent('Error loading JSON content');
      } finally {
        setLoading(false);
      }
    };

    loadJSON();
  }, [asset.path, selectedChannel, selectedTopic]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent(jsonContent); // Reset to original content
  };

  const reloadJsonContent = async () => {
    try {
      // Add cache-busting parameter to ensure fresh content
      const timestamp = Date.now();
      const response = await fetch(`/api/assets/preview?path=${encodeURIComponent(asset.path)}&channel=${selectedChannel}&topic=${selectedTopic}&t=${timestamp}`);
      if (response.ok) {
        const content = await response.text();
        const parsed = JSON.parse(content);
        const formattedContent = JSON.stringify(parsed, null, 2);
        setJsonContent(formattedContent);
        setEditContent(formattedContent);
        setParsedJson(parsed);
      }
    } catch (error) {
      logger.error('Error reloading JSON content:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate JSON
      let parsedJson;
      try {
        parsedJson = JSON.parse(editContent);
      } catch (error) {
        alert('Invalid JSON format. Please check your syntax.');
        return;
      }

      const response = await fetch('/api/assets/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: asset.path,
          channel: selectedChannel,
          topic: selectedTopic,
          content: parsedJson
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save JSON content');
      }

      // Reload the content from server to ensure we have the latest data
      await reloadJsonContent();
      setIsEditing(false);
      
      // Show success message without blocking UI
      setToast({ message: 'JSON content saved successfully!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
      
      // Update the specific asset in the state instead of refreshing all assets
      setAssetGroups(prevGroups => {
        return prevGroups.map(group => {
          if (group.key === asset.key) {
            return {
              ...group,
              assets: {
                ...group.assets,
                jsons: group.assets.jsons.map(json => {
                  if (json.id === asset.id) {
                    return {
                      ...json,
                      lastModified: new Date()
                    };
                  }
                  return json;
                })
              }
            };
          }
          return group;
        });
      });
      
    } catch (error) {
      logger.error('Error saving JSON content:', error);
      alert('Failed to save JSON content. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Video Preview Component
  const VideoPreview = ({ jsonData, asset }: { jsonData: any; asset: Asset }) => {
    const [currentSection, setCurrentSection] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    const sections = [
      { name: 'Intro', icon: '🎬', duration: 5 },
      { name: 'Quiz 1', icon: '❓', duration: 8 },
      { name: 'Quiz 2', icon: '❓', duration: 8 },
      { name: 'Quiz 3', icon: '❓', duration: 8 },
      { name: 'Lesson', icon: '📚', duration: 6 },
      { name: 'Reward', icon: '🏆', duration: 4 }
    ];

    useEffect(() => {
      let interval: NodeJS.Timeout;
      if (isPlaying) {
        interval = setInterval(() => {
          setCurrentTime(prev => {
            const newTime = prev + 0.1;
            if (newTime >= totalDuration) {
              setIsPlaying(false);
              return 0;
            }
            
            // Update current section based on time
            let accumulatedTime = 0;
            for (let i = 0; i < sections.length; i++) {
              if (newTime < accumulatedTime + sections[i].duration) {
                setCurrentSection(i);
                break;
              }
              accumulatedTime += sections[i].duration;
            }
            
            return newTime;
          });
        }, 100);
      }
      return () => clearInterval(interval);
    }, [isPlaying, totalDuration]);

    useEffect(() => {
      // Calculate total duration
      const total = sections.reduce((sum, section) => sum + section.duration, 0);
      setTotalDuration(total);
      
      // Initialize current section based on time
      let accumulatedTime = 0;
      for (let i = 0; i < sections.length; i++) {
        if (currentTime < accumulatedTime + sections[i].duration) {
          setCurrentSection(i);
          break;
        }
        accumulatedTime += sections[i].duration;
      }
    }, [currentTime]);

    // Auto-play lesson and reward videos when section changes
    useEffect(() => {
      if ((currentSection === 4 || currentSection === 5) && videoRef.current) {
        videoRef.current.play().catch((e: any) => logger.debug('Auto-play failed:', e));
      }
    }, [currentSection]);



    const handlePlayPause = () => {
      setIsPlaying(!isPlaying);
    };

    const handleSeek = (time: number) => {
      setCurrentTime(time);
      // Calculate which section we're in
      let accumulatedTime = 0;
      for (let i = 0; i < sections.length; i++) {
        if (time < accumulatedTime + sections[i].duration) {
          setCurrentSection(i);
          break;
        }
        accumulatedTime += sections[i].duration;
      }
    };

    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const getCurrentSectionContent = () => {
      if (!jsonData) return null;

      switch (currentSection) {
        case 0: // Intro
          return {
            title: 'Introduction',
            text: jsonData.intro?.text || 'No intro text available',
            voice: jsonData.intro?.voice || 'No voice available'
          };
        case 1: // Quiz 1
          return {
            title: 'Quiz 1',
            question: jsonData.quiz_1?.question?.text || 'No question available',
            options: jsonData.quiz_1?.options || [],
            answer: jsonData.quiz_1?.answer?.position || 0,
            voice: jsonData.quiz_1?.question?.voice || 'No voice available'
          };
        case 2: // Quiz 2
          return {
            title: 'Quiz 2',
            question: jsonData.quiz_2?.question?.text || 'No question available',
            options: jsonData.quiz_2?.options || [],
            answer: jsonData.quiz_2?.answer?.position || 0,
            voice: jsonData.quiz_2?.question?.voice || 'No voice available'
          };
        case 3: // Quiz 3
          return {
            title: 'Quiz 3',
            question: jsonData.quiz_3?.question?.text || 'No question available',
            options: jsonData.quiz_3?.options || [],
            answer: jsonData.quiz_3?.answer?.position || 0,
            voice: jsonData.quiz_3?.question?.voice || 'No voice available'
          };
        case 4: // Lesson
          return {
            title: 'Lesson',
            text: 'Educational content about the topic',
            voice: jsonData.lesson?.voice || 'No voice available'
          };
        case 5: // Reward
          return {
            title: 'Reward',
            text: 'Congratulations! You completed the lesson!',
            voice: jsonData.reward?.voice || 'No voice available'
          };
        default:
          return null;
      }
    };

    const content = getCurrentSectionContent();
    
    // Debug log to see if currentSection is updating
    logger.debug('VideoPreview - currentSection:', currentSection, 'currentTime:', currentTime, 'content:', content);

    return (
      <div className="bg-surface rounded-lg p-6 space-y-6 min-h-[600px]">
        {/* Video Player Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🎬</div>
            <div>
              <h3 className="text-lg font-semibold text-text">Video Preview</h3>
              <p className="text-sm text-text-muted">{asset.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlayPause}
              className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-accent-fg font-medium transition-colors"
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-text-muted">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max={totalDuration}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-2 bg-surface-raised rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${(currentTime / totalDuration) * 100}%, var(--color-surface-sunken) ${(currentTime / totalDuration) * 100}%, var(--color-surface-sunken) 100%)`
              }}
            />
          </div>
        </div>

        {/* Section Indicators */}
        <div className="flex space-x-2">
          {sections.map((section, index) => {
            const sectionStart = sections.slice(0, index).reduce((sum, s) => sum + s.duration, 0);
            const sectionEnd = sectionStart + section.duration;
            const isActive = currentTime >= sectionStart && currentTime < sectionEnd;
            const isCompleted = currentTime >= sectionEnd;

            return (
              <button
                key={section.name}
                onClick={() => handleSeek(sectionStart)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-accent text-accent-fg' 
                    : isCompleted 
                      ? 'bg-success text-white' 
                      : 'bg-surface-raised text-text-muted hover:bg-surface'
                }`}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>{section.icon}</span>
                  <span>{section.name}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Section Content */}
        {content && (
          <div className="bg-surface-raised rounded-lg p-6 space-y-4 min-h-[400px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{sections[currentSection].icon}</div>
                <h4 className="text-xl font-semibold text-text">{content.title}</h4>
              </div>
              <div className="text-sm text-text-muted">
                Section {currentSection + 1} of {sections.length} • {formatTime(currentTime)} / {formatTime(totalDuration)}
              </div>
            </div>

            {/* Content Display */}
            <div className="space-y-4">
              {currentSection >= 1 && currentSection <= 3 ? (
                // Quiz Section
                <div className="space-y-4">
                  <div className="bg-surface-raised rounded-lg p-4">
                    <h5 className="text-lg font-medium text-text mb-2">Question:</h5>
                    <p className="text-text-muted">{content.question}</p>
                  </div>
                  
                                       <div className="grid grid-cols-2 gap-3">
                     {content.options.map((option: string, index: number) => (
                       <div
                         key={index}
                         className={`p-3 rounded-lg text-left transition-all ${
                           index === (content.answer - 1) // Convert 1-based to 0-based
                             ? 'bg-success text-white border-2 border-success'
                             : 'bg-surface-raised text-text-muted'
                         }`}
                       >
                         <div className="flex items-center space-x-2">
                           <span className="text-sm font-medium">
                             {String.fromCharCode(65 + index)}.
                           </span>
                           <span>{option}</span>
                           {index === (content.answer - 1) && (
                             <span className="ml-auto text-success">✓</span>
                           )}
                         </div>
                         
                         {/* Show image for Quiz 3 if available */}
                         {currentSection === 3 && (
                           <div className="mt-2">
                             {(() => {
                               const imagePath = `${config.workingDirectory}/${selectedChannel}/${selectedTopic}/image/options/${option.toLowerCase()}.png`;
                               logger.debug('Quiz 3 Image Path:', imagePath);
                               return (
                                 <img 
                                   src={`/api/assets/preview?path=${encodeURIComponent(imagePath)}&channel=${selectedChannel}&topic=${selectedTopic}`}
                                   alt={option}
                                   className="w-full aspect-square object-cover rounded"
                                   onError={(e) => {
                                     const img = e.currentTarget as HTMLImageElement;
                                     logger.debug('Image failed to load:', img.src);
                                     // Try jpg if png fails
                                     if (img.src.includes('.png')) {
                                       img.src = img.src.replace('.png', '.jpg');
                                     } else if (img.src.includes('.jpg')) {
                                       img.src = img.src.replace('.jpg', '.jpeg');
                                     } else {
                                       // Show placeholder if all formats fail
                                       img.src = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KPC9zdmc+`;
                                     }
                                   }}
                                 />
                               );
                             })()}
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                </div>
                               ) : (
                 // Non-Quiz Section
                 <div className="space-y-4">
                   <div className="bg-surface-raised rounded-lg p-4">
                     <h5 className="text-lg font-medium text-text mb-2">Content:</h5>
                     <p className="text-text-muted">{content.text}</p>
                   </div>
                   
                   {/* Show video preview for Lesson and Reward sections */}
                   {(currentSection === 4 || currentSection === 5) && (
                     <div className="bg-surface-raised rounded-lg p-4">
                       <h5 className="text-lg font-medium text-text mb-2">Video Preview:</h5>
                       <video 
                         ref={videoRef}
                         src={`/api/assets/preview?path=${encodeURIComponent(`${config.workingDirectory}/${selectedChannel}/${selectedTopic}/${currentSection === 5 ? `reward/output/reward_${asset.order}/${asset.key}.mp4` : `video/${asset.key}.mp4`}`)}&channel=${selectedChannel}&topic=${selectedTopic}`}
                         className={`w-full ${currentSection === 4 || currentSection === 5 ? 'aspect-square' : 'h-32'} object-cover rounded`}
                         controls
                         autoPlay={currentSection === 4 || currentSection === 5}
                         muted={currentSection === 4 || currentSection === 5}
                         onError={(e) => {
                           const video = e.currentTarget as HTMLVideoElement;
                           const fallback = video.nextElementSibling as HTMLElement;
                           if (video && fallback) {
                             video.style.display = 'none';
                             fallback.style.display = 'flex';
                           }
                         }}
                       />
                       <div className="w-full h-32 bg-surface-raised rounded flex items-center justify-center" style={{ display: 'none' }}>
                         <div className="text-center">
                           <div className="text-3xl mb-2">🎬</div>
                           <span className="text-sm text-text-muted">
                             {currentSection === 4 ? 'Lesson video not found' : `Reward video not found (${asset.key}.mp4)`}
                           </span>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               )}

              {/* Voice Preview */}
              <div className="bg-info rounded-lg p-4">
                <h5 className="text-lg font-medium text-white mb-2">Voice Narration:</h5>
                <p className="text-white">{content.voice}</p>
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-sm text-white">🎵</span>
                  <span className="text-sm text-white">Voice file would play here</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-surface-sunken rounded-lg p-4 max-h-[80vh] overflow-auto w-full max-w-4xl">
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h4 className="text-lg font-semibold text-accent">JSON Content</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('json')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'json' 
                      ? 'bg-accent text-accent-fg' 
                      : 'bg-surface-raised text-text-muted hover:bg-surface'
                  }`}
                >
                  JSON
                </button>
                <button
                  onClick={() => setViewMode('video')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'video' 
                      ? 'bg-accent text-accent-fg' 
                      : 'bg-surface-raised text-text-muted hover:bg-surface'
                  }`}
                >
                  🎬 Video Preview
                </button>
              </div>
            </div>
            
            {viewMode === 'json' && !isEditing && (
              <button
                onClick={handleEdit}
                className="px-3 py-1 bg-info text-white hover:opacity-90 rounded text-sm transition-colors"
              >
                Edit
              </button>
            )}
            
            {viewMode === 'json' && isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1 bg-success text-white hover:opacity-90 disabled:bg-surface-raised rounded text-sm transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-surface-raised hover:bg-surface rounded text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          {viewMode === 'json' ? (
            isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-80 bg-surface text-text-muted text-sm font-mono p-4 rounded border border-border focus:border-accent focus:outline-none resize-none"
                placeholder="Edit JSON content here..."
              />
            ) : (
              <pre className="text-sm text-text-muted whitespace-pre-wrap">
                {jsonContent}
              </pre>
            )
          ) : (
            <VideoPreview jsonData={parsedJson} asset={asset} />
          )}
        </div>
      )}
    </div>
  );
}
