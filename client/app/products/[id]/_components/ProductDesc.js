import React, { useState } from "react";
import styles from "./ProductDesc.module.css";

const ProductDesc = ({ productdetail }) => {
  const [activeTab, setActiveTab] = useState("description");

  // Spotify 嵌入播放器組件
  const SpotifyPlayer = ({ spotifyAlbumId }) => {
    if (!spotifyAlbumId) {
      return (
        <div className={styles.spotifyEmpty}>
          <p>此商品暫未提供 Spotify 試聽</p>
          <p>演出者：{productdetail.artist}</p>
          <p>專輯：{productdetail.name}</p>
        </div>
      );
    }

    return (
      <div className={styles.spotifyPlayer}>
        <h3>Spotify 試聽</h3>
        <iframe
          src={`https://open.spotify.com/embed/album/${spotifyAlbumId}?utm_source=generator&theme=0`}
          width="100%"
          height="352"
          allowFullScreen=""
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Spotify Player"
        ></iframe>
      </div>
    );
  };
  
  if (!productdetail) {
    return (
      <div className={styles.productDescTabs}>
        <div className={styles.productDescTabContent}>
          <p>載入商品描述中...</p>
        </div>
      </div>
    );
  }

  const formatReleaseDate = (dateString) => {
    if (!dateString) return "發行日期未定";
    
    // If already in YYYY-MM-DD format
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return `發行日期：${year}年${month}月${day}日`;
    }
    
    // Handle other formats if needed
    return `發行日期：${dateString}`;
  };

  // Helper function to parse tracklist
  const parseTracklist = (tracklistString) => {
    if (!tracklistString || tracklistString === "0" || tracklistString === "1") {
      return [];
    }
    
    // Split by newlines and filter out empty lines
    const tracks = tracklistString
      .split('\n')
      .map(track => track.trim())
      .filter(track => track.length > 0);
    
    return tracks;
  };

  const tabs = [
    { id: "description", label: "商品介紹" },
    { id: "spotify", label: "Spotify試聽" },
    { id: "tracklist", label: "曲目表" },
    { id: "notice", label: "注意事項" },
  ];

  const tabContent = {
    description: (
      <div className={styles.productDescTabContent}>
        <h3>{productdetail.name}</h3>
        {productdetail.artist && (
          <p><strong>演出者：</strong>{productdetail.artist}</p>
        )}
        <p>{productdetail.desc || productdetail.description}</p>

        <h4>[ 唱片資訊 ]</h4>
        <ul>
          <li>唱片公司：{productdetail.company || "未提供"}</li>
          <li>{formatReleaseDate(productdetail.release_date)}</li>
        </ul>

        <p className={styles.productDescNoticeText}>
          <br />
          (黑膠唱片為手工製作，若有輕微瑕疵為正常現象)
        </p>
      </div>
    ),
    
    // 🎵 修正後的 Spotify 標籤內容
    spotify: (
      <div className={styles.productDescTabContent}>
        <SpotifyPlayer spotifyAlbumId={productdetail.spotify_album_id} />
      </div>
    ),
    
    tracklist: (
      <div className={styles.productDescTabContent}>
        <h3>曲目表</h3>
        <div className={styles.productDescTracklist}>
          {(() => {
            const tracks = parseTracklist(productdetail.list);
            
            if (tracks.length === 0) {
              return (
                <>
                  <div className={styles.productDescTrackItem}>
                    <span className={styles.productDescTrackNumber}>01</span>
                    <span className={styles.productDescTrackTitle}>Coming Soon...</span>
                  </div>
                  <div className={styles.productDescTrackItem}>
                    <span className={styles.productDescTrackNumber}>02</span>
                    <span className={styles.productDescTrackTitle}>待公布</span>
                  </div>
                  <p className={styles.productDescTracklistNote}>曲目表將於發行前更新</p>
                </>
              );
            }
            
            return (
              <>
                {tracks.map((track, index) => {
                  // Remove numbering from track if it already exists
                  const cleanTrack = track.replace(/^\d+\.?\s*/, '');
                  
                  return (
                    <div key={index} className={styles.productDescTrackItem}>
                      <span className={styles.productDescTrackNumber}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className={styles.productDescTrackTitle}>
                        {cleanTrack}
                      </span>
                    </div>
                  );
                })}
                <p className={styles.productDescTracklistNote}>
                  共收錄 {tracks.length} 首作品
                </p>
              </>
            );
          })()}
        </div>
      </div>
    ),
    
    notice: (
      <div className={styles.productDescTabContent}>
        <h3>注意事項</h3>
        <div className={styles.productDescNoticeSection}>
          <h4>出貨規則</h4>
          <p>
            同筆訂單同時出貨！請注意各張唱片的發行及到貨時間，本店將以訂單湊齊為發貨原則，如有需要優先出貨請分別下單。
          </p>

          <h4>訂單成立</h4>
          <p>
            預購商品付款方式如選擇網路轉帳：下單後請於「3日內」在IG、Line
            或FB附上匯款明細及訂單編號（#XXXX），逾期則取消訂單。
          </p>

          <h4>商品內容</h4>
          <p>已廠商實際到貨為準（圖片僅供參考）</p>

          <h4>進貨週期</h4>
          <p>
            預購商品進貨週期為10至35天。每月月底固定進貨（如有更動請關注IG,
            FB最新消息）
          </p>
          <h4>無七天試用期</h4>
          <p>
            消費者保護法指出，影音類型相關產品，無7天試用期，且無故不取貨則會面臨民事訴訟責任。
          </p>
        </div>
      </div>
    ),
  };

  return (
    <div className={styles.productDescTabs}>
      {/* 標籤導航 */}
      <div className={styles.productDescNav}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.productDescButton} ${activeTab === tab.id ? styles.active : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 標籤內容 */}
      <div
        className={`${styles.productDescContent} ${activeTab ? styles.active : ""}`}
      >
        {tabContent[activeTab]}
      </div>
    </div>
  );
};

export default ProductDesc;