"use client";

import Modal from "@mui/material/Modal";
import Backdrop from "@mui/material/Backdrop";
import Fade from "@mui/material/Fade";
import CloseIcon from "../icons/Close";
import { useLocale } from "../../contexts/LocaleContext";

import {
  EmailShareButton,
  EmailIcon,
  FacebookShareButton,
  FacebookIcon,
  FacebookMessengerShareButton,
  FacebookMessengerIcon,
  TwitterShareButton,
  TwitterIcon,
  LinkedinShareButton,
  LinkedinIcon,
  WhatsappShareButton,
  WhatsappIcon,
  LineShareButton,
  LineIcon,
  TelegramShareButton,
  TelegramIcon,
  ViberShareButton,
  ViberIcon,
  RedditShareButton,
  RedditIcon,
  TumblrShareButton,
  TumblrIcon,
} from "react-share";

import styles from "./share.module.scss";

export default function Share({ open, closer, url, title }) {
  const { t } = useLocale();
  return (
    <Modal
      open={open}
      onClose={closer(false)}
      className={styles.root}
      aria-labelledby="share-title"
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 100,
        classes: {
          root: styles.backdrop,
        },
      }}
    >
      <Fade in={open} timeout={100} style={{ transitionDelay: "0ms" }}>
        <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="share-title">
          <button type="button" className={styles.close} onClick={closer(false)} aria-label={t("close")} title={t("close")}>
            <CloseIcon />
          </button>

          <h2 id="share-title" className={styles.title}>
            {t("shareHadith")}
          </h2>

          <div className={styles.lists}>
            <div className={styles.item}>
              <EmailShareButton
                aria-label={t("email")}
                url={url}
                onShareWindowClose={closer(false)}
                subject={title}
              >
                <EmailIcon size={32} round={true} />
              </EmailShareButton>
            </div>

            <div className={styles.item}>
              <FacebookShareButton aria-label="Facebook" url={url} onShareWindowClose={closer(false)}>
                <FacebookIcon size={32} round={true} />
              </FacebookShareButton>
            </div>

            <div className={styles.item}>
              <TwitterShareButton
                aria-label="X (Twitter)"
                url={url}
                onShareWindowClose={closer(false)}
                title={title}
              >
                <TwitterIcon size={32} round={true} />
              </TwitterShareButton>
            </div>

            <div className={styles.item}>
              <LinkedinShareButton
                aria-label="LinkedIn"
                url={url}
                onShareWindowClose={closer(false)}
                title={title}
              >
                <LinkedinIcon size={32} round={true} />
              </LinkedinShareButton>
            </div>

            <div className={styles.item}>
              <WhatsappShareButton
                aria-label="WhatsApp"
                url={url}
                onShareWindowClose={closer(false)}
                title={title}
              >
                <WhatsappIcon size={32} round={true} />
              </WhatsappShareButton>
            </div>

            <div className={styles.item}>
              <LineShareButton
                aria-label="LINE"
                url={url}
                onShareWindowClose={closer(false)}
                title={title}
              >
                <LineIcon size={32} round={true} />
              </LineShareButton>
            </div>

            <div className={styles.item}>
              <TelegramShareButton
                aria-label="Telegram"
                url={url}
                onShareWindowClose={closer(false)}
                title={title}
              >
                <TelegramIcon size={32} round={true} />
              </TelegramShareButton>
            </div>

            <div className={styles.item}>
              <ViberShareButton
                aria-label="Viber"
                url={url}
                onShareWindowClose={closer(false)}
                title={title}
              >
                <ViberIcon size={32} round={true} />
              </ViberShareButton>
            </div>

            <div className={styles.item}>
              <RedditShareButton
                aria-label="Reddit"
                url={url}
                onShareWindowClose={closer(false)}
                title={title}
              >
                <RedditIcon size={32} round={true} />
              </RedditShareButton>
            </div>

            <div className={styles.item}>
              <TumblrShareButton
                aria-label="Tumblr"
                url={url}
                onShareWindowClose={closer(false)}
                title={title}
              >
                <TumblrIcon size={32} round={true} />
              </TumblrShareButton>
            </div>
          </div>
        </div>
      </Fade>
    </Modal>
  );
}
