import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useLocale } from "../../contexts/LocaleContext";
import ChevronUpIcon from "../icons/ChevronUp";
import styles from "./ScrollFrame.module.scss";

const HIDDEN = "header-hidden";
const PHONE = "(max-width: 1023px)";
const HEADER_HEIGHT = 54;
const MIN_DELTA = 8; // px; smaller moves (and iOS bounce) don't toggle the header

// Scroll behaviour shared by the layouts (one passive listener):
// - phones: the fixed header slides away while reading down and comes back
//   on any scroll up, as on quran.com. The state is the `header-hidden`
//   class on <html>, which also sets --header-offset to 0 (styles/_core).
// - long pages: a back-to-top button after one and a half screens. On
//   phones it comes and goes with the header, so it never sits on the text
//   while reading down; on desktop the layouts keep a lane free for it.
export default function ScrollFrame() {
  const router = useRouter();
  const { t } = useLocale();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const phone = window.matchMedia(PHONE);
    let last = Math.max(window.scrollY, 0);
    let hash = window.location.hash;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = Math.max(window.scrollY, 0);
      const delta = y - last;
      if (!phone.matches || y <= HEADER_HEIGHT) {
        root.classList.remove(HIDDEN);
        last = y;
      } else if (window.location.hash !== hash) {
        // A jump to an in-page target (#hadith-12; the URL changes before the scroll),
        // not reading: the header keeps its state, so the target stays where the
        // browser put it, clear of the header and the reading bar (html's
        // scroll-padding, styles/_core).
        last = y;
      } else if (Math.abs(delta) >= MIN_DELTA) {
        root.classList.toggle(HIDDEN, delta > 0);
        last = y;
      }
      hash = window.location.hash;
      const readingDown = phone.matches && root.classList.contains(HIDDEN);
      setShowTop(y > window.innerHeight * 1.5 && !readingDown);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    // A new page always starts with the header in view.
    const reveal = () => root.classList.remove(HIDDEN);
    // The router's own scroll after a navigation (to the top, or to a pin's
    // #hadith-12) is not reading either.
    const arrived = () => {
      hash = null;
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    router.events.on("routeChangeStart", reveal);
    router.events.on("routeChangeComplete", arrived);
    router.events.on("hashChangeComplete", arrived);
    return () => {
      window.removeEventListener("scroll", onScroll);
      router.events.off("routeChangeStart", reveal);
      router.events.off("routeChangeComplete", arrived);
      router.events.off("hashChangeComplete", arrived);
      if (frame) window.cancelAnimationFrame(frame);
      reveal();
    };
  }, [router.events]);

  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    // Keyboard users continue from the top too (the button hides itself).
    const main = document.getElementById("viewport");
    if (main) main.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      className={`${styles.top} ${showTop ? styles.visible : ""}`}
      onClick={toTop}
      aria-label={t("backToTop")}
      title={t("backToTop")}
    >
      <ChevronUpIcon />
    </button>
  );
}
