// 黑膠唱片資料 (從 Figma 設計中提取)
export const vinylRecords = [
  {
    id: 'tatsuro-bigwave',
    name: 'BIG WAVE（2025年版｜日盤)',
    artist: '山下達郎 Tatsuro Yamashita',
    price: 3200,
    image: '/images/vinyl/tatsuro-bigwave.jpg', // 對應 rectangle-2.png
    genre: 'City Pop',
    description: '山下達郎經典專輯 BIG WAVE 2025年重新發行版本',
    quantity: 2,
    isSelected: false,
    releaseDate: '2025',
    label: '日本盤',
  },
  {
    id: 'dongye-anhebei',
    name: '安和桥北',
    artist: '宋冬野',
    price: 1540,
    image: '/images/vinyl/dongye-anhebei.jpg', // 對應 image.png
    genre: '民謠',
    description: '2025年6月6日(五)發售',
    quantity: 1,
    isSelected: false,
    releaseDate: '2025-06-06',
    label: '華語民謠',
  },
  {
    id: 'hyukoh-sunset-aaa',
    name: 'AAA',
    artist: 'Hyukoh & 落日飛車',
    price: 1540,
    image: '/images/vinyl/hyukoh-sunset-aaa.jpg', // 對應 rectangle-3.png
    genre: 'Indie Rock',
    description: '韓國樂團 Hyukoh 與台灣樂團落日飛車合作專輯',
    quantity: 1,
    isSelected: false,
    releaseDate: '2024',
    label: '跨國合作',
  },
  {
    id: 'aran-tomoko-floating-space',
    name: '浮游空間（HMV獨家款｜粉色彩膠 LP)',
    artist: '亞蘭知子 ARAN TOMOKO',
    price: 7000,
    image: '/images/vinyl/aran-tomoko-floating.jpg', // 對應 rectangle.png
    genre: 'New Wave',
    description: 'HMV獨家粉色彩膠限定版',
    quantity: 2,
    isSelected: false,
    releaseDate: '1983',
    label: 'HMV 獨家',
    specialEdition: true,
  },
  {
    id: 'khalil-fong-the-dreamer',
    name: '梦想家 The Dreamer',
    artist: '方大同',
    price: 1540,
    image: '/images/vinyl/khalil-dreamer.jpg', // 對應 rectangle-4.png
    genre: 'R&B',
    description: '方大同個人專輯《梦想家》黑膠版',
    quantity: 1,
    isSelected: false,
    releaseDate: '2007',
    label: '華語 R&B',
  },
  {
    id: 'the-weeknd-after-hours',
    name: 'After Hours',
    artist: 'The Weeknd',
    price: 1540,
    image: '/images/vinyl/the-weeknd-after-hours.jpg', // 對應 rectangle-4.png
    genre: 'R&B',
    description: 'The Weeknd 個人專輯《After Hours》黑膠版',
    quantity: 1,
    isSelected: false,
    releaseDate: '2020',
    label: '西洋 R&B',
  },
  {
    id: 'gordon-gdna',
    name: 'GDNA',
    artist: '國蛋Gordon',
    price: 1540,
    image: '/images/vinyl/gordon-gdna.jpg', // 對應 rectangle-4.png
    genre: 'Hip Hop',
    description: 'Gordon 個人專輯《GDNA》黑膠版',
    quantity: 1,
    isSelected: false,
    releaseDate: '2023',
    label: '華語嘻哈',
  },
];

// 獲取選中的商品 (根據設計中的選中狀態)
export const getSelectedItems = () => {
  return vinylRecords.filter((item) => item.isSelected);
};

// 獲取所有商品
export const getAllVinyls = () => {
  return vinylRecords;
};

// 根據 ID 獲取商品
export const getVinylById = (id) => {
  return vinylRecords.find((item) => item.id === id);
};
