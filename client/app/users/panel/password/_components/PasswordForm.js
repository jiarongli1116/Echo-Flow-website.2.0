'use client';

import { useRef, useState } from 'react';
import { usePassword } from '@/hooks/use-password';
import PasswordInput from './PasswordInput';
import PasswordStrength from './PasswordStrength';
import styles from '@/app/users/panel/_components/UserPanel.module.css';

const PasswordForm = () => {
  const currentPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const { 
    isLoading, 
    error, 
    success, 
    validateForm, 
    changePassword, 
    clearMessages 
  } = usePassword();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // 清除該欄位的錯誤訊息
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // 清除成功/錯誤訊息
    if (success || error) {
      clearMessages();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 驗證表單
    const validationError = validateForm(
      formData.currentPassword,
      formData.newPassword,
      formData.confirmPassword
    );

    if (validationError) {
      // 根據錯誤類型設置對應欄位的錯誤
      if (validationError.includes('目前密碼')) {
        setFieldErrors(prev => ({ ...prev, currentPassword: validationError }));
      } else if (validationError.includes('新密碼')) {
        setFieldErrors(prev => ({ ...prev, newPassword: validationError }));
      } else if (validationError.includes('確認密碼')) {
        setFieldErrors(prev => ({ ...prev, confirmPassword: validationError }));
      }
      return;
    }

    // 清除所有欄位錯誤
    setFieldErrors({});

    // 提交表單
    const result = await changePassword(formData.currentPassword, formData.newPassword);
    
    if (result.success) {
      // 清空表單
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // 清空 refs
      if (currentPasswordRef.current) currentPasswordRef.current.value = '';
      if (newPasswordRef.current) newPasswordRef.current.value = '';
      if (confirmPasswordRef.current) confirmPasswordRef.current.value = '';
    }
  };

  return (
    <div className={styles.passwordForm}>
      {/* 提示訊息區域 - 放在表單上方 */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {success && (
        <div className={styles.successMessage}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 目前密碼 */}
        <PasswordInput
          ref={currentPasswordRef}
          label="目前密碼"
          placeholder="請輸入目前密碼"
          required
          error={fieldErrors.currentPassword}
          value={formData.currentPassword}
          onChange={(e) => handleInputChange('currentPassword', e.target.value)}
        />

        {/* 新密碼 */}
        <PasswordInput
          ref={newPasswordRef}
          label="新密碼"
          placeholder="請輸入新密碼"
          required
          error={fieldErrors.newPassword}
          value={formData.newPassword}
          onChange={(e) => handleInputChange('newPassword', e.target.value)}
        />

        {/* 密碼強度指示器 */}
        <PasswordStrength password={formData.newPassword} />

        {/* 確認新密碼 */}
        <PasswordInput
          ref={confirmPasswordRef}
          label="確認新密碼"
          placeholder="請再次輸入新密碼"
          required
          error={fieldErrors.confirmPassword}
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
        />

        {/* 提交按鈕 */}
        <div className={styles.passwordFormGroup}>
          <button 
            type="submit" 
            className={styles.passwordFormButton}
            disabled={isLoading}
          >
            {isLoading ? '修改中...' : '修改密碼'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordForm;
