'use client';

export default function Checkbox({
  checked = false,
  className = '',
  color = 'info',
  indeterminate = false,
  size = 'large',
  stateProp = 'enabled',
  onChange,
  paddingClassName = '',
  icon,
  ...props
}) {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.checked);
    }
  };

  return (
    <div className={`checkbox-wrapper ${className}`} {...props}>
      <div className={`checkbox-padding ${paddingClassName}`}>
        <input
          type='checkbox'
          checked={checked}
          onChange={handleChange}
          className={`custom-checkbox size-${size} color-${color} state-${stateProp}`}
          disabled={stateProp === 'disabled'}
        />
        {icon && <div className='checkbox-icon'>{icon}</div>}
      </div>
    </div>
  );
}
