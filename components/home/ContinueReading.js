import { useContext } from "react";
import { PinContext } from "../../contexts/PinContext";
import { useLocale } from "../../contexts/LocaleContext";
import useNames from "../../hooks/useNames";
import { isCurrentStoredRef, storedRefHref, storedRefLabel, storedRefSource } from "../../lib/hadith";
import AutoStoriesIcon from "../icons/AutoStories";
import EntryCard from "./EntryCard";

// "Continue reading": the last hadith read in this browser (PinContext,
// localStorage). The context fills it after mounting, so the card never
// shows in the server HTML and appears only when there is an entry. The
// book is named in the reader's language (lib/names). The home page's other
// cards take its form (components/home/EntryCard).
export default function ContinueReading() {
  const { t, lang } = useLocale();
  const pins = useContext(PinContext);
  const names = useNames(lang);
  const entry = pins && pins.lastRead ? pins.lastRead.find(isCurrentStoredRef) : null;
  if (!entry) return null;

  const label = storedRefLabel(entry, names, t("topicCollection"));
  const source = storedRefSource(entry, names, t("topicCollection"));
  return (
    <EntryCard
      href={storedRefHref(entry)}
      icon={<AutoStoriesIcon />}
      label={t("continueReading")}
      title={label}
      titleDir="auto"
      note={source && source !== label ? source : null}
    />
  );
}
