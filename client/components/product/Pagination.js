'use client'

// 導入next提供的路由勾子來進行導航
import { useRouter, usePathname } from 'next/navigation'
import styles from './Pagination.module.css'

export default function Pagination({ page = 1, totalPages = 1, paginationColor = "#E6C068"}) {
  // 定義路由器
  const router = useRouter()
  // 獲得目前的路徑
  const pathname = usePathname()
  // 代表有下一頁
  const hasNextPage = page < totalPages
  // 代表有上一頁
  const hasPreviousPage = page > 1
  // 計算要顯示的頁碼範圍
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);

    // 生成頁碼陣列
    const pageNumbers = []
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
    }

  // 導航到特定頁碼
  const handleChangePage = (newPage) => {
    // 獲得目前的搜尋字串
    const params = new URLSearchParams(window.location.search)
    params.set('page', newPage)
    // 導向新頁數(用replace取代目前網址的方式，用push可以在瀏覽器上用前進後退按鈕切換)
    router.replace(`${pathname}?${params.toString()}`)
  }
  
  return (
    <>
      <nav aria-label="..." className={`pagination-nav ${styles.paginationNav}`}>
        <ul className={`pagination ${styles.pagination}`} style={{ 
              '--pagination-color': paginationColor // CSS 變數
            }}>
          {/* 第一頁按鈕 */}
          <li 
            className={`page-item ${styles.pageItem}`} 
            onClick={() => handleChangePage(1)}
            style={{ cursor: 'pointer' }}
          >
            <span className={`page-link ${styles.pageLink}`}>
              <i className="fa-solid fa-backward-step" />
            </span>
          </li>

          {/* 上一頁按鈕 */}
          <li 
            className={`page-item ${styles.pageItem} ${!hasPreviousPage ? styles.pageItemDisabled : ''}`}
            onClick={() => {
              const newPage = page > 1 ? page - 1 : 1
              handleChangePage(newPage)
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className={`page-link ${styles.pageLink}`}>
              <i className="fa-solid fa-angle-left" />
            </span>
          </li>

          {/* 頁碼範圍 */}
          {pageNumbers.map(pageNumber => (
            <li 
              key={pageNumber}
              className={`page-item ${styles.pageItem} ${pageNumber === page ? `active ${styles.pageItemActive}` : ''}`}
              onClick={() => handleChangePage(pageNumber)}
              style={{ cursor: 'pointer' }}
            >
              <span className={`page-link ${styles.pageLink}`}>
                {pageNumber}
              </span>
            </li>
          ))}

                    {/* 下一頁按鈕 */}
                    <li
                        className={`page-item ${styles.pageItem} ${
                            !hasNextPage ? styles.pageItemDisabled : ''
                        }`}
                        onClick={() => {
                            const newPage =
                                page < totalPages ? page + 1 : totalPages
                            handleChangePage(newPage)
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <span className={`page-link ${styles.pageLink}`}>
                            <i className="fa-solid fa-angle-right" />
                        </span>
                    </li>

                    {/* 最後一頁按鈕 */}
                    <li
                        className={`page-item ${styles.pageItem}`}
                        onClick={() => handleChangePage(totalPages)}
                        style={{ cursor: 'pointer' }}
                    >
                        <span className={`page-link ${styles.pageLink}`}>
                            <i className="fa-solid fa-forward-step" />
                        </span>
                    </li>
                </ul>
            </nav>
        </>
    )
}
