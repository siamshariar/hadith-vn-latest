import MinusIcon from "../icons/Minus";
import PlusIcon from "../icons/Plus";
import CheckIcon from "../icons/Check";
import styles from "./controls.module.scss";

// The controls of the settings (components/settings, the settings dialog and page) and of the
// reading settings (components/hadith/ReaderSettings): one look for both. 44px targets.

// Limits of SettingsContext changeFontSize*.
export const ARABIC_SIZE = { min: 16, max: 60, step: 2 };
export const TRANSLATION_SIZE = { min: 12, max: 40, step: 1 };

// A label, then − value +: the value read out when it changes.
export function SizeStepper({ id, label, value, limits, onChange, decreaseLabel, increaseLabel }) {
  return (
    <div className={styles.row}>
      <span className={styles.label} id={id}>
        {label}
      </span>
      <div className={styles.stepper} role="group" aria-labelledby={id}>
        <button
          type="button"
          className={styles.stepButton}
          onClick={() => onChange(Math.max(limits.min, value - limits.step))}
          disabled={value <= limits.min}
          aria-label={decreaseLabel}
          title={decreaseLabel}
        >
          <MinusIcon />
        </button>
        <output className={styles.stepValue} aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className={styles.stepButton}
          onClick={() => onChange(Math.min(limits.max, value + limits.step))}
          disabled={value >= limits.max}
          aria-label={increaseLabel}
          title={increaseLabel}
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}

// A native checkbox as a switch: the checkbox covers the whole row (the tap target, invisible),
// the switch drawn beside the words.
export function SwitchRow({ label, checked, onChange }) {
  return (
    <label className={`${styles.row} ${styles.switchRow}`}>
      <span className={styles.label}>{label}</span>
      <input type="checkbox" role="switch" className={styles.switchInput} checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className={styles.switch} aria-hidden="true" />
    </label>
  );
}

// Two to four choices side by side (radio buttons): `options` [{ value, label, icon? }].
export function Segmented({ name, legend, options, value, onChange, hideLegend = false }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={hideLegend ? styles.visuallyHidden : styles.legend}>{legend}</legend>
      <div className={styles.segmented} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <label key={option.value} className={styles.segment}>
            <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
            <span>
              {option.icon}
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// The faces to choose from (lib/settings fonts), each shown in itself: `sample` is the text
// drawn in the face (the face's own name when there is none). Radio buttons in tiles, two to a
// row where there is room; the chosen one ringed in the accent with a check.
export function FontChoices({ name, legend, fonts, stacks, value, onChange, sample, rtl = false }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.tiles}>
        {fonts.map((font) => {
          const checked = value === font.familyName;
          return (
            <label key={font.familyName} className={`${styles.tile} ${checked ? styles.tileChecked : ""}`}>
              <input type="radio" name={name} value={font.familyName} checked={checked} onChange={() => onChange(font.familyName)} />
              <span className={styles.tileText}>
                {sample ? (
                  <span className={styles.tileSample} lang={rtl ? "ar" : undefined} dir={rtl ? "rtl" : undefined} style={{ fontFamily: stacks[font.familyName] }} aria-hidden="true">
                    {sample}
                  </span>
                ) : null}
                <span className={sample ? styles.tileName : styles.tileNameSelf} style={sample ? undefined : { fontFamily: stacks[font.familyName] }}>
                  {font.displayName}
                </span>
              </span>
              <span className={styles.tileMark} aria-hidden="true">
                {checked && <CheckIcon />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
