'use client';

import Sidebar from './Sidebar';
import UserPanelContent from './UserPanelContent';
import styles from './UserPanel.module.css';

export default function UserPanelLayout({ 
  pageTitle = '會員中心',
  children = null,
  headerButton = null
}) {
  return (
    <div className={styles.userContainer}>
      <div className="container">
        <div className="row">
          {/* 左側導航欄 */}
          <div className="col-lg-3 col-md-4">
            <Sidebar />
          </div>

          {/* 右側主要內容 */}
          <div className="col-lg-9 col-md-8">
            <UserPanelContent 
              pageTitle={pageTitle}
              headerButton={headerButton}
            >
              {children}
            </UserPanelContent>
          </div>
        </div>
      </div>
    </div>
  );
}
