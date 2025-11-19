export interface PasswordStrength {
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  feedback: string[];
  isValid: boolean;
}

export const validatePasswordStrength = (
  password: string
): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Check for numbers
  if (!/\d/.test(password)) {
    feedback.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Check for special characters
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    feedback.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Bonus points for length
  if (password.length >= 12) {
    score += 1;
  }

  // Cap score at 4
  score = Math.min(score, 4);

  const isValid = score >= 4 && feedback.length === 0;

  return {
    score,
    feedback,
    isValid,
  };
};

export const getPasswordStrengthLabel = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return 'Very Weak';
    case 2:
      return 'Weak';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    default:
      return 'Very Weak';
  }
};

export const getPasswordStrengthColor = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return 'var(--color-error-500)';
    case 2:
      return 'var(--color-warning-500)';
    case 3:
      return 'var(--color-info-500)';
    case 4:
      return 'var(--color-success-500)';
    default:
      return 'var(--color-error-500)';
  }
};

// Utility function for apps to check if password is valid without needing to know the scoring system
export const isPasswordValid = (password: string): boolean => {
  return validatePasswordStrength(password).isValid;
};
