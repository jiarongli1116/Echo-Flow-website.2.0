import styles from '@/app/users/panel/_components/UserPanel.module.css'

export default function AddressCard({
    address,
    onEdit,
    onDelete,
    onSetDefault,
    loading = false,
    addresses = [], // 新增 addresses 參數
}) {
    // 確保 addresses 是陣列
    const addressesArray = Array.isArray(addresses) ? addresses : []

    // 計算當前地址總數
    const totalAddresses = addressesArray.length
    const isOnlyAddress = totalAddresses === 1

    const handleDelete = () => {
        if (isOnlyAddress) {
            alert('至少需要保留一個地址，無法刪除')
            return
        }

        if (confirm('確定要刪除此地址嗎？')) {
            onDelete(address.id)
        }
    }

    return (
        <div className={styles.addressCard}>
            {/* 地址信息 */}
            <div className={styles.addressInfo}>
                <div className={styles.recipientInfo}>
                    <span className={styles.recipientLabel}>收件人</span>
                    <span>{address.recipient_name}</span>
                </div>

                <div className={styles.phoneInfo}>
                    <span className={styles.phoneLabel}>手機號碼</span>
                    <span>{address.recipient_phone}</span>
                </div>

                <div className={styles.address}>
                    <span className={styles.addressLabel}>地址</span>
                    <span>
                        {address.zipcode} {address.city}
                        {address.district} {address.address}
                    </span>
                    {Boolean(address.isDefault) && <span className={styles.defaultTag}>預設</span>}
                </div>
            </div>

            {/* 操作按鈕 */}
            <div className={styles.addressActions}>
                <button className={styles.actionBtn} onClick={() => onEdit(address)} disabled={loading}>
                    編輯
                </button>

                <button
                    className={styles.actionBtn}
                    onClick={handleDelete}
                    disabled={loading || isOnlyAddress}
                    title={isOnlyAddress ? '至少需要保留一個地址' : ''}
                >
                    刪除
                </button>

                <button
                    className={styles.actionBtn}
                    onClick={() => onSetDefault(address.id)}
                    disabled={address.isDefault || loading}
                >
                    設定為預設
                </button>
            </div>
        </div>
    )
}
