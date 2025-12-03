/** 把 "YYYY-MM-DD HH:mm:ss" 轉成：今天/昨天/8月27日/2024年8月27日 + 24小時制 HH:mm */
export function formatWhen(ts) {
  if (!ts) return "";
  const d = new Date(ts.replace(" ", "T")); // 後端是 "YYYY-MM-DD HH:mm:ss"
  if (isNaN(d.getTime())) return ts;

  const now = new Date();

  // 取本地「當天 00:00」來算天數差
  const startOfDay = (x) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(d)) / 86400000
  );

  const pad2 = (n) => String(n).padStart(2, "0");
  const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  if (diffDays === 0) return `今天 ${hhmm}`;
  if (diffDays === 1) return `昨天 ${hhmm}`;

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();

  if (y === now.getFullYear()) return `${m}月${day}日 ${hhmm}`;
  return `${y}年${m}月${day}日 ${hhmm}`;
}
