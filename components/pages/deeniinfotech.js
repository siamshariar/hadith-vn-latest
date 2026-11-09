import { useLocale } from "../../contexts/LocaleContext";
import TextPage from "./TextPage";
import { DEENI_URL, EmailLinks } from "./about";

export default function DeeniinfotechContent() {
  const { t } = useLocale();
  return (
    <TextPage title={"Deeni Info Tech"}>
      <p>
        <a href={DEENI_URL} target="_blank" rel="noopener noreferrer">
          Deeni Info Tech
        </a>
        {t("labelColon", { label: "" })} {t("deeniText")}
      </p>
      <p>
        {t("labelColon", { label: t("website") })}{" "}
        <a href={DEENI_URL} target="_blank" rel="noopener noreferrer">
          www.DeeniInfoTech.com
        </a>
      </p>
      <EmailLinks emails={["deeniinfotech@gmail.com"]} />
    </TextPage>
  );
}
