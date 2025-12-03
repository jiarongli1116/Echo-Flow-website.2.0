'use client';

import { useMemo } from 'react';
import styles from '@/app/users/panel/_components/UserPanel.module.css';

const PasswordStrength = ({ password }) => {
  const strength = useMemo(() => {
    if (!password) return { level: 0, text: '', color: '' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      letters: /[a-zA-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[@$!%*?&]/.test(password),
    };

    score += checks.length ? 1 : 0;
    score += checks.letters ? 1 : 0;
    score += checks.numbers ? 1 : 0;
    score += checks.special ? 1 : 0;

    if (score <= 1) return { level: 1, text: '很弱', color: '#ef4444' };
    if (score <= 2) return { level: 2, text: '弱', color: '#f97316' };
    if (score <= 3) return { level: 3, text: '中等', color: '#eab308' };
    if (score <= 4) return { level: 4, text: '強', color: '#22c55e' };
    return { level: 5, text: '很強', color: '#16a34a' };
  }, [password]);

  if (!password) return null;

  return (
    <div className={styles.passwordStrength}>
      <div className={styles.strengthBar}>
        <div 
          className={styles.strengthFill}
          style={{ 
            width: `${(strength.level / 5) * 100}%`,
            backgroundColor: strength.color 
          }}
        />
      </div>
      <span 
        className={styles.strengthText}
        style={{ color: strength.color }}
      >
        密碼強度: {strength.text}
      </span>
    </div>
  );
};

export default PasswordStrength;
