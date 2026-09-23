import { Dashboard } from "@/components/dashboard";
import { fetchNflWeek } from "@/lib/espn";
import { enrichWeeksWithAvailabilityWatch } from "@/lib/injuries";
import { enrichWeeksWithMatchupContext, fetchCurrentNflWeekNumber } from "@/lib/matchup-context";

export const dynamic = "force-dynamic";

export default async function Home() {
  const currentWeek = await fetchCurrentNflWeekNumber();
  const weekNumbers = Array.from({ length: currentWeek }, (_, index) => index + 1);
  const weeks = await Promise.all(weekNumbers.map(fetchNflWeek));
  const weeksWithContext = await enrichWeeksWithMatchupContext(weeks);
  const weeksWithAvailability = await enrichWeeksWithAvailabilityWatch(weeksWithContext);
  return <Dashboard weeks={weeksWithAvailability} />;
}
