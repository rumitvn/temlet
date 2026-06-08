import { motion } from "framer-motion";
import { XCircleIcon } from "@heroicons/react/24/solid";
import type { Dispatch, SetStateAction } from "react";
import type { SK3QLRContent } from "../types";

interface AIGeneratorDialogProps {
  selectedChannel: string;
  selectedTopic: string;
  aiPrompt: string;
  aiDescription: string;
  aiProvider: string;
  aiLanguage: string;
  batchSize: number;
  subjectsList: string;
  previewItems: SK3QLRContent[];
  existingOrders: number[];
  isBatchMode: boolean;
  aiGenerating: boolean;
  batchGenerating: boolean;
  batchProgress: { current: number; total: number; subject: string } | null;
  setAiPrompt: Dispatch<SetStateAction<string>>;
  setAiDescription: Dispatch<SetStateAction<string>>;
  setAiLanguage: Dispatch<SetStateAction<string>>;
  setAiProvider: Dispatch<SetStateAction<string>>;
  setBatchSize: Dispatch<SetStateAction<number>>;
  setIsBatchMode: Dispatch<SetStateAction<boolean>>;
  setPreviewItems: Dispatch<SetStateAction<SK3QLRContent[]>>;
  setSubjectsList: Dispatch<SetStateAction<string>>;
  setShowAIGenerator: Dispatch<SetStateAction<boolean>>;
  generateAIContent: () => void;
  generateBatchAIContent: () => void;
  approveGeneratedContent: () => void;
  clearAllPreviews: () => void;
  removePreviewItem: (index: number) => void;
  handleSubjectChange: (value: string) => void;
  parseSubjectsList: (text: string) => string[];
  getExistingOrdersForSubjects: (subjects: string[]) => { [key: string]: number[] };
}

