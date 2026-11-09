import { useLocale } from "../../contexts/LocaleContext";
import TextPage from "./TextPage";
import { EmailLinks } from "./about";

export default function SupportContent() {
  const { t } = useLocale();
  return (
    <TextPage title={t("support")}>
      <p>{t("supportText")}</p>
      <EmailLinks />
    </TextPage>
  );
}
