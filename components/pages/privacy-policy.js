import { useLocale } from "../../contexts/LocaleContext";
import TextPage from "./TextPage";

export default function PrivacyPolicyContent() {
  const { t } = useLocale();
  return (
    <TextPage title={t("privacyPolicy")}>
      <p>{t("privacyText")}</p>
    </TextPage>
  );
}
