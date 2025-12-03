"use client";

import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../_components/AdminLayout";
import { useProducts } from "@/hooks/use-product";
import styles from "./ProductsPage.module.css";
import MessageModal from '@/app/admin/_components/MessageModal'
import { useRouter } from 'next/navigation';
export default function ProductsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("products");
  const {
    mainCategories,
    subCategories,
    mainCategorysList,
    subCategorysList,
  } = useProducts();
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    artist: "",
    stock: "1",
    description: "",
    company_name: "",
    main_category_id: "",
    sub_category_id: "",
    lp_id: "",
    release_date: "",
    list: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    mainCategorysList();
    subCategorysList();
  }, []);

  const lpSizes = [
    { id: 1, size: "1LP" },
    { id: 2, size: "2LP" },
    { id: 3, size: "3LP" },
    { id: 4, size: "4LP" },
    { id: 5, size: "5LP" },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNavigateToProducts = useCallback(() => {
  router.push('/admin/products');
}, [router]);
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const getFilteredSubCategories = () => {
    if (!formData.main_category_id) return [];
    return subCategories.filter(
      (sub) => sub.main_category_id === parseInt(formData.main_category_id)
    );
  };

  const handleMainCategoryChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      main_category_id: e.target.value,
      sub_category_id: "",
    }));
  };
     const [messageModal, setMessageModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null,
    })

  // 顯示訊息對話框
 const showMessageModal = (title, message, type = "info", customOnConfirm = null) => {
  setMessageModal({
    isOpen: true,
    title,
    message,
    type,
    onConfirm: customOnConfirm || (() => {
      setMessageModal(prev => ({ ...prev, isOpen: false }));
    }),
  });
};
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (!formData.name || !formData.price || !formData.artist|| !formData.main_category_id|| !formData.sub_category_id|| !formData.lp_id) {
        showMessageModal("錯誤", "請填寫必填欄位","warning");
        setIsLoading(false);
        return;
      }
        if (!imageFile) {
      showMessageModal("錯誤", "請上傳商品圖片", "warning");
      setIsLoading(false);
      return;
    }

      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      if (imageFile) {
        submitData.append("image", imageFile);
      }

      const response = await fetch("http://localhost:3005/api/products", {
        method: "POST",
        body: submitData,
      });

      const result = await response.json();

      if (result.status === "success") {
        showMessageModal("success", "商品新增成功！","success",handleNavigateToProducts);
        setFormData({
          name: "",
          price: "",
          artist: "",
          stock: "1",
          description: "",
          company_name: "",
          main_category_id: "",
          sub_category_id: "",
          lp_id: "",
          release_date: "",
          list: "",
        });
        setImageFile(null);
        setImagePreview(null);
      } else {
        showMessageModal("error", result.message || "新增失敗","error");
      }
    } catch (error) {
      console.error("新增商品錯誤:", error);
      showMessageModal("error", "網路錯誤，請稍後再試","error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h2 className={styles.title}>新增商品</h2>

          {/* 訊息顯示 */}
          {message.text && (
            <div className={`${styles.message} ${
              message.type === "success" ? styles.messageSuccess : styles.messageError
            }`}>
              {message.text}
            </div>
          )}

          {/* 基本資訊 */}
          <div className={styles.formSection}>
            <div className={styles.gridTwoColumns}>
              <div>
                <label className={styles.label}>
                  商品名稱 <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="請輸入商品名稱"
                />
              </div>

              <div>
                <label className={styles.label}>
                  藝人 <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="artist"
                  value={formData.artist}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="請輸入藝人名稱"
                />
              </div>
            </div>

            <div className={styles.gridThreeColumnsWithMargin}>
              <div>
                <label className={styles.label}>
                  價格 <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className={styles.input}
                  placeholder="0"
                />
              </div>

              <div>
                <label className={styles.label}>庫存</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  min="0"
                  className={styles.input}
                />
              </div>

              <div>
                <label className={styles.label}>發行日期</label>
                <input
                  type="date"
                  name="release_date"
                  value={formData.release_date}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>
            </div>

            <div>
              <label className={styles.label}>商品描述</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                className={styles.textarea}
                placeholder="請輸入商品描述..."
              />
            </div>
          </div>

          {/* 分類資訊 */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>分類資訊</h3>

            <div className={styles.gridThreeColumns}>
              <div>
                <label className={styles.label}>主分類<span className={styles.required}>*</span></label>

                <select
                  name="main_category_id"
                  value={formData.main_category_id}
                  onChange={handleMainCategoryChange}
                  className={styles.select}
                >
                  <option value="">請選擇主分類</option>
                  {mainCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={styles.label}>次分類<span className={styles.required}>*</span></label>
                <select
                  name="sub_category_id"
                  value={formData.sub_category_id}
                  onChange={handleInputChange}
                  disabled={!formData.main_category_id}
                  className={`${styles.select} ${
                    !formData.main_category_id ? styles.selectDisabled : ""
                  }`}
                >
                  <option value="">請選擇次分類</option>
                  {getFilteredSubCategories().map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={styles.label}>尺寸<span className={styles.required}>*</span></label>
                <select
                  name="lp_id"
                  value={formData.lp_id}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value="">請選擇尺寸</option>
                  {lpSizes.map((size) => (
                    <option key={size.id} value={size.id}>
                      {size.size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.gridSingleColumn}>
              <label className={styles.label}>公司名稱</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="請輸入公司名稱（如不存在將自動建立）"
              />
            </div>
          </div>

          {/* 曲目表 */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>曲目表</h3>
            <textarea
              name="list"
              value={formData.list}
              onChange={handleInputChange}
              rows="6"
              className={styles.textarea}
              placeholder="請輸入曲目，每行一首歌曲"
            />
            <small className={styles.helpText}>
              範例：
              <br />
              1. Song Title 1<br />
              2. Song Title 2<br />
              3. Song Title 3
            </small>
          </div>

          {/* 圖片上傳 */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>商品圖片</h3>

            {!imagePreview ? (
              <div
                className={styles.imageUploadArea}
                onClick={() => document.getElementById("imageInput").click()}
              >
                <p className={styles.imageUploadText}>點擊選擇圖片</p>
                <p className={styles.imageUploadSubtext}>
                  支持 JPG、PNG 格式，檔案大小不超過 5MB
                </p>
              </div>
            ) : (
              <div className={styles.imagePreviewContainer}>
                <div className={styles.imagePreviewWrapper}>
                  <img
                    src={imagePreview}
                    alt="預覽"
                    className={styles.imagePreview}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className={styles.imageRemoveButton}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <input
              id="imageInput"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={styles.hiddenInput}
            />
          </div>

          {/* 提交按鈕 */}
          <div className={styles.submitSection}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className={`${styles.submitButton} ${
                isLoading ? styles.submitButtonLoading : styles.submitButtonNormal
              }`}
            >
              {isLoading ? "新增中..." : "新增商品"}
            </button>
           <button 
  type="button" 
  className={`${styles.cancelButton} ms-2`}
  onClick={() => router.push(`/admin/products`)}
>
  取消
</button>
          </div>
        </div>
      </div>
        <MessageModal
                isOpen={messageModal.isOpen}
                title={messageModal.title}
                message={messageModal.message}
                type={messageModal.type}
                confirmText="確定"
              onConfirm={messageModal.onConfirm} 
            />
    </AdminLayout>
  );
}