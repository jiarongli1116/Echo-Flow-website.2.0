'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './UserPanel.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState({});

  const menuItems = [
    {
      category: '會員專區',
      items: [
        { id: 'profile', label: '會員中心', href: '/users/panel' },
        { id: 'update', label: '基本資料修改', href: '/users/panel/update' },
        { id: 'addresses', label: '地址管理', href: '/users/panel/addresses' },
        { id: 'password', label: '修改密碼', href: '/users/panel/password' },
        { id: 'points', label: '紅利點數紀錄', href: '/users/panel/points/history' }
      ]
    },
    {
      category: '訂單與收藏',
      items: [
        { id: 'favorites', label: '我的黑膠收藏', href: '/users/panel/favorites' },
        { id: 'orders', label: '訂單資訊', href: '/users/panel/orders' }
      ]
    },
    {
      category: '專屬優惠',
      items: [
        { id: 'coupons', label: '我的優惠券', href: '/users/panel/coupons' }
      ]
    },
    {
      category: '文章管理',
      items: [
        { id: 'articles', label: '我的文章', href: '/users/panel/articles' },
        { id: 'bookmarks', label: '我的收藏', href: '/users/panel/articles/bookmarks' },
        { id: 'liked', label: '喜愛的文章', href: '/users/panel/articles/liked' },
        { id: 'following', label: '我的追蹤', href: '/users/panel/articles/following' }
      ]
    }
  ];

  // 檢查當前路徑是否為指定項目的路徑
  const isActive = (href) => {
    if (!href) return false;
    
    // 特殊處理：會員中心頁面（精確匹配）
    if (href === '/users/panel') {
      return pathname === '/users/panel';
    }
    
    // 對於其他頁面，檢查路徑是否匹配
    return pathname === href;
  };

  // 切換菜單部分的展開/收起狀態
  const toggleSection = (sectionIndex) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionIndex]: !prev[sectionIndex]
    }));
  };

  return (
    <div className={styles.sidebar}>
      <nav className={styles.sidebarNav}>
        {menuItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className={styles.menuSection}>
            <div 
              className={styles.menuSectionHeader}
              onClick={() => toggleSection(sectionIndex)}
            >
              <h6 className={styles.menuSectionTitle}>{section.category}</h6>
            </div>
            <ul className={`${styles.menuList} ${expandedSections[sectionIndex] ? styles.expanded : ''}`}>
              {section.items.map((item) => (
                <li key={item.id} className={`${styles.menuItem} ${isActive(item.href) ? styles.active : ''}`}>
                  <Link href={item.href} className={styles.menuLink}>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
