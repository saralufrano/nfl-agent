import { Dashboard } from "@/components/dashboard";
import { fetchNflWeek } from "@/lib/espn";

export default async function Home() {
  const weeks = await Promise.all([fetchNflWeek(1), fetchNflWeek(2)]);
  return <Dashboard weeks={weeks} />;
}
