'use client'

import { useAuth } from '@/hooks/use-auth'
import { useUserUpdate } from '@/hooks/use-user-update'
import { useUserForm } from '@/hooks/use-user-form'
import UserPanelLayout from '@/app/users/panel/_components/UserPanelLayout'
import { UserAvatar } from './_components/UserAvatar'
import { UserUpdateForm } from './_components/UserUpdateForm'
import { ActionButtons } from './_components/ActionButtons'
import { ModificationAlert } from './_components/ModificationAlert'
import UserModal from '../_components/UserModal'
import styles from '@/app/users/panel/_components/UserPanel.module.css'
import { useState } from 'react'

export default function UserUpdatePage() {
    const { user, updateUser } = useAuth()
    const { updateUserProfile, uploadUserAvatar, validateFile, getAvatarUrl, isSaving, isUploading } = useUserUpdate()
    const {
        formData,
        isModified,
        validationErrors,
        handleInputChange,
        validateForm,
        prepareUpdateData,
        getChangedFieldNames,
        resetForm,
        cancelChanges,
        handleUpdateSuccess,
    } = useUserForm(user)

    const [avatarKey, setAvatarKey] = useState(0)

    // Modal 狀態
    const [showModal, setShowModal] = useState(false)
    const [modalType, setModalType] = useState('info')
    const [modalTitle, setModalTitle] = useState('')
    const [modalMessage, setModalMessage] = useState('')
    const [showCancel, setShowCancel] = useState(false)
    const [pendingAction, setPendingAction] = useState(null)

    // Modal 輔助函數
    const showModalMessage = (type, title, message, isConfirm = false, action = null) => {
        setModalType(type)
        setModalTitle(title)
        setModalMessage(message)
        setShowCancel(isConfirm)
        setPendingAction(action)
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setModalType('info')
        setModalTitle('')
        setModalMessage('')
        setShowCancel(false)
        setPendingAction(null)
    }

    const handleModalConfirm = () => {
        if (pendingAction) {
            pendingAction()
        }
        closeModal()
    }

    const handleModalCancel = () => {
        closeModal()
    }

    const handleSave = async () => {
        if (!validateForm()) {
            showModalMessage('error', '表單錯誤', '請檢查表單錯誤')
            return
        }

        // 檢查是否有實際變更
        const updateData = prepareUpdateData()
        const changedFieldNames = getChangedFieldNames()

        if (Object.keys(updateData).length === 0) {
            showModalMessage('info', '提示', '沒有需要更新的資料')
            return
        }

        // 顯示確認 Modal
        const executeSave = async () => {
            const result = await updateUserProfile(user.id, updateData)

            if (result.success) {
                showModalMessage('success', '更新成功', `更新的欄位：${changedFieldNames.join('、')}`)
                handleUpdateSuccess()
            } else {
                showModalMessage('error', '儲存失敗', result.message)
            }
        }

        showModalMessage(
            'warning',
            '確認儲存',
            `確定要儲存以下修改嗎？\n變更的欄位：${changedFieldNames.join('、')}`,
            true,
            executeSave
        )
    }

    const handleCancel = () => {
        if (isModified) {
            showModalMessage('warning', '確認取消', '確定要取消修改嗎？未儲存的修改將會遺失。', true, cancelChanges)
        }
    }

    const handleReset = () => {
        showModalMessage('warning', '確認重置', '確定要重置表單嗎？所有修改將會遺失。', true, resetForm)
    }

    const handleAvatarUpload = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        const validation = validateFile(file)
        if (!validation.isValid) {
            showModalMessage('error', '檔案驗證失敗', validation.message)
            return
        }

        const result = await uploadUserAvatar(user.id, file)

        if (result.success) {
            showModalMessage('success', '頭像更新成功', '頭像已成功更新！')
            if (result.data.filename) {
                // 立即更新用戶狀態，確保頭像能立即顯示
                const updatedUser = { ...user, img: result.data.filename }
                updateUser(updatedUser)

                // 強制重新渲染頭像
                setAvatarKey((prev) => prev + 1)
            }
        } else {
            showModalMessage('error', '頭像更新失敗', result.message)
        }
    }

    if (!user) {
        return (
            <UserPanelLayout pageTitle="基本資料修改">
                <div className={styles.updateForm}>
                    <p>載入中...</p>
                </div>
            </UserPanelLayout>
        )
    }

    return (
        <UserPanelLayout pageTitle="基本資料修改">
            <ModificationAlert isModified={isModified} />

            <div className={styles.updateForm}>
                <UserAvatar
                    key={avatarKey} // Add key to force re-render
                    avatarUrl={getAvatarUrl(user.img)}
                    onFileChange={handleAvatarUpload}
                    isUploading={isUploading}
                />

                <UserUpdateForm
                    formData={formData}
                    validationErrors={validationErrors}
                    onInputChange={handleInputChange}
                />
            </div>

            <ActionButtons
                isModified={isModified}
                isSaving={isSaving}
                onSave={handleSave}
                onCancel={handleCancel}
                onReset={handleReset}
            />

            {/* 用戶更新模態框 */}
            <UserModal
                isOpen={showModal}
                title={modalTitle}
                message={modalMessage}
                type={modalType}
                confirmText="確認"
                cancelText="取消"
                onConfirm={handleModalConfirm}
                onCancel={handleModalCancel}
                showCancel={showCancel}
            />
        </UserPanelLayout>
    )
}
