// client/components/Layout/Header.js
'use client';
import Link from 'next/link';
import { useState, useEffect,useRef } from 'react';
import { SearchIcon, CartIcon, UserIcon } from '@/components/icons/Icons';
import SearchCard from './SearchCard';
import { useAuth } from '@/hooks/use-auth';
import { useUserUpdate } from '@/hooks/use-user-update';
import { useCart } from '@/hooks/use-cart';
import { showCartOverview } from './CartOverviewToast';
import styles from './Header.module.css';

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const { user, logout } = useAuth();
  const { getAvatarUrl } = useUserUpdate();
  const { items, loading, syncStatus, getCartTotal } = useCart();

   const headerRef = useRef(null);
   const navCollapseRef = useRef(null);


  // 監控 items 狀態變化
  useEffect(() => {
    console.log('🛒 Header 接收到 items 更新:', {
      itemsLength: items.length,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
      })),
      timestamp: new Date().toLocaleTimeString(),
    });
  }, [items]);

  // 計算購物車商品總數量
  const cartCount = items.reduce((total, item) => total + item.quantity, 0);

  // 監控購物車數字變化
  useEffect(() => {
    console.log('🛒 Header 購物車數字更新:', {
      cartCount,
      itemsCount: items.length,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
      })),
      loading,
      syncStatus,
      timestamp: new Date().toLocaleTimeString(),
    });
  }, [cartCount, items, loading, syncStatus]);

  // 判斷是否顯示 loading 狀態（只在添加商品時顯示，不同步時顯示）
  const isCartLoading = loading && syncStatus !== 'syncing';

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);


  // 監聽點擊事件，當點擊 header 外部時關閉所有下拉選單
  useEffect(() => {
    const handleClickOutside = (event) => {
            // 檢查點擊是否在 header 或導航選單外部
      const isClickInsideHeader = headerRef.current && headerRef.current.contains(event.target);
      const isClickInsideNav = navCollapseRef.current && navCollapseRef.current.contains(event.target);
      
      if (!isClickInsideHeader && !isClickInsideNav) {
        // 關閉所有下拉選單
        setIsDropdownOpen(false);
        setIsUserMenuOpen(false);
        setIsNavOpen(false);
      }
    };

    // 處理滾動事件，滾動時關閉下拉選單
    const handleScroll = () => {
      setIsDropdownOpen(false);
      setIsUserMenuOpen(false);
      setIsNavOpen(false);
    };

     // 處理觸控離開事件（手機版）
    const handleTouchEnd = (event) => {
      const isClickInsideHeader = headerRef.current && headerRef.current.contains(event.target);
      const isClickInsideNav = navCollapseRef.current && navCollapseRef.current.contains(event.target);
      
      if (!isClickInsideHeader && !isClickInsideNav) {
        setIsDropdownOpen(false);
        setIsUserMenuOpen(false);
        setIsNavOpen(false);
      }
    };


    // 添加事件監聽器
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('scroll', handleScroll);

    // 清理事件監聽器
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);


  const toggleSearch = () => {
    if (isMounted) {
      setIsSearchOpen(!isSearchOpen);
    }
  };

  const toggleUserMenu = () => {
    if (isMounted) {
      setIsUserMenuOpen(!isUserMenuOpen);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  // 自動收起下拉選單
  const closeUserMenu = () => {
    setIsUserMenuOpen(false);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      closeUserMenu();
    } catch (error) {
      console.error('登出失敗:', error);
    }
  };

  // 處理購物車點擊事件
  const handleCartClick = (e) => {
    e.preventDefault();

    // 無論購物車是否為空，都顯示購物車概述 toast
    const totalPrice = getCartTotal();
    showCartOverview(items, totalPrice, cartCount);
  };

  // 如果組件還沒掛載，不渲染
  if (!isMounted) {
    return null;
  }

  return (
    <header>
      {/* 搜尋卡片組件 */}
      <SearchCard isOpen={isSearchOpen} onClose={toggleSearch} />

      <nav
        ref={headerRef}
        className={`navbar navbar-expand-lg ${styles.navbar} fixed-top px-4`}
      >
        <div className='container-fluid'>
          {/* Logo */}
          <Link className={`navbar-brand ${styles.navbarBrand}`} href='/'>
            <img
              src='/images/logo.svg'
              alt='Logo'
              className='d-inline-block align-text-top'
            />
          </Link>

          {/* 導航選單 */}
          <div
          ref={navCollapseRef}
            className={`${styles.navbarCollapse} ${
              isNavOpen ? styles.show : ''
            }`}
            id='navbarNav'
          >
            <ul className={`navbar-nav ${styles.navbarNav}`}>
              {/* 下拉選單 */}
              <li className='nav-item dropdown'>
                <Link
                  className={`nav-link dropdown-toggle ${styles.navLink}`}
                  href='/products'
                  id='allProductsDropdown'
                  onClick={toggleDropdown}
                  aria-expanded={isDropdownOpen}
                >
                  全站商品
                </Link>
                <ul
                  className={`dropdown-menu ${styles.dropdownMenu} ${
                    isDropdownOpen ? 'show' : ''
                  }`}
                  aria-labelledby='allProductsDropdown'
                  onMouseLeave={closeDropdown}
                >
                  <li>
                    <Link
                      className={`dropdown-item ${styles.dropdownItem}`}
                      href='/products?mcid=1'
                    >
                      古典樂
                    </Link>
                  </li>
                  <li>
                    <Link
                      className={`dropdown-item ${styles.dropdownItem}`}
                      href='/products?mcid=2'
                    >
                      爵士音樂
                    </Link>
                  </li>
                  <li>
                    <Link
                      className={`dropdown-item ${styles.dropdownItem}`}
                      href='/products?mcid=3'
                    >
                      西洋音樂
                    </Link>
                  </li>
                  <li>
                    <Link
                      className={`dropdown-item ${styles.dropdownItem}`}
                      href='/products?mcid=4'
                    >
                      華語專區
                    </Link>
                  </li>
                  <li>
                    <Link
                      className={`dropdown-item ${styles.dropdownItem}`}
                      href='/products?mcid=5'
                    >
                      日韓專區
                    </Link>
                  </li>
                  <li>
                    <Link
                      className={`dropdown-item ${styles.dropdownItem}`}
                      href='/products?mcid=6'
                    >
                      原聲帶
                    </Link>
                  </li>
                </ul>
              </li>

              <li className='nav-item'>
                <Link className={`nav-link ${styles.navLink}`} href='/coupons'>
                  優惠券專區
                </Link>
              </li>
              <li className='nav-item'>
                <Link className={`nav-link ${styles.navLink}`} href='/forums'>
                  黑膠交流區
                </Link>
              </li>
              <li className='nav-item'>
                <Link
                  className={`nav-link ${styles.navLink}`}
                  href='/Information'
                >
                  關於我們
                </Link>
              </li>
            </ul>
          </div>

          {/* 右側功能區塊 - 購物車、會員、搜尋和漢堡選單 */}
          <div
            className={`d-flex align-items-center ${styles.iconBlock} ${styles.iconBlockDesktop}`}
          >
            {/* 搜尋圖標 */}
            <button
              className={`${styles.searchIcon} me-2`}
              onClick={toggleSearch}
              type='button'
            >
              <SearchIcon width={20} height={20} fill='currentColor' />
            </button>

            {/* 購物車區塊 */}
            <div className={`${styles.cartWrapper} me-2`}>
              <button
                className={`${styles.navLink} ${
                  isCartLoading ? styles.cartLoading : ''
                }`}
                onClick={handleCartClick}
                type='button'
              >
                <CartIcon width={20} height={20} fill='currentColor' />
                {cartCount > 0 && (
                  <span
                    className={`${styles.cartBadge} ${
                      isCartLoading ? styles.cartBadgeLoading : ''
                    }`}
                  >
                    {isCartLoading ? '...' : cartCount}
                  </span>
                )}
              </button>
            </div>

            {/* 會員圖標 */}
            <div className='dropdown' style={{ position: 'relative' }}>
              <button
                className={`${styles.navLink} me-2`}
                onClick={toggleUserMenu}
                type='button'
                aria-expanded={isUserMenuOpen}
              >
                {user ? (
                  <img
                    src={getAvatarUrl(user.img)}
                    alt={user.name || '使用者頭像'}
                    className={styles.userAvatar}
                    onError={(e) => {
                      e.target.src = '/images/default-avatar.svg';
                    }}
                  />
                ) : (
                  <UserIcon width={20} height={20} fill='currentColor' />
                )}
              </button>
              <ul
                className={`dropdown-menu dropdown-menu-end ${
                  styles.dropdownMenu
                } ${isUserMenuOpen ? 'show' : ''}`}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '0.5rem',
                  minWidth: '150px',
                  width: 'auto',
                  zIndex: 1998,
                }}
                onMouseLeave={closeUserMenu}
              >
                {user ? (
                  <>
                    <li>
                      <Link
                        className={`dropdown-item ${styles.dropdownItem}`}
                        href='/users/panel'
                      >
                        會員中心
                      </Link>
                    </li>
                    <li>
                      <Link
                        className={`dropdown-item ${styles.dropdownItem}`}
                        href='/users/panel/favorites'
                      >
                        黑膠收藏
                      </Link>
                    </li>
                    <li>
                      <Link
                        className={`dropdown-item ${styles.dropdownItem}`}
                        href='/users/panel/orders'
                      >
                        訂單資訊
                      </Link>
                    </li>
                    <li>
                      <Link
                        className={`dropdown-item ${styles.dropdownItem}`}
                        href='/users/panel/coupons'
                      >
                        我的優惠券
                      </Link>
                    </li>
                    <li>
                      <Link
                        className={`dropdown-item ${styles.dropdownItem}`}
                        href='/users/panel/articles'
                      >
                        文章管理
                      </Link>
                    </li>
                    <li>
                      <hr className='dropdown-divider' />
                    </li>
                    <li>
                      <button
                        className={`dropdown-item ${styles.dropdownItem}`}
                        onClick={handleLogout}
                      >
                        登出
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link
                        className={`dropdown-item ${styles.dropdownItem}`}
                        href='/auth/login'
                      >
                        登入
                      </Link>
                    </li>
                    <li>
                      <Link
                        className={`dropdown-item ${styles.dropdownItem}`}
                        href='/auth/register'
                      >
                        註冊
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* 漢堡選單按鈕 */}
            <button
              className={`navbar-toggler ${styles.customToggler} d-lg-none`}
              type='button'
              aria-controls='navbarNav'
              aria-expanded={isNavOpen}
              aria-label='Toggle navigation'
              onClick={toggleNav}
            >
              <span
                className={`navbar-toggler-icon ${styles.navbarTogglerIcon}`}
              ></span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
