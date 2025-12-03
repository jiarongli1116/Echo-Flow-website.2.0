import React, { useState } from "react";
import styles from "./CustomerFeedback.module.css";
import { StarIcon } from "@/components/product/ProductCard";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Placeholder from 'react-bootstrap/Placeholder';
import Swal from 'sweetalert2';
const CustomerFeedback = ({
  reviews = [],
  reviewsList = () => {},
  productId = "",
  productdetail = "",
  addReview = () => {},
}) => {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  if (!productdetail) {
    return <div>載入商品資料中...</div>;
  }
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (productId) {
      const sortBy = searchParams.get("sortBy");
      const sortOrder = searchParams.get("sortOrder");

      console.log("CustomerFeedback 重新取得評論，商品ID:", productId);
      reviewsList(productId, sortBy, sortOrder);
    }
  }, [productId, searchParams.get("sortBy"), searchParams.get("sortOrder")]);
  const counts = [0, 0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    const rounded = Math.round(r.rating);
    counts[rounded]++;
  });
  const total = reviews.length;
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => {
    const percentage =
      total > 0 ? Math.round((counts[stars] / total) * 100) : 0;
    return { stars, percentage };
  });
  
  const renderStars = (rating) => {
    return Array(5)
      .fill(0)
      .map((_, index) => <StarIcon key={index} filled={index < rating} />);
  };

  const handleSortChange = async (e) => {
    const value = e.target.value;
    setIsLoading(true);

    let sortBy = null;
    let sortOrder = null;

    try {
      switch (value) {
        case "1":
          sortBy = "review_date";
          sortOrder = "ASC";
          break;
        case "2":
          sortBy = "review_date";
          sortOrder = "DESC";
          break;
        case "3":
          sortBy = "rating";
          sortOrder = "ASC";
          break;
        case "4":
          sortBy = "rating";
          sortOrder = "DESC";
          break;
        default:
          await reviewsList(productId);
          setIsLoading(false);
          return;
      }

      await reviewsList(productId, sortBy, sortOrder);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 700);
    }
  };
  // 評論表單狀態 - 移除 reviewerName
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const handleStarClick = (starValue) => {
    setRating(starValue);
  };
  // 提交評論
  const handleSubmitReview = async () => {
    if (rating === 0) {
      Swal.fire({
  icon: 'warning',
  title: '請選擇評分',
  text: '請先選擇評分！'
});
      return;
    }

    if (!user) {
     Swal.fire({
  icon: 'warning',
  title: '需要登入',
  text: '請先登入才能撰寫評論！'
});
      return;
    }
    if (!comment) {
     Swal.fire({
  icon: 'warning',
  title: '請填寫評論',
  text: '請先填寫評論內容！'
});
      return;
    }
    const reviewData = {
      rating: rating,
      users_id: user.id,
      comment: comment,
    };
    const result = await addReview(productId, reviewData);
    if (result.success) {
      // alert("評論新增成功！");
       Swal.fire({
    icon: 'success',
    title: '成功！',
    text: '評論新增成功！'
  });
      // 關閉 modal 和重置表單
      setRating(0);
      setComment("");
      const modal = document.getElementById("exampleModal");
      const bsModal = window.bootstrap.Modal.getInstance(modal);
      bsModal.hide();
    } else {
      // alert(result.message);
       Swal.fire({
    icon: 'error',
    title: '提交失敗',
    text: result.message
  });
    }
  };

  console.log(reviews);

  return (
    <div className={styles.customerFeedback}>
      {/* 標題 */}
      <div className={styles.feedbackHeader}>
        <h5 className={styles.feedbackTitle}>顧客回饋</h5>
      </div>

      <div className={styles.feedbackContent}>
        {/* 左側評分統計 */}
        <div className={styles.customerFeedbackRatingSummary}>
          <div className={styles.averageRating}>
            <span className={styles.customerFeedbackRatingNumber}>
              {productdetail.average_rating}
            </span>
            <i className={`fa-solid fa-star ${styles.ratingStar}`}></i>
          </div>

          <div className={styles.totalReviews}> {reviews.length} 則評論</div>

          <div className={styles.ratingDistribution}>
            {ratingDistribution.map((item) => (
              <div key={item.stars} className={styles.ratingBar}>
                <span className={styles.ratingLabel}>{item.stars}</span>
                <div className={styles.barContainer}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側評論列表 */}
        <div className={styles.reviewsContainer}>
          {/* 操作欄 */}
          <div className={styles.reviewsToolbar}>
            <button
              className={styles.writeReviewBtn}
              data-bs-toggle="modal"
              data-bs-target="#exampleModal"
              data-bs-whatever="@mdo"
            >
              撰寫評論
            </button>
            <div>
              <div
                className="modal fade"
                id="exampleModal"
                tabIndex={-1}
                aria-labelledby="exampleModalLabel"
                aria-hidden="true"
              >
                <div className="modal-dialog">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title fs-5" id="exampleModalLabel">
                        商品評分
                      </h5>
                      <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                      />
                    </div>
                    <div className="modal-body">
                      <form>
                        <div className="mb-3 d-flex align-items-end ">
                          <label className="col-form-label me-2">評分:</label>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "10px",
                            }}
                          >
                            {[1, 2, 3, 4, 5].map((star) => (
                              <div
                                key={star}
                                onClick={() => handleStarClick(star)}
                                style={{ cursor: "pointer" }}
                              >
                                <StarIcon filled={star <= rating} />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="mb-3">
                          <textarea
                            className="form-control"
                            id="message-text"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="寫下你的評論..."
                          />
                        </div>
                      </form>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        data-bs-dismiss="modal"
                      >
                        關閉
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSubmitReview}
                      >
                        送出
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.filterDropdown}>
              <select
                className={`form-select ${styles.sortSelect}`}
                aria-label="排序選擇"
                name="sortOrder"
                onChange={handleSortChange}
              >
                <option value="">默認排序</option>
                <option value="1">日期由舊到新</option>
                <option value="2">日期由新到舊</option>
                <option value="3">評分低到高</option>
                <option value="4">評分高到低</option>
              </select>
            </div>
          </div>

          {/* 評論列表 */}
          <div className={styles.reviewsList}>
       {isLoading ? (
  // 顯示 skeleton loading 卡片
  Array(reviews.length>3?3:reviews.length).fill(0).map((_, index) => (
    <div key={index} className={styles.reviewCard}>
      <div className={styles.reviewHeader}>
        <div className={styles.reviewerInfo}>
          {/* 用戶名稱 skeleton */}
          <div style={{
            width: '120px',
            height: '19px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}></div>
          {/* 星級評分 skeleton */}
          <div style={{
            width: '80px',
            height: '16px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            marginTop: '6px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}></div>
        </div>
        {/* 日期 skeleton */}
        <div style={{
          width: '100px',
          height: '12px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}></div>
      </div>
      {/* 評論內容 skeleton */}
      <div className={styles.reviewContent}>
        <div style={{
          width: '90%',
          height: '28px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          marginBottom: '16px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}></div>
       
      </div>
    </div>
  ))
) :  (
    // 根據 showAllReviews 決定顯示的評論數量
    (showAllReviews ? reviews : reviews.slice(0, 3)).map((review) => (
      <div key={review.id} className={styles.reviewCard}>
        <div className={styles.reviewHeader}>
          <div className={styles.reviewerInfo}>
            <p className={styles.reviewerName}>
              {review.reviewer_name}
            </p>
            <div className={styles.reviewRating}>
              {renderStars(review.rating)}
            </div>
          </div>
          <div className={styles.reviewDate}>
            張貼於 {review.review_date}
          </div>
        </div>

        <div className={styles.reviewContent}>
          <p className={styles.reviewText}>{review.comment}</p>
        </div>
      </div>
    ))
  )}
</div>

         <div className={styles.viewMore}>
  {reviews.length > 3 && !showAllReviews ? (
    <button 
      className={styles.viewMoreBtn}
      onClick={() => setShowAllReviews(true)}
    >
      查看所有 {reviews.length} 則評論
    </button>
  ) : showAllReviews ? (
    <button 
      className={styles.viewMoreBtn}
      onClick={() => setShowAllReviews(false)}
    >
      收起評論
    </button>
  ) : null}
</div>
        </div>
      </div>
    </div>
  );
};

export default CustomerFeedback;