export default function AIGeneratorDialog({
  selectedChannel,
  selectedTopic,
  aiPrompt,
  aiDescription,
  aiProvider,
  aiLanguage,
  batchSize,
  subjectsList,
  previewItems,
  existingOrders,
  isBatchMode,
  aiGenerating,
  batchGenerating,
  batchProgress,
  setAiPrompt,
  setAiDescription,
  setAiLanguage,
  setAiProvider,
  setBatchSize,
  setIsBatchMode,
  setPreviewItems,
  setSubjectsList,
  setShowAIGenerator,
  generateAIContent,
  generateBatchAIContent,
  approveGeneratedContent,
  clearAllPreviews,
  removePreviewItem,
  handleSubjectChange,
  parseSubjectsList,
  getExistingOrdersForSubjects,
}: AIGeneratorDialogProps) {
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">AI Content Generator</h2>
        <button
          onClick={() => setShowAIGenerator(false)}
          className="text-text-muted hover:text-text"
        >
          <XCircleIcon className="w-6 h-6" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          {/* Generation Mode Tabs */}
          <div className="flex bg-surface-raised rounded-lg p-1">
            <button
              onClick={() => {
                setAiPrompt("");
                setSubjectsList("");
                setBatchSize(1);
                setIsBatchMode(false);
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                !isBatchMode ? 'bg-accent text-accent-fg' : 'text-text-muted hover:text-text'
              }`}
            >
              Single Subject
            </button>
            <button
              onClick={() => {
                setAiPrompt("");
                setSubjectsList("");
                setBatchSize(1);
                setIsBatchMode(true);
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                isBatchMode ? 'bg-accent text-accent-fg' : 'text-text-muted hover:text-text'
              }`}
            >
              Batch Generation
            </button>
          </div>

          {/* Single Subject Mode */}
          {!isBatchMode && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  placeholder="e.g., capybara, lion, tiger"
                  className="w-full bg-surface-raised text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none"
                />
                {existingOrders.length > 0 && (
                  <p className="text-sm text-info mt-1">
                    ℹ️ Existing orders: {existingOrders.join(', ')} → Next: {Math.max(...existingOrders) + 1}
                  </p>
                )}
              </div>
              
              <button
                onClick={generateAIContent}
                disabled={aiGenerating || !aiPrompt.trim()}
                className="w-full flex items-center justify-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-surface-raised px-4 py-2 rounded-lg transition-colors"
              >
                {aiGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="text-xl">✨</span>
                    Generate Content
                  </>
                )}
              </button>
            </div>
          )}

          {/* Batch Generation Mode */}
          {isBatchMode && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">
                  Subjects List (one per line, comma, or semicolon)
                </label>
                <textarea
                  value={subjectsList}
                  onChange={(e) => setSubjectsList(e.target.value)}
                  placeholder="capybara&#10;lion&#10;tiger&#10;elephant"
                  rows={4}
                  className="w-full bg-surface-raised text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none resize-none"
                />
                {(() => {
                  const subjects = parseSubjectsList(subjectsList);
                  const existingOrdersMap = getExistingOrdersForSubjects(subjects);
                  return subjects.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-info">
                        📋 {subjects.length} subjects detected
                      </p>
                      {subjects.slice(0, 3).map((subject, index) => {
                        const normalizedSubject = subject.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                        const orders = existingOrdersMap[normalizedSubject] || [];
                        return (
                          <p key={index} className="text-xs text-text-muted">
                            • {subject}: {orders.length > 0 ? `Orders ${orders.join(', ')}` : 'No existing orders'}
                          </p>
                        );
                      })}
                      {subjects.length > 3 && (
                        <p className="text-xs text-text-muted">
                          ... and {subjects.length - 3} more subjects
                        </p>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">
                  Content per Subject
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-surface-raised text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none"
                />
                <p className="text-xs text-text-muted mt-1">
                  Will generate {batchSize} content item(s) for each subject
                </p>
              </div>

              {batchGenerating && batchProgress && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-text-muted mb-1">
                    <span>Progress: {batchProgress.current}/{batchProgress.total}</span>
                    <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-surface-raised rounded-full h-2">
                    <div 
                      className="bg-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Currently generating: {batchProgress.subject}
                  </p>
                </div>
              )}
              
              <button
                onClick={generateBatchAIContent}
                disabled={batchGenerating || parseSubjectsList(subjectsList).length === 0}
                className="w-full flex items-center justify-center gap-2 bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-surface-raised px-4 py-2 rounded-lg transition-colors"
              >
                {batchGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">✨</span>
                    Generate {parseSubjectsList(subjectsList).length * batchSize} Items
                  </>
                )}
              </button>
            </div>
          )}

          {/* Common Settings */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Description
            </label>
            <textarea
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              placeholder="Provide more details about the subject for better content generation..."
              rows={3}
              className="w-full bg-surface-raised text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">
                Language
              </label>
              <select
                value={aiLanguage}
                onChange={(e) => setAiLanguage(e.target.value)}
                className="w-full bg-surface-raised text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none"
              >
                <option value="vietnamese">Vietnamese</option>
                <option value="english">English</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">
                AI Provider
              </label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="w-full bg-surface-raised text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none"
              >
                <option value="grok">Grok (xAI)</option>
                <option value="openai">OpenAI (GPT-4)</option>
              </select>
            </div>
          </div>
          
          <div className="text-sm text-text-muted bg-surface-raised rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-accent">📁</span>
              <span>Target: {selectedChannel}/{selectedTopic}</span>
            </div>
            <div className="text-xs text-text-muted">
              Content will be generated for the current channel and topic selection.
            </div>
          </div>
        </div>
        
        {/* Preview Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Generated Content Preview</h3>
            {previewItems.length > 0 && (
              <button
                onClick={clearAllPreviews}
                className="text-sm text-danger hover:text-danger"
              >
                Clear All
              </button>
            )}
          </div>
          
          {previewItems.length === 0 ? (
            <div className="bg-surface-raised rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
              <div className="text-center text-text-muted py-8">
                <div className="text-4xl mb-2">📝</div>
                <p>No preview items yet</p>
                <p className="text-sm">Generate content to see previews here</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Group preview items by subject */}
              {(() => {
                const groupedItems = previewItems.reduce((groups, item) => {
                  const subject = item.key;
                  if (!groups[subject]) {
                    groups[subject] = [];
                  }
                  groups[subject].push(item);
                  return groups;
                }, {} as { [key: string]: SK3QLRContent[] });

                return Object.entries(groupedItems).map(([subject, items]) => (
                  <div key={subject} className="bg-surface-raised rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-accent text-lg">
                        📁 {subject} ({items.length} items)
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            // Remove all items for this subject
                            setPreviewItems(prev => prev.filter(item => item.key !== subject));
                          }}
                          className="text-danger hover:text-danger text-sm"
                        >
                          Remove All
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {items.sort((a, b) => (a.order || 0) - (b.order || 0)).map((item, index) => (
                        <div key={item.id} className="bg-surface rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-info text-sm">
                              Order {item.order}
                            </h5>
                            <button
                              onClick={() => removePreviewItem(previewItems.findIndex(p => p.id === item.id))}
                              className="text-danger hover:text-danger text-xs"
                            >
                              Remove
                            </button>
                          </div>
                          
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-text-muted">Intro:</span>
                              <p className="text-text-muted truncate">{item.intro.text}</p>
                            </div>
                            <div>
                              <span className="text-text-muted">Quiz 1:</span>
                              <p className="text-text-muted truncate">{item.quiz_1.question.text}</p>
                            </div>
                            <div>
                              <span className="text-text-muted">Quiz 2:</span>
                              <p className="text-text-muted truncate">{item.quiz_2.question.text}</p>
                            </div>
                            <div>
                              <span className="text-text-muted">Quiz 3:</span>
                              <p className="text-text-muted truncate">{item.quiz_3.question.text}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
          
          <button
            onClick={approveGeneratedContent}
            disabled={previewItems.length === 0}
            className="w-full bg-success text-white hover:opacity-90 disabled:bg-surface-raised px-4 py-2 rounded-lg transition-colors"
          >
            Approve & Create {previewItems.length} Render File{previewItems.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
  );
}
