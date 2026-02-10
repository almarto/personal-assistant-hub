import clsx from "clsx";

import styles from "./CheckboxChip.module.css";

interface CheckboxChipOption<T extends string> {
  value: T;
  label: string;
}

interface CheckboxChipGroupProps<T extends string> {
  options: CheckboxChipOption<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
  className?: string;
}

export function CheckboxChipGroup<T extends string>({
  options,
  selected,
  onChange,
  className,
}: CheckboxChipGroupProps<T>) {
  const handleToggle = (value: T, checked: boolean) => {
    if (checked) {
      onChange([...selected, value]);
    } else {
      onChange(selected.filter((v) => v !== value));
    }
  };

  return (
    <div className={clsx(styles.group, className)}>
      {options.map((option) => {
        const isChecked = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={clsx(styles.chip, isChecked && styles.chipChecked)}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => handleToggle(option.value, e.target.checked)}
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
