import { useLocale } from "../../contexts/LocaleContext";
import TextPage from "./TextPage";
import { EmailLinks } from "./about";

export default function ContactContent() {
  const { t } = useLocale();
  return (
    <TextPage title={t("contact")}>
      <p>{t("contactText")}</p>
      <EmailLinks />
    </TextPage>
  );
}
