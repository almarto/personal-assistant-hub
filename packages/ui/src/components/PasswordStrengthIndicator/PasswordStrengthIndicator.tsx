import React from 'react';

import styles from './PasswordStrengthIndicator.module.css';
import {
  validatePasswordStrength,
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
} from './passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator: React.FC<
  PasswordStrengthIndicatorProps
> = ({ password }) => {
  if (!password) {
    return null;
  }

  const strength = validatePasswordStrength(password);
  const strengthColor = getPasswordStrengthColor(strength.score);
  const strengthLabel = getPasswordStrengthLabel(strength.score);

  return (
    <div className={styles.container}>
      <div className={styles.strengthBar}>
        <div className={styles.strengthBarTrack}>
          <div
            className={styles.strengthBarFill}
            style={{
              width: `${(strength.score / 4) * 100}%`,
              backgroundColor: strengthColor,
            }}
          />
        </div>
        <span className={styles.strengthLabel} style={{ color: strengthColor }}>
          {strengthLabel}
        </span>
      </div>

      {strength.feedback.length > 0 && (
        <ul className={styles.feedback}>
          {strength.feedback.map((item, index) => (
            <li key={index} className={styles.feedbackItem}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
