import PageLayout from "@/components/layouts/PageLayout";
import TopBoard from "@/components/home/TopBoard";
import LinearChart from "@/components/home/LinearChart";
import LatestExpenses from "@/components/home/LatestExpenses";
import styles from '@/components/CustomStyles';

export default function Home() {
  return (
    <PageLayout>
      <main className={styles.pagePad} data-testid="homepage">
        <TopBoard />
        <LinearChart />
        <LatestExpenses />
      </main>
    </PageLayout>
  )
}
