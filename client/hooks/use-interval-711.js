import { useEffect, useRef } from 'react';

/**
 * 711 超商選擇專用的 interval hook
 * 用於管理 711 門市選擇的倒數計時功能
 * 避免與其他功能的 setInterval 操作產生衝突
 *
 * @param {Function} callback - 要執行的回調函數
 * @param {number|null} delay - 延遲時間（毫秒），null 表示停止
 */
// https://overreacted.io/zh-hans/making-setinterval-declarative-with-react-hooks/
export default function useInterval(callback, delay) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
