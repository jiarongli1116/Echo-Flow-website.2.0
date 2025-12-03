'use client'

import styles from './Auth.module.css'

export default function FormSelect({
    name,
    value,
    onChange,
    onBlur,
    options,
    placeholder,
    error,
    required = false,
    className = '',
    ...props
}) {
    const handleChange = (e) => {
        onChange(name, e.target.value)
    }

    const handleBlur = (e) => {
        if (onBlur) {
            onBlur(name, e.target.value)
        }
    }

    return (
        <div className="mb-3">
            <select
                className={`form-control ${error ? styles['input-error'] : ''} ${className}`}
                name={name}
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                required={required}
                {...props}
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <div className={styles['error-message']}>{error}</div>}
        </div>
    )
}
