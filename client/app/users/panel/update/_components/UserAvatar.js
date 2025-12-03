//用於顯示和更新用戶頭像
import { useRef } from 'react';
import styles from '@/app/users/panel/_components/UserPanel.module.css';

export const UserAvatar = ({ 
  avatarUrl, 
  onAvatarClick, 
  onFileChange, 
  isUploading 
}) => {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.avatarSection}>
      <div className={styles.avatarContainer}>
        <img
          src={avatarUrl}
          alt="用戶頭像"
          className={styles.userAvatar}
          onError={(e) => {
            e.target.src = '/images/default-avatar.svg';
          }}
        />
      </div>
      <button 
        className={styles.changeAvatarBtn}
        onClick={handleClick}
        disabled={isUploading}
        style={{ 
          opacity: isUploading ? 0.6 : 1,
          cursor: isUploading ? 'not-allowed' : 'pointer'
        }}
      >
        {isUploading ? '上傳中...' : '更換頭像'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};
