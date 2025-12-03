//用於用戶個人資料的更新
import { FormField, TextInput, SelectInput } from './FormField';
import styles from '@/app/users/panel/_components/UserPanel.module.css';

export const UserUpdateForm = ({ 
  formData, 
  validationErrors, 
  onInputChange 
}) => {
  // 生成選項
  const years = Array.from({ length: 75 }, (_, i) => ({
    value: 1950 + i,
    label: 1950 + i
  }));
  
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: String(i + 1).padStart(2, '0')
  }));
  
  const days = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: String(i + 1).padStart(2, '0')
  }));

  const genderOptions = [
    { value: '男', label: '男性' },
    { value: '女', label: '女性' },
    { value: '其他', label: '其他' }
  ];

  return (
    <div className={styles.formSection}>
      {/* 使用者帳號 */}
      <FormField 
        label="使用者帳號" 
        required 
        description="(帳號為信箱格式，註冊後無法修改)"
      >
        <TextInput
          type="email"
          value={formData.account}
          disabled
        />
      </FormField>

      {/* 姓名 */}
      <FormField 
        label="姓名" 
        required 
        error={validationErrors.name}
      >
        <TextInput
          value={formData.name}
          onChange={(e) => onInputChange('name', e.target.value)}
        />
      </FormField>

      {/* 暱稱 */}
      <FormField 
        label="暱稱" 
        error={validationErrors.nickname}
        description="(選填，最多20個字元)"
      >
        <TextInput
          value={formData.nickname}
          onChange={(e) => onInputChange('nickname', e.target.value)}
          placeholder="請輸入暱稱"
          maxLength={20}
        />
      </FormField>

      {/* 手機號碼 */}
      <FormField 
        label="手機號碼" 
        required 
        error={validationErrors.phone}
      >
        <TextInput
          type="tel"
          value={formData.phone}
          onChange={(e) => onInputChange('phone', e.target.value)}
          placeholder="09xx-xxxxxx"
        />
      </FormField>

      {/* 聯絡信箱 */}
      <FormField 
        label="聯絡信箱" 
        error={validationErrors.email}
      >
        <TextInput
          type="email"
          value={formData.email}
          onChange={(e) => onInputChange('email', e.target.value)}
          placeholder="example@email.com"
        />
      </FormField>

      {/* 性別 */}
      <FormField label="性別">
        <div className={styles.radioGroup}>
          {genderOptions.map(option => (
            <label key={option.value} className={styles.radioOption}>
              <input
                type="radio"
                name="gender"
                value={option.value}
                checked={formData.gender === option.value}
                onChange={(e) => onInputChange('gender', e.target.value)}
                className={styles.radioInput}
              />
              {option.label}
            </label>
          ))}
        </div>
      </FormField>

      {/* 生日 */}
      <FormField 
        label="生日" 
        error={validationErrors.birthday}
      >
        <div className={styles.dateGroup}>
          <SelectInput
            value={formData.birthYear}
            onChange={(e) => onInputChange('birthYear', e.target.value)}
            options={years}
            placeholder="年"
          />
          <SelectInput
            value={formData.birthMonth}
            onChange={(e) => onInputChange('birthMonth', e.target.value)}
            options={months}
            placeholder="月"
          />
          <SelectInput
            value={formData.birthDay}
            onChange={(e) => onInputChange('birthDay', e.target.value)}
            options={days}
            placeholder="日"
          />
        </div>
      </FormField>
    </div>
  );
};
