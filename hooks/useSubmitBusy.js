import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

// A form that navigates on submit (search, "go to hadith"): busy from the submit
// until the page it asked for arrives or the navigation fails, so its button can
// say so (`aria-busy`, styled in styles/_core). A navigation that never reports
// back (a same-page search with nothing new to load) frees the button after 15s.
const GIVE_UP = 15000;

export default function useSubmitBusy() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!busy) return undefined;
    const done = () => setBusy(false);
    const timer = window.setTimeout(done, GIVE_UP);
    router.events.on("routeChangeComplete", done);
    router.events.on("routeChangeError", done);
    return () => {
      window.clearTimeout(timer);
      router.events.off("routeChangeComplete", done);
      router.events.off("routeChangeError", done);
    };
  }, [busy, router.events]);

  const start = useCallback(() => setBusy(true), []);
  return [busy, start];
}
