import styles from './UserEdit.module.css'

export const FormField = ({ 
  label, 
  required = false, 
  error, 
  children, 
  description 
}) => {
  return (
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}
      {description && (
        <small className={styles.fieldDescription}>
          {description}
        </small>
      )}
    </div>
  )
}

export const TextInput = ({ 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  disabled = false,
  className = '',
  maxLength,
  min
}) => {
  return (
    <input
      type={type}
      className={`${styles.formInput} ${className}`}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      min={min}
    />
  )
}

export const SelectInput = ({ 
  value, 
  onChange, 
  options, 
  placeholder,
  className = ''
}) => {
  return (
    <select
      className={`${styles.formSelect} ${className}`}
      value={value}
      onChange={onChange}
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
