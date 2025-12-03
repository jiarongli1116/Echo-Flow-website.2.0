/* eslint-disable @next/next/no-img-element */
"use client";

import styles from "./chat.module.css";
import { useAvatarSrc } from "./avatar-utils";

/** 內部小元件：選取中的 chip（用 hook 黏住 fallback） */
function SelectedChip({ user, onToggle }) {
  const raw = user?.avatar ?? user?.img ?? user?.absAvatar;
  const { src, onError } = useAvatarSrc(raw);

  return (
    <button
      type="button"
      className={styles.chatChip}
      onClick={() => onToggle?.(user.id)}
      title="點擊取消選取"
    >
      <img src={src} alt={user?.nickname || `U${user?.id}`} onError={onError} />
      <span>{user?.nickname || `U${user?.id}`}</span>
      <i className="bi bi-x"></i>
    </button>
  );
}

/** 內部小元件：清單一列（用 hook 黏住 fallback） */
function PickerRow({ user, checked, onToggle }) {
  const raw = user?.avatar ?? user?.img ?? user?.absAvatar;
  const { src, onError } = useAvatarSrc(raw);

  return (
    <label className={styles.chatPickerItem}>
      <input
        className={styles.chatPickerItemCheck}
        type="checkbox"
        checked={checked}
        onChange={() => onToggle?.(user.id)}
      />
      <img
        className={styles.chatPickerItemAvatar}
        src={src}
        alt={user?.nickname || `U${user?.id}`}
        onError={onError}
      />
      <span className={styles.chatPickerItemName} title={user?.email || ""}>
        {user?.nickname || `U${user?.id}`}
        {user?.email ? <small>（{user.email}）</small> : null}
      </span>
    </label>
  );
}

export default function UserPicker({
  users = [],
  selectedIds = [],
  onToggle,
  query = "",
  onQueryChange,
  /* ★ 新增：搜尋欄正下方插槽（放群組人數 + 群組名稱輸入框） */
  belowSearch = null,
}) {
  return (
    <div className={styles.chatPicker}>
      {/* 搜尋列（保留原本功能） */}
      <div className={styles.chatPickerSearch}>
        <i className="bi bi-search"></i>
        <input
          type="text"
          placeholder="搜尋使用者"
          value={query}
          onChange={(e) => onQueryChange?.(e.target.value)}
        />
      </div>

      {/* ★ 新增：搜尋欄正下方插槽（僅在有內容時顯示） */}
      {belowSearch ? (
        <div className={styles.chatPickerBelow}>{belowSearch}</div>
      ) : null}

      {/* 已選清單（chips） */}
      {selectedIds?.length > 0 && (
        <div className={styles.chatPickerSelected}>
          {users
            .filter((u) => selectedIds.includes(u.id))
            .map((u) => (
              <SelectedChip key={u.id} user={u} onToggle={onToggle} />
            ))}
        </div>
      )}

      {/* 名單 */}
      <div
        className={styles.chatPickerList}
        role="listbox"
        aria-label="使用者名單"
      >
        {users.length === 0 && (
          <div className={styles.chatPickerEmpty}>沒有符合的使用者</div>
        )}

        {users.map((u) => {
          const checked = selectedIds.includes(u.id);
          return (
            <PickerRow
              key={u.id}
              user={u}
              checked={checked}
              onToggle={onToggle}
            />
          );
        })}
      </div>
    </div>
  );
}
