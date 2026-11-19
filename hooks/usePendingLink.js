import { useEffect } from "react";
import Router from "next/router";

// The link a reader followed says so at once, until its page is there: a page not yet cached is
// built on the server first, and nothing on the screen moved meanwhile. The link (an <a> of
// this site, clicked or tapped) gets `data-pending` and aria-busy; styles/_core.scss makes it
// pulse after a moment, so a page that is already here shows nothing. <html> gets
// data-navigating for the pointer. Once, in pages/_app.js.
export default function usePendingLink() {
  useEffect(() => {
    let clicked = null;
    let pending = null;

    // a plain click on a link of this site (not one for a new tab or a download)
    const remember = (event) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
      clicked =
        plain && link && link.origin === window.location.origin && !link.hasAttribute("download") && link.target !== "_blank"
          ? link
          : null;
    };
    const forget = () => {
      clicked = null;
    };
    const start = (url, { shallow } = {}) => {
      if (shallow) return;
      if (pending) {
        pending.removeAttribute("data-pending");
        pending.removeAttribute("aria-busy");
      }
      pending = clicked && clicked.isConnected ? clicked : null;
      clicked = null;
      if (pending) {
        pending.setAttribute("data-pending", "");
        pending.setAttribute("aria-busy", "true");
      }
      document.documentElement.setAttribute("data-navigating", "");
    };
    const done = () => {
      if (pending) {
        pending.removeAttribute("data-pending");
        pending.removeAttribute("aria-busy");
        pending = null;
      }
      document.documentElement.removeAttribute("data-navigating");
    };
    // cancelled: another link followed meanwhile, which is pending now
    const failed = (error) => {
      if (!(error && error.cancelled)) done();
    };

    // capture: before any handler of the page can stop it
    document.addEventListener("click", remember, true);
    Router.events.on("routeChangeStart", start);
    Router.events.on("routeChangeComplete", done);
    Router.events.on("routeChangeError", failed);
    Router.events.on("hashChangeStart", forget);
    return () => {
      document.removeEventListener("click", remember, true);
      Router.events.off("routeChangeStart", start);
      Router.events.off("routeChangeComplete", done);
      Router.events.off("routeChangeError", failed);
      Router.events.off("hashChangeStart", forget);
    };
  }, []);
}
