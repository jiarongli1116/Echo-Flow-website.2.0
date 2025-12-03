//用於顯示表單修改狀態的警告提示。當用戶修改了表單內容但尚未保存時
export const ModificationAlert = ({ isModified }) => {
  if (!isModified) return null;

  return (
    <div style={{ 
      backgroundColor: '#fef3c7', 
      border: '1px solid #f59e0b', 
      borderRadius: '8px', 
      padding: '12px', 
      marginBottom: '20px',
      color: '#92400e'
    }}>
      <strong>⚠️ 您有未儲存的修改</strong>
      <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
        請點擊「儲存」按鈕來保存您的修改，或點擊「取消」放棄修改。
      </p>
    </div>
  );
};
