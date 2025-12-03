import styles from '@/app/users/panel/_components/UserPanel.module.css';

export const FormField = ({ 
  label, 
  required = false, 
  error, 
  children, 
  description 
}) => {
  return (
    <div className={styles.formGroup}>
      <label className="form-label">
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {error && (
        <div className="invalid-feedback" style={{ display: 'block', color: '#dc3545', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}
      {description && (
        <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          {description}
        </small>
      )}
    </div>
  );
};

export const TextInput = ({ 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  disabled = false,
  className = ''
}) => {
  return (
    <input
      type={type}
      className={`form-control ${className}`}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};

export const SelectInput = ({ 
  value, 
  onChange, 
  options, 
  placeholder,
  className = ''
}) => {
  return (
    <select
      className={`form-control ${className}`}
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
  );
};
