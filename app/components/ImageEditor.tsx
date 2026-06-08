"use client";

import React, { useState, useRef, useEffect } from 'react';
import { CheckIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { Button, Select, Label, Dialog } from "@/app/components/ui";

interface ImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName: string;
  onSave: (editedImageBlob: Blob, fileName: string) => void;
  defaultSize?: number;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageEditor({
  isOpen,
  onClose,
  imageUrl,
  imageName,
  onSave,
  defaultSize = 512
}: ImageEditorProps) {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [currentSize, setCurrentSize] = useState(defaultSize);

  // Update currentSize when defaultSize changes
  useEffect(() => {
    setCurrentSize(defaultSize);
  }, [defaultSize]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load the original image
  useEffect(() => {
    if (isOpen && imageUrl) {
      console.log('🖼️ Loading image from URL:', imageUrl);
      
      // Create a blob URL from the image data
      fetch(imageUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          console.log('📦 Image blob created:', blob.size, 'bytes');
          const newBlobUrl = URL.createObjectURL(blob);
          console.log('🔗 Blob URL created:', newBlobUrl);
          
          // Clean up previous blob URL
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
          }
          setBlobUrl(newBlobUrl);
          
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            console.log('✅ Image loaded successfully:', img.width, 'x', img.height);
            setOriginalImage(img);
            // Use setTimeout for initial load to ensure container is ready
            setTimeout(() => initializeCropArea(img), 100);
          };
          img.onerror = (error) => {
            console.error('❌ Failed to load image:', error);
            console.error('Image URL:', imageUrl);
          };
          img.src = newBlobUrl;
        })
        .catch(error => {
          console.error('❌ Failed to fetch image:', error);
        });
    }
  }, [isOpen, imageUrl]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const initializeCropArea = (img: HTMLImageElement) => {
    console.log('🔧 Initializing crop area for image:', img.width, 'x', img.height);
    const container = containerRef.current;
    if (!container) {
      console.log('❌ Container not found');
      return;
    }

    // Get container dimensions
    const containerRect = container.getBoundingClientRect();
    console.log('📐 Container rect:', containerRect);
    
    // Calculate available space (with padding)
    const padding = 40;
    const availableWidth = containerRect.width - padding;
    const availableHeight = containerRect.height - padding;
    
    console.log('📐 Available space:', availableWidth, 'x', availableHeight);
    
    // Use a reasonable fallback size if container is too small
    const containerSize = Math.max(400, Math.min(availableWidth, availableHeight));
    
    console.log('📐 Using container size:', containerSize);
    
    // Calculate scale to fit image in container
    const scaleX = containerSize / img.width;
    const scaleY = containerSize / img.height;
    const initialScale = Math.min(scaleX, scaleY);
    
    console.log('📏 Initial scale:', initialScale);
    
    setScale(initialScale);
    setCanvasSize({ width: containerSize, height: containerSize });

    // Calculate crop area (center crop)
    const cropSize = Math.min(img.width, img.height);
    const cropX = (img.width - cropSize) / 2;
    const cropY = (img.height - cropSize) / 2;

    const cropArea = {
      x: cropX * initialScale,
      y: cropY * initialScale,
      width: cropSize * initialScale,
      height: cropSize * initialScale
    };
    
    console.log('✂️ Crop area:', cropArea);
    setCropArea(cropArea);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newX = Math.max(0, Math.min(canvasSize.width - cropArea.width, x - dragStart.x));
    const newY = Math.max(0, Math.min(canvasSize.height - cropArea.height, y - dragStart.y));
    
    setCropArea(prev => ({ ...prev, x: newX, y: newY }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(3, prev * delta)));
  };

  const resetCrop = () => {
    console.log('🔄 Resetting crop area');
    if (originalImage) {
      initializeCropArea(originalImage);
    }
  };

  const saveImage = async () => {
    if (!canvasRef.current || !originalImage) return;
    
    setIsLoading(true);
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to target size
      canvas.width = currentSize;
      canvas.height = currentSize;

      // Calculate source coordinates from crop area
      const sourceX = cropArea.x / scale;
      const sourceY = cropArea.y / scale;
      const sourceWidth = cropArea.width / scale;
      const sourceHeight = cropArea.height / scale;

      // Draw the cropped and resized image
      ctx.drawImage(
        originalImage,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, defaultSize, defaultSize
      );

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          onSave(blob, imageName);
        }
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('Error saving image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const drawCanvas = () => {
    if (!canvasRef.current || !originalImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the scaled image
    ctx.drawImage(
      originalImage,
      0, 0, originalImage.width, originalImage.height,
      0, 0, originalImage.width * scale, originalImage.height * scale
    );

    // Draw crop overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear the crop area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    
    // Draw crop border
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
  };

  useEffect(() => {
    drawCanvas();
  }, [originalImage, cropArea, scale, canvasSize]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={`Edit Image: ${imageName}`}
    >
      {/* Image Editor */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Canvas Container */}
        <div className="flex-1">
          <div className="mb-4">
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span>Target Size: {defaultSize}x{defaultSize}</span>
              <span>Scale: {(scale * 100).toFixed(0)}%</span>
              <button
                onClick={resetCrop}
                className="flex items-center gap-1 text-info hover:text-text"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          <div
            ref={containerRef}
            className="relative bg-bg rounded-lg overflow-hidden cursor-move"
            style={{ width: canvasSize.width, height: canvasSize.height }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              className="block"
              style={{ width: canvasSize.width, height: canvasSize.height }}
            />
          </div>

          <div className="mt-4 text-xs text-text-muted">
            <p>• Drag to move the crop area</p>
            <p>• Scroll to zoom in/out</p>
            <p>• The white border shows the crop area</p>
          </div>
        </div>

        {/* Controls */}
        <div className="lg:w-64 space-y-4">
          <div className="bg-surface-raised rounded-lg p-4">
            <h3 className="text-sm font-medium text-text mb-3">Settings</h3>

            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1">Output Size</Label>
                <Select
                  value={currentSize}
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value);
                    console.log('📏 Size changed to:', newSize);
                    setCurrentSize(newSize);
                    // Reset crop area when size changes
                    if (originalImage) {
                      initializeCropArea(originalImage);
                    }
                  }}
                  className="text-sm"
                >
                  <option value={512}>512x512</option>
                  <option value={1024}>1024x1024</option>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1">Zoom</Label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="bg-surface-raised rounded-lg p-4">
            <h3 className="text-sm font-medium text-text mb-3">Actions</h3>

            <div className="space-y-2">
              <Button
                onClick={saveImage}
                disabled={isLoading}
                loading={isLoading}
                variant="primary"
                className="w-full"
                leftIcon={<CheckIcon className="w-4 h-4" />}
              >
                {isLoading ? 'Saving...' : 'Save Image'}
              </Button>

              <Button
                onClick={onClose}
                variant="secondary"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
} 