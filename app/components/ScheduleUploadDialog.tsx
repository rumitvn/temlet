"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/solid';
import { RenderItem } from '../types/render';

interface ScheduleUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scheduleConfig: ScheduleConfig) => void;
  itemCount: number;
  items?: RenderItem[]; // Add items prop to get file names and maintain order
}

export interface ScheduleConfig {
  startDate: string; // YYYY-MM-DD format
  timeSlots: string[]; // HH:MM format
  videosPerDay: number;
}

export default function ScheduleUploadDialog({
  isOpen,
  onClose,
  onConfirm,
  itemCount,
  items = [],
}: ScheduleUploadDialogProps) {
  const [startDate, setStartDate] = useState('');
  const [timeSlots, setTimeSlots] = useState<string[]>(['06:00', '11:00', '16:00']);
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [videosPerDay, setVideosPerDay] = useState(3);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Set default start date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(tomorrow.toISOString().split('T')[0]);
      setTimeSlots(['06:00', '11:00', '16:00']);
      setVideosPerDay(3);
    }
  }, [isOpen]);

  const addTimeSlot = () => {
    if (newTimeSlot && !timeSlots.includes(newTimeSlot)) {
      const updatedSlots = [...timeSlots, newTimeSlot].sort();
      setTimeSlots(updatedSlots);
      setNewTimeSlot('');
      // Update videos per day if it exceeds the new slot count
      if (videosPerDay > updatedSlots.length) {
        setVideosPerDay(updatedSlots.length);
      }
    }
  };

  const removeTimeSlot = (timeSlot: string) => {
    const updatedSlots = timeSlots.filter(slot => slot !== timeSlot);
    setTimeSlots(updatedSlots);
    // Update videos per day if it exceeds the new slot count
    if (videosPerDay > updatedSlots.length) {
      setVideosPerDay(updatedSlots.length);
    }
  };

  const handleConfirm = () => {
    if (!startDate || timeSlots.length === 0) {
      return;
    }

    const scheduleConfig: ScheduleConfig = {
      startDate,
      timeSlots,
      videosPerDay,
    };

    onConfirm(scheduleConfig);
  };

  // Calculate schedule preview
  const getSchedulePreview = () => {
    if (!startDate || timeSlots.length === 0) return [];

    const preview = [];
    let currentDate = new Date(startDate);
    let remainingItems = itemCount;
    let timeSlotIndex = 0;
    let videosThisDay = 0;

    while (remainingItems > 0) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const timeSlot = timeSlots[timeSlotIndex % timeSlots.length];
      const itemIndex = itemCount - remainingItems;
      
      // Get the item name if available, otherwise use item number
      const itemName = items[itemIndex]?.fileName || `Item ${itemIndex + 1}`;
      
      preview.push({
        date: dateStr,
        time: timeSlot,
        itemNumber: itemIndex + 1,
        itemName: itemName,
      });

      remainingItems--;
      timeSlotIndex++;
      videosThisDay++;

      // Move to next day if we've reached the videos per day limit
      if (videosThisDay >= videosPerDay) {
        currentDate.setDate(currentDate.getDate() + 1);
        videosThisDay = 0;
        timeSlotIndex = 0; // Reset time slot index for the new day
      }
    }

    return preview;
  };

  const schedulePreview = getSchedulePreview();
  const totalDays = schedulePreview.length > 0 ? 
    Math.ceil(schedulePreview.length / videosPerDay) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Schedule Upload</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Item Count Info */}
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-300">
                  Scheduling upload for <span className="font-bold">{itemCount}</span> item{itemCount !== 1 ? 's' : ''}
                </p>
                {totalDays > 0 && (
                  <p className="text-blue-300 text-sm mt-1">
                    Will be spread across <span className="font-bold">{totalDays}</span> day{totalDays !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  📅 Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                  required
                />
              </div>

              {/* Time Slots */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <ClockIcon className="w-4 h-4 inline mr-2" />
                  Time Slots ({timeSlots.length} slots)
                </label>
                <div className="space-y-2">
                  {timeSlots.map((timeSlot) => (
                    <div key={timeSlot} className="flex items-center gap-2">
                      <span className="bg-gray-700 text-white px-3 py-1 rounded">
                        {timeSlot}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(timeSlot)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={newTimeSlot}
                      onChange={(e) => setNewTimeSlot(e.target.value)}
                      className="bg-gray-700 text-white rounded-lg px-3 py-1"
                    />
                    <button
                      type="button"
                      onClick={addTimeSlot}
                      disabled={!newTimeSlot || timeSlots.includes(newTimeSlot)}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm"
                    >
                      Add Time
                    </button>
                  </div>
                </div>
              </div>

              {/* Videos Per Day */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Videos Per Day
                </label>
                <input
                  type="number"
                  min="1"
                  max={timeSlots.length}
                  value={videosPerDay}
                  onChange={(e) => setVideosPerDay(Math.min(parseInt(e.target.value) || 1, timeSlots.length))}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum: {timeSlots.length} (number of time slots)
                </p>
              </div>

              {/* Schedule Preview */}
              {schedulePreview.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Schedule Preview</h3>
                  <div className="bg-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {schedulePreview.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-gray-300 truncate max-w-[60%]">
                            <span className="text-purple-400 mr-2">#{item.itemNumber}</span>
                            {item.itemName}
                          </span>
                          <span className="text-gray-400">
                            {item.date} at {item.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!startDate || timeSlots.length === 0}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Confirm Schedule
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 