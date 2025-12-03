'use client'

import React from 'react'
import { EyeIcon, EyeSlashIcon } from '@/components/icons/Icons'

const PasswordToggle = ({
    inputRef,
    width = 22,
    height = 16,
    className = '',
    buttonClassName = '',
    showPassword = false,
    onToggle,
}) => {
    const togglePasswordVisibility = () => {
        if (onToggle) {
            onToggle()
        }
    }

    return (
        <button
            type="button"
            style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#6c757d',
                cursor: 'pointer',
                padding: '4px',
                fontSize: '1rem',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
        >
            {showPassword ? (
                <EyeIcon width={width} height={height} className={className} />
            ) : (
                <EyeSlashIcon width={width} height={height} className={className} />
            )}
        </button>
    )
}

export default PasswordToggle
