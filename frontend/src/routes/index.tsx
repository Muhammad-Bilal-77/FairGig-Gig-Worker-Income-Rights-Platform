import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/LandingPageComplete";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "FairGig — Know your rights. Get paid what you earn." },
      {
        name: "description",
        content:
          "FairGig is the fintech and worker's rights platform for 1.2M+ gig workers. Verify income, track earnings, and stand up for fair pay.",
      },
      { property: "og:title", content: "FairGig — The platform for gig workers" },
      {
        property: "og:description",
        content:
          "Verified income, anomaly alerts, and contract protection — built for workers, verifiers, and advocates.",
      },
    ],
  }),
});

function Index() {
  return <LandingPage />;
}
