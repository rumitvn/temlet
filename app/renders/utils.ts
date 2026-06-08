import type { ScheduleConfig } from "../components/ScheduleUploadDialog";

export const formatDate = (
  dateString: string | number | Date | null | undefined,
): string => {
  if (!dateString) return "-";
  const date =
    typeof dateString === "number"
      ? new Date(dateString * 1000)
      : new Date(dateString);
  return date.toLocaleString();
};

/**
 * Compute the ISO scheduled date for an item at `itemIndex`, distributing
 * uploads across days and time slots per the schedule config.
 */
export const calculateScheduledDate = (
  scheduleConfig: ScheduleConfig,
  itemIndex: number,
): string => {
  const { startDate, timeSlots, videosPerDay } = scheduleConfig;
  const start = new Date(startDate);

  // Calculate which day this item should be scheduled for
  const dayOffset = Math.floor(itemIndex / videosPerDay);
  const timeSlotIndex = itemIndex % videosPerDay;

  const scheduledDate = new Date(start);
  scheduledDate.setDate(start.getDate() + dayOffset);

  // Get the time slot
  const timeSlot = timeSlots[timeSlotIndex % timeSlots.length];
  const [hours, minutes] = timeSlot.split(":").map(Number);
  scheduledDate.setHours(hours, minutes, 0, 0);

  return scheduledDate.toISOString();
};
