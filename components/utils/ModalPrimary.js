import { useId } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import CloseIcon from "../icons/Close";
import { useLocale } from "../../contexts/LocaleContext";
import styles from "./ModalPrimary.module.scss";
import css from "../core/scrollbar.module.scss";

// A floating layer: the surface, a hairline edge, the radius of sheets and the one
// shadow the system allows (docs/hadith-design-system.md).
const style = {
  wrapper: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 500,
    height: 500,
    maxHeight: "85vh",
    maxWidth: "85vw",
    bgcolor: "var(--surface)",
    border: "1px solid var(--hairline)",
    borderRadius: "var(--radius-xl)",
    boxShadow: "var(--shadow-float)",
    overflow: "hidden",
    p: 0,
    paddingTop: 1,
    paddingBottom: 1,
  },
};

const PrimaryModal = ({ open, closer, title, content }) => {
  const { t } = useLocale();
  const titleId = useId();
  const handleClose = (e) => {
    closer(false)(e);
  };

  // MUI's Modal traps focus and closes on Esc; the dialog role and its name sit
  // on the panel itself (the Modal root is only a presentation layer).
  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style.wrapper} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
        <div className={`${css.scrollbar} ${styles.scrollbar}`}>
          <Typography variant="h6" component="div">
            <div className={styles.header}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              <button type="button" className={styles.close} onClick={(e) => handleClose(e)} aria-label={t("close")}>
                <CloseIcon />
              </button>
            </div>
          </Typography>
          <Typography component="div">{content}</Typography>
        </div>
      </Box>
    </Modal>
  );
};

export default PrimaryModal;
