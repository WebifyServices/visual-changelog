import { useRoute } from "./lib/router";
import { Header } from "./components/Header";
import { TimelinePage } from "./pages/TimelinePage";
import { EntryDetailPage } from "./pages/EntryDetailPage";

export default function App() {
  const route = useRoute();
  return (
    <>
      <Header showBack={route.page === "entry"} />
      {route.page === "timeline" ? <TimelinePage /> : <EntryDetailPage id={route.id} />}
    </>
  );
}
