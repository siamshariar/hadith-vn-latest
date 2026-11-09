"use client";

import { useEffect, useState } from "react";
import { useLocale } from "../../contexts/LocaleContext";
import { copyText } from "../../lib/clipboard";
import Dialog from "./Dialog";
import LinkIcon from "../icons/Link";
import CheckIcon from "../icons/Check";

import {
  EmailShareButton,
  EmailIcon,
  FacebookShareButton,
  FacebookIcon,
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

// Where a browser has no share sheet of its own (navigator.share; components/content/HadithOptions
// uses that where there is one): the site's dialog with the hadith's citation (`label`), its link
// to copy, then the services, each with its name under its icon. `title`: the text the services
// put with the link.
export default function Share({ open, closer, url, title, label }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (copied === null) return undefined;
    const timer = window.setTimeout(() => setCopied(null), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = () => copyText(url).then((ok) => setCopied(ok));
  const done = closer(false);

  const services = [
    { name: t("email"), Button: EmailShareButton, Icon: EmailIcon, props: { subject: title } },
    { name: "Facebook", Button: FacebookShareButton, Icon: FacebookIcon },
    { name: "X (Twitter)", short: "X", Button: TwitterShareButton, Icon: TwitterIcon, props: { title } },
    { name: "WhatsApp", Button: WhatsappShareButton, Icon: WhatsappIcon, props: { title } },
    { name: "Telegram", Button: TelegramShareButton, Icon: TelegramIcon, props: { title } },
    { name: "LinkedIn", Button: LinkedinShareButton, Icon: LinkedinIcon, props: { title } },
    { name: "Viber", Button: ViberShareButton, Icon: ViberIcon, props: { title } },
    { name: "LINE", Button: LineShareButton, Icon: LineIcon, props: { title } },
    { name: "Reddit", Button: RedditShareButton, Icon: RedditIcon, props: { title } },
    { name: "Tumblr", Button: TumblrShareButton, Icon: TumblrIcon, props: { title } },
  ];

  return (
    <Dialog open={open} onClose={done} title={t("shareHadith")} description={label}>
      <div className={styles.link}>
        <input
          className={styles.url}
          type="text"
          readOnly
          value={url}
          aria-label={t("copyLink")}
          onFocus={(event) => event.target.select()}
        />
        <button type="button" className={`${styles.copy} ${copied ? styles.copied : ""}`} onClick={copy}>
          {copied ? <CheckIcon /> : <LinkIcon />}
          <span>{copied ? t("copied") : t("copyLink")}</span>
        </button>
      </div>
      <p className={styles.status} role="status">
        {copied === false ? t("copyFailed") : ""}
      </p>

      <ul className={styles.services}>
        {services.map(({ name, short, Button, Icon, props = {} }) => (
          <li key={name}>
            <Button className={styles.service} aria-label={name} url={url} onShareWindowClose={done} resetButtonStyle {...props}>
              <Icon size={44} round />
              <span aria-hidden="true">{short || name}</span>
            </Button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
