import PageLayout from "@/components/layouts/PageLayout";
import TopBoard from "@/components/home/TopBoard";
import LinearChart from "@/components/home/LinearChart";
import LatestExpenses from "@/components/home/LatestExpenses";
import styles from '@/components/CustomStyles';
import { ProtectedRoute } from "@/components/helpers/RouteProtection";

export default function Home() {
  return (
    <ProtectedRoute>
      <PageLayout>
        <main className={styles.pagePad} data-testid="homepage">
          <TopBoard />
          <LinearChart />
          <LatestExpenses />
        </main>
      </PageLayout>
    </ProtectedRoute>
  )
}
