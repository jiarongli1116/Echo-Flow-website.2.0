"use client";

import { useState } from "react";

export const usePassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validatePassword = (password) => {
    // 密碼至少8位，包含字母和數字
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const validateForm = (currentPassword, newPassword, confirmPassword) => {
    if (!currentPassword.trim()) {
      return "請輸入目前密碼";
    }

    if (!newPassword.trim()) {
      return "請輸入新密碼";
    }

    if (!validatePassword(newPassword)) {
      return "新密碼必須至少8位，包含字母和數字";
    }

    if (newPassword !== confirmPassword) {
      return "確認密碼與新密碼不符";
    }

    if (currentPassword === newPassword) {
      return "新密碼不能與目前密碼相同";
    }

    return null;
  };

  const changePassword = async (currentPassword, newPassword) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("reactLoginToken");
      if (!token) {
        throw new Error("請先登入");
      }

      // 先驗證目前密碼
      const verifyRes = await fetch("http://localhost:3005/api/users/verify-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword }),
      });

      const verifyResult = await verifyRes.json();
      if (verifyResult.status !== "success") {
        const errorMessage = verifyResult.message || "目前密碼錯誤";
        setError(errorMessage);
        return { success: false, message: errorMessage };
      }

      // 獲取當前用戶ID
      const statusRes = await fetch("http://localhost:3005/api/users/status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const statusResult = await statusRes.json();
      if (statusResult.status !== "success") {
        const errorMessage = "身份驗證失敗，請重新登入";
        setError(errorMessage);
        return { success: false, message: errorMessage };
      }

      const userId = statusResult.data.user.id;

      // 發送修改密碼請求
      const res = await fetch(`http://localhost:3005/api/users/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const result = await res.json();

      if (result.status === "success") {
        setSuccess("密碼修改成功！");
        return { success: true };
      } else {
        const errorMessage = result.message || "密碼修改失敗";
        setError(errorMessage);
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error("密碼修改網絡錯誤:", error);
      const errorMessage = "網絡連接錯誤，請稍後再試";
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  return {
    isLoading,
    error,
    success,
    validatePassword,
    validateForm,
    changePassword,
    clearMessages,
  };
};
