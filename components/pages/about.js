import { Fragment } from "react";
import Link from "next/link";
import { useLocale } from "../../contexts/LocaleContext";
import TextPage from "./TextPage";
import { site } from "../../lib/sites";

export const DEENI_URL = "http://deeniinfotech.com";
// The deployment's contact address, then Deeni Info Tech's
const EMAILS = [...new Set([site.contactEmail, "deeniinfotech@gmail.com"])];

// "Email: a@b | c@d" as mailto links (about, contact, support pages).
export function EmailLinks({ emails = EMAILS }) {
  const { t } = useLocale();
  return (
    <p>
      {t("labelColon", { label: t("email") })}{" "}
      {emails.map((email, index) => (
        <Fragment key={email}>
          {index > 0 && " | "}
          <a href={`mailto:${email}`}>{email}</a>
        </Fragment>
      ))}
    </p>
  );
}

export default function AboutContent() {
  const { t } = useLocale();
  return (
    <TextPage title={t("about")}>
      <p>
        {t("aboutApp")} {t("siteTagline")}
      </p>
      <p>
        {t("aboutMethod")} <Link href="/sources">{t("dataAndMethod")}</Link>.
      </p>
      <p>
        {t("poweredBy")}{" "}
        <a href={DEENI_URL} target="_blank" rel="noopener noreferrer">
          Deeni Info Tech
        </a>
        : {t("aboutDeeni")}
      </p>
      <EmailLinks />
    </TextPage>
  );
}
