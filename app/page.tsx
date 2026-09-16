import { Dashboard } from "@/components/dashboard";
import { fetchNflWeek } from "@/lib/espn";
import { enrichWeeksWithCurrentInjuries } from "@/lib/injuries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const weeks = await Promise.all([fetchNflWeek(1), fetchNflWeek(2)]);
  const weeksWithCurrentInjuries = await enrichWeeksWithCurrentInjuries(weeks);
  return <Dashboard weeks={weeksWithCurrentInjuries} />;
}
