"use client";

import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../_components/AdminLayout";
import { useProducts } from "@/hooks/use-product";
import styles from "./edit.module.css";
import MessageModal from "@/app/admin/_components/MessageModal";
import { useParams, useRouter } from "next/navigation";
export default function ProductsPage() {
  const params = useParams(); // 獲取路由參數
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("products");
  const { mainCategories, subCategories, mainCategorysList, subCategorysList } =
    useProducts();

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
  const lpSizes = ["1LP", "2LP", "3LP", "4LP","5LP"];
  const handleNavigateToProducts = useCallback(() => {
    router.push("/admin/products");
  }, [router]);

  useEffect(() => {
    mainCategorysList();
    subCategorysList();
  }, []);
  useEffect(() => {
    const fetchProduct = async () => {
      if (params.id) {
        try {
          const response = await fetch(
            `http://localhost:3005/api/products/${params.id}`
          );
          const result = await response.json();

          if (result.status === "success") {
            const product = result.data;
            setFormData({
              name: product.name || "",
              price: product.price || "",
              artist: product.artist || "",
              stock: product.stock || "1",
              description: product.description || "",
              company_name: product.company || "",
              main_category_id: product.main_category_id || "",
              sub_category_id: product.sub_category_id || "",
               lp_size: product.lp_size || "",
              release_date: product.release_date || "",
              list: product.list || "",
            });
            // 加上這行來檢查實際的資料結構
          console.log("Product data:", product);
            // 如果有現有圖片
            if (product.pathname) {
              setImagePreview(product.pathname);
            }
          }
        } catch (error) {
          console.error("載入商品資料失敗:", error);
        }
      }
    };

    fetchProduct();
  }, [params.id]);


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
    title: "",
    message: "",
    type: "info",
    onConfirm: null,
  });

  // 顯示訊息對話框
  const showMessageModal = (
    title,
    message,
    type = "info",
    customOnConfirm = null
  ) => {
    setMessageModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm:
        customOnConfirm ||
        (() => {
          setMessageModal((prev) => ({ ...prev, isOpen: false }));
        }),
    });
  };
 const handleSubmit = async () => {
    setIsLoading(true);

    try {
      if (!formData.name || !formData.price || !formData.artist) {
        showMessageModal(
          "錯誤",
          "請填寫必填欄位：商品名稱、價格、藝人",
          "warning"
        );
        
        setIsLoading(false);
        return;
      }
         if ( !imagePreview) {
      showMessageModal("錯誤", "請上傳商品圖片", "warning");
      setIsLoading(false);
      return;
    }
      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== undefined && formData[key] !== "") {
          submitData.append(key, formData[key]);
        }
      });

      if (imageFile) {
        submitData.append("image", imageFile);
      }

      const response = await fetch(
        `http://localhost:3005/api/products/${params.id}/edit`,
        {
          method: "PUT",
          body: submitData,
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        showMessageModal("成功", "商品修改成功！", "success",handleNavigateToProducts);
      } else {
        showMessageModal("錯誤", result.message || "修改失敗", "error");
      }
    } catch (error) {
      console.error("修改商品錯誤:", error);
      showMessageModal("錯誤", "網路錯誤，請稍後再試", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h2 className={styles.title}>修改商品</h2>

          {/* 訊息顯示 */}
          {message.text && (
            <div
              className={`${styles.message} ${
                message.type === "success"
                  ? styles.messageSuccess
                  : styles.messageError
              }`}
            >
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
                <label className={styles.label}>主分類 </label>
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
                <label className={styles.label}>次分類</label>
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
                <label className={styles.label}>尺寸</label>
               <select
  name="lp_size"
  value={formData.lp_size}
  onChange={handleInputChange}
  className={styles.select}
>
  <option value="">請選擇尺寸</option>
  {lpSizes.map((size) => (
    <option key={size} value={size}>
      {size}
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
                isLoading
                  ? styles.submitButtonLoading
                  : styles.submitButtonNormal
              }`}
            >
              {isLoading ? "新增中..." : "修改商品"}
            </button>
            <button
              className={`${styles.cnacelButtoncancel} `}
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
