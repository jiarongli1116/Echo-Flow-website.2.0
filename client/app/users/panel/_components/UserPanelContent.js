'use client';

import { useState, useEffect } from 'react';
import styles from './UserPanel.module.css';

export default function UserPanelContent({ 
  pageTitle = '會員中心',
  children = null,
  headerButton = null
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className={styles.mainContent}>
      <div className={styles.pageHeader}>
        <h3 className={styles.pageTitle}>{pageTitle}</h3>
        {headerButton && (
          <div className={styles.headerButton}>
            {headerButton}
          </div>
        )}
      </div>
      
      {/* 自定義內容 */}
      {children}
    </div>
  );
}
