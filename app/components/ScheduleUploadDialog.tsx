"use client";

import React, { useState, useEffect } from 'react';
import { ClockIcon } from '@heroicons/react/24/solid';
import { RenderItem } from '../types/render';
import { Button, Dialog, Input, Label } from '@/app/components/ui';

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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Upload"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!startDate || timeSlots.length === 0}
          >
            Confirm Schedule
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Item Count Info */}
        <div className="bg-info-bg border border-info/30 rounded-lg p-4">
          <p className="text-info">
            Scheduling upload for <span className="font-bold">{itemCount}</span> item{itemCount !== 1 ? 's' : ''}
          </p>
          {totalDays > 0 && (
            <p className="text-info text-sm mt-1">
              Will be spread across <span className="font-bold">{totalDays}</span> day{totalDays !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Start Date */}
        <div>
          <Label className="mb-2">
            📅 Start Date
          </Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        {/* Time Slots */}
        <div>
          <Label className="mb-2">
            <ClockIcon className="w-4 h-4 inline mr-2" />
            Time Slots ({timeSlots.length} slots)
          </Label>
          <div className="space-y-2">
            {timeSlots.map((timeSlot) => (
              <div key={timeSlot} className="flex items-center gap-2">
                <span className="bg-surface-raised text-text px-3 py-1 rounded">
                  {timeSlot}
                </span>
                <button
                  type="button"
                  onClick={() => removeTimeSlot(timeSlot)}
                  className="text-danger hover:opacity-80 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                type="time"
                value={newTimeSlot}
                onChange={(e) => setNewTimeSlot(e.target.value)}
                className="w-auto"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={addTimeSlot}
                disabled={!newTimeSlot || timeSlots.includes(newTimeSlot)}
              >
                Add Time
              </Button>
            </div>
          </div>
        </div>

        {/* Videos Per Day */}
        <div>
          <Label className="mb-2">
            Videos Per Day
          </Label>
          <Input
            type="number"
            min="1"
            max={timeSlots.length}
            value={videosPerDay}
            onChange={(e) => setVideosPerDay(Math.min(parseInt(e.target.value) || 1, timeSlots.length))}
          />
          <p className="text-sm text-text-faint mt-1">
            Maximum: {timeSlots.length} (number of time slots)
          </p>
        </div>

        {/* Schedule Preview */}
        {schedulePreview.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-3">Schedule Preview</h3>
            <div className="bg-surface-raised rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {schedulePreview.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-text-muted truncate max-w-[60%]">
                      <span className="text-accent mr-2">#{item.itemNumber}</span>
                      {item.itemName}
                    </span>
                    <span className="text-text-muted">
                      {item.date} at {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
