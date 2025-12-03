'use client';

import { forwardRef, useState, useCallback } from 'react';
import PasswordToggle from '@/app/auth/_components/PasswordToggle';
import styles from '@/app/users/panel/_components/UserPanel.module.css';

const PasswordInput = forwardRef(({ 
  label, 
  placeholder, 
  required = false, 
  error, 
  className = '',
  ...props 
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <div className={`${styles.passwordFormGroup} ${className}`}>
      <label className={styles.passwordLabel}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <div className={styles.passwordInputWrapper}>
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={`${styles.passwordInput} ${error ? styles.inputError : ''}`}
          placeholder={placeholder}
          {...props}
        />
        <PasswordToggle 
          inputRef={ref}
          width={22}
          height={16}
          showPassword={showPassword}
          onToggle={handleTogglePassword}
        />
      </div>
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
