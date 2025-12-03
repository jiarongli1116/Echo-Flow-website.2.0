'use client'

import styles from './Auth.module.css'

export default function FormInput({
    type = 'text',
    name,
    placeholder,
    value,
    onChange,
    onBlur,
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
            <input
                type={type}
                className={`form-control ${error ? styles['input-error'] : ''} ${className}`}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                required={required}
                {...props}
            />
            {error && <div className={styles['error-message']}>{error}</div>}
        </div>
    )
}
