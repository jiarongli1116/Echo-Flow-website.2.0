'use client'

import { useRef, useCallback, useState } from 'react'
import PasswordToggle from './PasswordToggle'
import styles from './Auth.module.css'

export default function PasswordInput({
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
    const passwordRef = useRef(null)
    const [showPassword, setShowPassword] = useState(false)

    const handleChange = useCallback(
        (e) => {
            onChange(name, e.target.value)
        },
        [onChange, name]
    )

    const handleBlur = useCallback(
        (e) => {
            if (onBlur) {
                onBlur(name, e.target.value)
            }
        },
        [onBlur, name]
    )

    const handleTogglePassword = useCallback(() => {
        setShowPassword((prev) => !prev)
    }, [])

    return (
        <div className="mb-3">
            <div style={{ position: 'relative' }}>
                <input
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    className={`form-control ${error ? styles['input-error'] : ''} ${className}`}
                    name={name}
                    placeholder={placeholder}
                    value={value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required={required}
                    style={{ paddingRight: '40px' }}
                    {...props}
                />
                <PasswordToggle
                    inputRef={passwordRef}
                    width={22}
                    height={16}
                    showPassword={showPassword}
                    onToggle={handleTogglePassword}
                />
            </div>
            {error && <div className={styles['error-message']}>{error}</div>}
        </div>
    )
}
