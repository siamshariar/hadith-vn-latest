import { useId } from "react";
import Modal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import CloseIcon from "../icons/Close";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./Dialog.module.scss";

// The site's one dialog (docs/hadith-design-system.md, "Dialogs"): the title and a close button,
// then a line that says what it is about (`description`), the content (`children`, which scrolls
// when it is long) and the buttons (`actions`, DialogButton: the safe one first, the one that
// acts last). Centred on the web, `size` "sm" (a question) or "md" (a list, the settings); on
// phones a sheet from the bottom of the screen, the buttons side by side across it.
// `flush`: content that has its own padding (rows that light up to the panel's edges).
// MUI's Modal keeps the focus inside, closes on Esc and on the backdrop, and gives it back to
// what opened it.
export default function Dialog({ open, onClose, title, description, size = "md", flush = false, actions, children, className = "" }) {
  const { t } = useLocale();
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition slotProps={{ backdrop: { className: styles.backdrop, timeout: 200 } }}>
      <Fade in={open} timeout={200}>
        <div
          className={`${styles.panel} ${styles[size] || ""} ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
        >
          <div className={styles.head}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label={t("close")} title={t("close")}>
              <CloseIcon />
            </button>
          </div>
          {description && (
            <p id={descriptionId} className={styles.description}>
              {description}
            </p>
          )}
          {children && <div className={`${styles.body} ${flush ? styles.flush : ""}`}>{children}</div>}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      </Fade>
    </Modal>
  );
}

// "primary" (go ahead, the accent), "danger" (delete, the error colour), "secondary" (cancel).
export const dialogButtonClass = (variant = "secondary") => `${styles.button} ${styles[variant] || ""}`;

export function DialogButton({ variant = "secondary", className = "", type = "button", ...props }) {
  return <button type={type} className={`${dialogButtonClass(variant)} ${className}`} {...props} />;
}
