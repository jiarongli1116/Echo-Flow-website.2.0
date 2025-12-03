'use client';

import { useState } from 'react';
import UserPanelLayout from '@/app/users/panel/_components/UserPanelLayout';
import AddressList from './_components/AddressList';
import AddressForm from './_components/AddressForm';
import { useAddresses } from '@/hooks/use-addresses';
import styles from '@/app/users/panel/_components/UserPanel.module.css';

export default function UserAddressesPage() {
  const {
    addresses,
    loading,
    error,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAddresses();

  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  // 處理新增地址
  const handleAddAddress = () => {
    setEditingAddress(null);
    setShowForm(true);
  };

  // 處理編輯地址
  const handleEdit = (address) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  // 處理表單提交
  const handleFormSubmit = async (formData) => {
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, formData);
      } else {
        await addAddress(formData);
      }
      setShowForm(false);
      setEditingAddress(null);
    } catch (err) {
      console.error('地址操作失敗:', err);
      // 顯示錯誤訊息給用戶
      alert(err.message || '地址操作失敗，請稍後再試');
    }
  };

  // 處理取消表單
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAddress(null);
  };

  // 處理刪除地址
  const handleDelete = async (id) => {
    try {
      await deleteAddress(id);
    } catch (err) {
      console.error('刪除地址失敗:', err);
      // 顯示錯誤訊息給用戶
      alert(err.message || '刪除地址失敗，請稍後再試');
    }
  };

  // 處理設定預設地址
  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
    } catch (err) {
      console.error('設定預設地址失敗:', err);
      // 顯示錯誤訊息給用戶
      alert(err.message || '設定預設地址失敗，請稍後再試');
    }
  };

  // 新增地址按鈕
  const addAddressButton = (
    <button className={styles.addAddressBtn} onClick={handleAddAddress}>
      <svg className={styles.plusIcon} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1V15M1 8H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      新增地址
    </button>
  );

  return (
    <UserPanelLayout 
      pageTitle="地址管理"
      headerButton={addAddressButton}
    >
      {/* 錯誤提示 */}
      {error && (
        <div style={{ 
          color: 'red', 
          padding: '1rem', 
          marginBottom: '1rem',
        }}>
          錯誤: {error}
        </div>
      )}

      {/* 載入狀態 */}
      {loading && !addresses.length && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          color: '#666'
        }}>
          載入中...
        </div>
      )}

      {/* 地址列表 */}
      <AddressList
        addresses={addresses}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSetDefault={handleSetDefault}
        loading={loading}
      />

      {/* 地址表單模態框 */}
      {showForm && (
        <AddressForm
          address={editingAddress}
          addresses={addresses}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
          loading={loading}
        />
      )}
    </UserPanelLayout>
  );
}