import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import styles from '../../_components/cart.module.css';
import {
  getCities,
  getDistricts,
  getZipcode,
} from '@/app/users/panel/addresses/_components/taiwanRegions';

export default function CheckoutAddressForm({
  initialData = null,
  onDataChange, // 當表單資料改變時回調
  loading = false,
}) {
  // 移除 useMemo，直接使用 initialData，讓組件能夠響應 initialData 的變化
  // const stableInitialData = useMemo(() => initialData, []);

  // 內部狀態，獨立管理地址相關欄位
  const [internalFormData, setInternalFormData] = useState({
    zipcode: '',
    city: '',
    district: '',
    address: '',
    recipient_name: '',
    recipient_phone: '',
  });

  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [phoneError, setPhoneError] = useState('');
  const cities = getCities();

  // 使用 ref 來追蹤是否是初始化階段，避免初始化時的無限循環
  const isInitializingRef = useRef(true);
  const isUpdatingRef = useRef(false);
  const lastNotifiedDataRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const hasMountedRef = useRef(false); // 追蹤組件是否已經掛載

  // 初始化表單資料 - 只在組件首次掛載時執行
  useEffect(() => {
    // React 19 嚴格模式會導致組件掛載兩次，使用 ref 來防止重複初始化
    if (hasMountedRef.current) {
      console.log('📍 CheckoutAddressForm: 組件已掛載過，跳過重複初始化');
      return;
    }

    console.log('📍 CheckoutAddressForm: 初始化表單資料:', initialData);

    // 標記正在初始化
    isInitializingRef.current = true;
    hasMountedRef.current = true;

    if (initialData) {
      setInternalFormData({
        zipcode: initialData.zipcode || '',
        city: initialData.city || '',
        district: initialData.district || '',
        address: initialData.address || '',
        recipient_name: initialData.recipient_name || '',
        recipient_phone: initialData.recipient_phone || '',
      });

      // 如果有縣市，設定區域選項
      if (initialData.city) {
        const districts = getDistricts(initialData.city);
        setAvailableDistricts(districts);
      }
    }

    // 延遲標記初始化完成，確保狀態更新完成
    const timer = setTimeout(() => {
      isInitializingRef.current = false;
      console.log(
        '📍 CheckoutAddressForm: 初始化完成，isInitializing:',
        isInitializingRef.current,
      );
    }, 100);

    return () => clearTimeout(timer);
  }, []); // 只在組件首次掛載時執行

  // 新增：監聽 initialData 變化，當父組件傳入的資料改變時更新內部狀態
  useEffect(() => {
    if (hasMountedRef.current) {
      console.log(
        '📍 CheckoutAddressForm: initialData 變化，更新內部狀態:',
        initialData,
      );

      // 標記正在更新
      isUpdatingRef.current = true;

      if (initialData) {
        const newInternalData = {
          zipcode: initialData.zipcode || '',
          city: initialData.city || '',
          district: initialData.district || '',
          address: initialData.address || '',
          recipient_name: initialData.recipient_name || '',
          recipient_phone: initialData.recipient_phone || '',
        };

        setInternalFormData(newInternalData);

        // 同步更新 lastNotifiedDataRef，避免因為 initialData 變化而觸發不必要的通知
        lastNotifiedDataRef.current = { ...newInternalData };

        // 如果有縣市，設定區域選項
        if (initialData.city) {
          const districts = getDistricts(initialData.city);
          setAvailableDistricts(districts);
        }
      } else {
        // 如果 initialData 為空，清空內部狀態
        console.log('📍 CheckoutAddressForm: initialData 為空，清空表單');
        const emptyData = {
          zipcode: '',
          city: '',
          district: '',
          address: '',
          recipient_name: '',
          recipient_phone: '',
        };

        setInternalFormData(emptyData);
        setAvailableDistricts([]);

        // 清空上次通知的資料記錄，確保下次輸入時能正確通知
        lastNotifiedDataRef.current = null;
      }

      // 延遲重置更新標記
      setTimeout(() => {
        isUpdatingRef.current = false;
        console.log(
          '📍 CheckoutAddressForm: 更新完成，isUpdating:',
          isUpdatingRef.current,
        );
      }, 50); // 減少延遲時間，與其他延遲時間協調
    }
  }, [initialData]); // 監聽 initialData 變化

  // 新增：確保初始化標記在適當時候被重置
  useEffect(() => {
    if (hasMountedRef.current) {
      // 延遲重置初始化標記，確保所有狀態更新完成
      const timer = setTimeout(() => {
        if (isInitializingRef.current) {
          isInitializingRef.current = false;
          console.log(
            '📍 CheckoutAddressForm: 延遲重置初始化標記，isInitializing:',
            isInitializingRef.current,
          );
        }
      }, 200); // 給足夠時間讓所有狀態更新完成

      return () => clearTimeout(timer);
    }
  }, []); // 移除依賴，只在組件掛載後執行一次

  // 簡化回調函數，避免複雜依賴
  const notifyParent = useCallback(
    (newFormData) => {
      console.log('📍 CheckoutAddressForm: notifyParent 被調用:', {
        onDataChange: !!onDataChange,
        isInitializing: isInitializingRef.current,
        isUpdating: isUpdatingRef.current,
        hasMounted: hasMountedRef.current,
        newFormData,
      });

      // 只在組件已掛載、非初始化且非更新狀態時通知父組件
      if (
        onDataChange &&
        hasMountedRef.current &&
        !isInitializingRef.current &&
        !isUpdatingRef.current
      ) {
        // 檢查資料是否真的改變了，避免重複通知
        const hasRealChange =
          newFormData.zipcode !== '' ||
          newFormData.city !== '' ||
          newFormData.district !== '' ||
          newFormData.address !== '' ||
          newFormData.recipient_name !== '' ||
          newFormData.recipient_phone !== '';

        if (hasRealChange) {
          // 檢查是否與上次通知的資料相同，避免重複通知
          const lastData = lastNotifiedDataRef.current;

          // 添加詳細的調試日誌
          console.log('📍 CheckoutAddressForm: 資料比較調試:', {
            lastData,
            newFormData,
            zipcodeChanged: lastData
              ? lastData.zipcode !== newFormData.zipcode
              : 'N/A',
            cityChanged: lastData ? lastData.city !== newFormData.city : 'N/A',
            districtChanged: lastData
              ? lastData.district !== newFormData.district
              : 'N/A',
            addressChanged: lastData
              ? lastData.address !== newFormData.address
              : 'N/A',
            recipientNameChanged: lastData
              ? lastData.recipient_name !== newFormData.recipient_name
              : 'N/A',
            recipientPhoneChanged: lastData
              ? lastData.recipient_phone !== newFormData.recipient_phone
              : 'N/A',
            lastDataZipcode: lastData?.zipcode,
            newFormDataZipcode: newFormData.zipcode,
            lastDataCity: lastData?.city,
            newFormDataCity: newFormData.city,
            lastDataDistrict: lastData?.district,
            newFormDataDistrict: newFormData.district,
            lastDataAddress: lastData?.address,
            newFormDataAddress: newFormData.address,
            lastDataRecipientName: lastData?.recipient_name,
            newFormDataRecipientName: newFormData.recipient_name,
            lastDataRecipientPhone: lastData?.recipient_phone,
            newFormDataRecipientPhone: newFormData.recipient_phone,
          });

          const isDataChanged =
            !lastData ||
            lastData.zipcode !== newFormData.zipcode ||
            lastData.city !== newFormData.city ||
            lastData.district !== newFormData.district ||
            lastData.address !== newFormData.address ||
            lastData.recipient_name !== newFormData.recipient_name ||
            lastData.recipient_phone !== newFormData.recipient_phone;

          if (isDataChanged) {
            console.log(
              '📍 CheckoutAddressForm: 通知父組件資料變更:',
              newFormData,
            );
            lastNotifiedDataRef.current = { ...newFormData };
            onDataChange(newFormData);
          } else {
            console.log('📍 CheckoutAddressForm: 跳過通知，資料未改變');
          }
        } else {
          console.log('📍 CheckoutAddressForm: 跳過通知，資料為空');
        }
      } else {
        console.log('📍 CheckoutAddressForm: 跳過通知父組件，原因:', {
          noOnDataChange: !onDataChange,
          hasMounted: hasMountedRef.current,
          isInitializing: isInitializingRef.current,
          isUpdating: isUpdatingRef.current,
        });
      }
    },
    [onDataChange], // 只依賴 onDataChange
  );

  // 當內部狀態改變時，通知父組件（使用防抖機制）
  useEffect(() => {
    // 只在組件已掛載後才處理狀態變化
    if (!hasMountedRef.current) {
      console.log('📍 CheckoutAddressForm: 組件未掛載完成，跳過狀態處理');
      return;
    }

    // 如果正在更新（initialData 變化），跳過通知
    if (isUpdatingRef.current) {
      console.log('📍 CheckoutAddressForm: 正在更新中，跳過通知');
      return;
    }

    console.log('📍 CheckoutAddressForm: useEffect 觸發，檢查狀態:', {
      hasMounted: hasMountedRef.current,
      isInitializing: isInitializingRef.current,
      isUpdating: isUpdatingRef.current,
      internalFormData,
    });

    // 清除之前的定時器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 🚀 修復：減少防抖延遲時間，提高響應性
    debounceTimerRef.current = setTimeout(() => {
      // 🚀 修復：再次檢查狀態，確保在延遲期間狀態沒有改變
      if (
        hasMountedRef.current &&
        !isInitializingRef.current &&
        !isUpdatingRef.current
      ) {
        console.log('📍 CheckoutAddressForm: 準備通知父組件');
        notifyParent(internalFormData);
      } else {
        console.log('📍 CheckoutAddressForm: 跳過通知，狀態檢查失敗:', {
          hasMounted: hasMountedRef.current,
          isInitializing: isInitializingRef.current,
          isUpdating: isUpdatingRef.current,
        });
      }
    }, 100); // 🚀 修復：從 150ms 減少到 100ms，提高響應性

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [internalFormData, notifyParent]); // 重新添加 notifyParent 依賴

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    console.log('📍 CheckoutAddressForm: 欄位變更開始:', {
      name,
      value,
      type,
      checked,
      currentIsUpdating: isUpdatingRef.current,
      currentInternalData: { ...internalFormData },
    });

    // 標記正在更新狀態
    isUpdatingRef.current = true;
    console.log('📍 CheckoutAddressForm: isUpdating 設置為 true');

    try {
      if (name === 'city') {
        // 縣市改變時，清空區域和郵遞區號，並更新區域選項
        const districts = getDistricts(value);
        setAvailableDistricts(districts);

        setInternalFormData((prev) => {
          const newData = {
            ...prev,
            city: value,
            district: '',
            zipcode: '',
          };
          console.log('📍 CheckoutAddressForm: 縣市變更，新資料:', newData);
          return newData;
        });
      } else if (name === 'district') {
        // 區域改變時，自動填入郵遞區號
        const zipcode = getZipcode(internalFormData.city, value);
        setInternalFormData((prev) => {
          const newData = {
            ...prev,
            district: value,
            zipcode: zipcode,
          };
          console.log('📍 CheckoutAddressForm: 區域變更，新資料:', newData);
          return newData;
        });
      } else if (name === 'recipient_phone') {
        // 手機號碼處理
        const filteredValue = value.replace(/[^\d-]/g, '');
        const limitedValue = filteredValue.slice(0, 11);

        // 即時驗證手機號碼格式
        let errorMessage = '';
        const phoneDigits = limitedValue.replace(/\D/g, '');

        // 驗證邏輯
        if (limitedValue.length > 0) {
          // 檢查是否包含非數字字符（除了連字符）
          if (limitedValue.replace(/[\d-]/g, '').length > 0) {
            errorMessage = '手機號碼只能包含數字和連字符';
          }
          // 檢查連字符格式
          else if (limitedValue.includes('-')) {
            const parts = limitedValue.split('-');
            if (parts.length !== 2) {
              errorMessage = '連字符格式錯誤，應為：09xx-xxxxxx';
            } else if (parts[0].length !== 4 || parts[1].length !== 6) {
              errorMessage = '請使用正確的格式：09xx-xxxxxx';
            } else if (parts[0].slice(0, 2) !== '09') {
              errorMessage = '手機號碼必須以 09 開頭';
            }
          }
          // 檢查是否以 09 開頭
          else if (
            phoneDigits.length >= 2 &&
            phoneDigits.slice(0, 2) !== '09'
          ) {
            errorMessage = '手機號碼必須以 09 開頭';
          }
          // 檢查長度
          else if (phoneDigits.length > 0 && phoneDigits.length < 10) {
            errorMessage = '手機號碼必須是 10 位數字';
          }
          // 檢查完整格式
          else if (phoneDigits.length === 10) {
            if (!/^09\d{8}$/.test(phoneDigits)) {
              errorMessage = '請輸入正確的手機號碼格式 (09xx-xxxxxx)';
            } else {
              // 檢查是否需要格式化
              const expectedFormat = `${phoneDigits.slice(
                0,
                4,
              )}-${phoneDigits.slice(4)}`;
              if (limitedValue === phoneDigits) {
                errorMessage = '請使用正確的格式：09xx-xxxxxx';
              }
            }
          }
          // 檢查是否超過10位
          else if (phoneDigits.length > 10) {
            errorMessage = '手機號碼不能超過 10 位數字';
          }
        }

        setPhoneError(errorMessage);

        setInternalFormData((prev) => {
          const newData = {
            ...prev,
            [name]: limitedValue,
          };
          console.log('📍 CheckoutAddressForm: 手機號碼變更，新資料:', newData);
          return newData;
        });
      } else {
        setInternalFormData((prev) => {
          const newData = {
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
          };
          console.log(`📍 CheckoutAddressForm: ${name} 變更，新資料:`, newData);
          return newData;
        });
      }
    } catch (error) {
      console.error('📍 CheckoutAddressForm: 處理欄位變更時發生錯誤:', error);
    } finally {
      // 🚀 修復：立即重置更新標記，不延遲
      isUpdatingRef.current = false;
      console.log(
        '📍 CheckoutAddressForm: 欄位變更完成，isUpdating 重置為:',
        isUpdatingRef.current,
      );
    }
  };

  // 表單驗證
  const validateForm = () => {
    const errors = {};

    // 必填欄位驗證
    if (!internalFormData.recipient_name.trim()) {
      errors.recipient_name = '收件人姓名為必填欄位';
    }

    if (!internalFormData.recipient_phone.trim()) {
      errors.recipient_phone = '手機號碼為必填欄位';
    } else {
      const phoneDigits = internalFormData.recipient_phone.replace(/\D/g, '');
      // 驗證格式：09 + 8位數字 = 10位總長度
      if (!/^09\d{8}$/.test(phoneDigits)) {
        errors.recipient_phone = '請輸入正確的手機號碼格式 (09xx-xxxxxx)';
      }
    }

    if (!internalFormData.zipcode.trim()) {
      errors.zipcode = '郵遞區號為必填欄位';
    }

    if (!internalFormData.city) {
      errors.city = '請選擇縣市';
    }

    if (!internalFormData.district) {
      errors.district = '請選擇區域';
    }

    if (!internalFormData.address.trim()) {
      errors.address = '詳細地址為必填欄位';
    }

    return errors;
  };

  const getValidationResult = () => {
    return validateForm();
  };

  return (
    <div className={styles.addressFormContainer}>
      {/* 收件人姓名 */}
      <div className={styles.addressFormRow}>
        <label className={styles.addressFormLabel}>
          收件人
          <span className={styles.requiredAsterisk}>*</span>
        </label>
        <input
          className={styles.addressFormInput}
          type='text'
          name='recipient_name'
          placeholder='請輸入收件人'
          value={internalFormData.recipient_name}
          onChange={handleChange}
          disabled={loading}
          maxLength='50'
        />
      </div>

      {/* 手機號碼 */}
      <div className={styles.addressFormRow}>
        <label className={styles.addressFormLabel}>
          手機號碼
          <span className={styles.requiredAsterisk}>*</span>
        </label>
        <input
          className={styles.addressFormInput}
          type='tel'
          name='recipient_phone'
          placeholder='請輸入手機號碼，格式為09xx-xxxxxx'
          value={internalFormData.recipient_phone}
          onChange={handleChange}
          disabled={loading}
          maxLength='11'
        />
        {phoneError && (
          <div
            style={{
              color: 'red',
              fontSize: '0.8rem',
              marginTop: '0.2rem',
              backgroundColor: '#fee',
              padding: '0.3rem',
              borderRadius: '3px',
              border: '1px solid #fcc',
            }}
          >
            ⚠️ {phoneError}
          </div>
        )}
      </div>

      {/* 郵遞區號/地區 */}
      <div className={styles.addressFormRow}>
        <label className={styles.addressFormLabel}>
          郵遞區號/
          <br />
          地區
          <span className={styles.requiredAsterisk}>*</span>
        </label>
        <div className={styles.addressFormInputGroup}>
          <input
            className={styles.addressFormInput}
            type='text'
            name='zipcode'
            placeholder='郵遞區號'
            value={internalFormData.zipcode}
            readOnly
            disabled={loading}
            maxLength='10'
          />
          <select
            className={styles.addressFormSelect}
            name='city'
            value={internalFormData.city}
            onChange={handleChange}
            disabled={loading}
          >
            <option value=''>請選擇縣市</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <select
            className={styles.addressFormSelect}
            name='district'
            value={internalFormData.district}
            onChange={handleChange}
            disabled={loading || !internalFormData.city}
          >
            <option value=''>請選擇區域</option>
            {availableDistricts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 詳細地址 */}
      <div className={styles.addressFormRow}>
        <label className={styles.addressFormLabel}>
          地址
          <span className={styles.requiredAsterisk}>*</span>
        </label>
        <input
          className={styles.addressFormInput}
          type='text'
          name='address'
          placeholder='請輸入詳細地址'
          value={internalFormData.address}
          onChange={handleChange}
          disabled={loading}
          maxLength='200'
        />
      </div>
    </div>
  );
}
