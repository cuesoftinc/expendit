import PageLayout from "@/components/layouts/PageLayout";
import TopBoard from "@/components/home/TopBoard";
import LinearChart from "@/components/home/LinearChart";
import LatestExpenses from "@/components/home/LatestExpenses";
import ImportCard from "@/components/home/ImportCard";
import styles from "@/components/custom-styles";
import { ProtectedRoute } from "@/components/helpers/RouteProtection";

export default function Home() {
  return (
    <ProtectedRoute>
      <PageLayout>
        <main className={styles.pagePad}>
          <TopBoard data-testid="top-board" />
          <ImportCard />
          <LinearChart />
          <LatestExpenses />
        </main>
      </PageLayout>
    </ProtectedRoute>
  );
}
