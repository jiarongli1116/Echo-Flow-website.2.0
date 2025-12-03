'use client'

import styles from './UserEdit.module.css'

export const UserEditActionButtons = ({ 
  isModified, 
  isSaving, 
  onSave, 
  onCancel, 
  onReset 
}) => {
  return (
    <div className={styles.buttonGroup}>
      <button 
        className={styles.btnSave} 
        onClick={onSave}
        disabled={isSaving || !isModified}
      >
        {isSaving ? '儲存中...' : '儲存'}
      </button>
      
      {isModified && (
        <>
          <button 
            className={styles.btnCancel} 
            onClick={onCancel}
            disabled={isSaving}
          >
            取消
          </button>
          <button 
            className={styles.btnReset} 
            onClick={onReset}
            disabled={isSaving}
          >
            重置
          </button>
        </>
      )}
    </div>
  )
}
