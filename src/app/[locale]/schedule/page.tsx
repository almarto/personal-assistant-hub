import {
  getDisplayWeekStartDate,
  getNavigationDates,
  getWeekSchedule,
} from "@/lib/services/schedule";

import ScheduleClient from "./ScheduleClient";

interface SchedulePageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const params = await searchParams;
  const weekStartDate = params.week || getDisplayWeekStartDate();
  const weekSchedule = await getWeekSchedule(weekStartDate);
  const { prevWeek, nextWeek } = getNavigationDates(weekStartDate);

  return (
    <ScheduleClient
      weekSchedule={weekSchedule}
      prevWeek={prevWeek}
      nextWeek={nextWeek}
    />
  );
}
