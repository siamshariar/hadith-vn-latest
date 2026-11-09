import { useLocale } from "../../contexts/LocaleContext";
import TextPage from "./TextPage";

export default function GratefulContent() {
  const { t } = useLocale();
  return (
    <TextPage title={t("grateful")}>
      <p>{t("gratefulText")}</p>
    </TextPage>
  );
}
