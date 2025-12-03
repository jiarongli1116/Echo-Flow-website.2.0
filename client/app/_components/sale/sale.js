'use client'

import styles from '../page.module.css'
import SaleItem from './saleItem'

export default function Sale({ sales, recommend, getBookmark }) {
    return (
        <>
            <section className={`${styles.onSale} ${styles.alc}`}>
                <div className={`${styles.container} container`}>
                    <div className={styles.special}>
                        <SaleItem
                            data={sales}
                            title={'ON BOOKMARK'}
                            getBookmark={getBookmark}
                        />
                    </div>

                    <div className={styles.special}>
                        <SaleItem
                            data={recommend}
                            title={'RECOMMEND'}
                            getBookmark={getBookmark}
                        />
                    </div>
                </div>
            </section>
        </>
    )
}
