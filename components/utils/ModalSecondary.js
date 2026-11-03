import { useEffect, useId, useRef } from "react";
import Container from "../core/container";
import BackIcon from "../icons/NavigateBefore";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./ModalSecondary.module.scss";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

// The phone's full-screen panels (categories, settings): a dialog. Opening moves
// focus to Back and closing returns it where it was; Esc closes; Tab stays inside.
// A closed panel is inert, so it is out of the tab order and the accessibility
// tree at once, before its fade has finished (set on the element: React 18 and 19
// disagree about the attribute).
export default function Modal({ children, open, controller, title }) {
  const { t } = useLocale();
  const titleId = useId();
  const panel = useRef(null);
  const back = useRef(null);

  useEffect(() => {
    if (panel.current) panel.current.inert = !open;
    if (!open) return undefined;
    let opener = document.activeElement;
    let timer = 0;
    const focusBack = () => back.current && back.current.focus();
    // Focus that lands outside while the panel is open is brought back in, a tick
    // later: the phone menu's drawer, closing behind the panel, hands focus to the
    // menu button while its own focus trap is still attached. That button is then
    // where focus returns. Focus inside a layer on top (a select's menu) stays.
    const keepFocus = (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !panel.current) return;
      if (panel.current.contains(target) || target.closest(".MuiModal-root")) return;
      opener = target;
      window.clearTimeout(timer);
      timer = window.setTimeout(focusBack, 0);
    };
    const frame = window.requestAnimationFrame(focusBack);
    document.addEventListener("focusin", keepFocus);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      document.removeEventListener("focusin", keepFocus);
      if (opener && opener.isConnected && typeof opener.focus === "function") opener.focus();
    };
  }, [open]);

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      controller(false)(event);
      return;
    }
    if (event.key !== "Tab" || !panel.current) return;
    const items = [...panel.current.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={panel}
      className={open ? `${styles.modal} ${styles.open}` : styles.modal}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
    >
      <div className={styles.header}>
        <Container>
          <div className={styles.header_inner}>
            <button
              ref={back}
              type="button"
              className={styles.icon}
              onClick={controller(false)}
              aria-label={t("goBack")}
              title={t("goBack")}
            >
              <BackIcon />
            </button>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
          </div>
        </Container>
      </div>

      <div className={styles.content}>
        <div className={styles.content_inner}>{children}</div>
      </div>
    </div>
  );
}
