import express from 'express';
import multer from 'multer';
import cors from 'cors';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase } from './connect.js';
import path from 'path';
import { fileURLToPath } from 'url';

// websocket需要做的包裝 掛在現有的 HTTP server 上同埠 3005
import http from "http";
import { setupChatWSS } from "./lib/chat-wss.js"; // ← 路徑改這裡

// 宋做的修改：因應linepay需要設定 session
import session from 'express-session';

// Router設定區
import homeRouter from './routes/home.js';
import usersRouter from './routes/users.js';
import productsRouter from './routes/products.js';
import couponsRouter from './routes/coupons.js';
import cartRouter from './routes/carts.js';
import ordersRouter from './routes/orders.js';
import addressesRouter from './routes/addresses.js';
import pointsRouter from './routes/points.js';
import forumsRouter from './routes/forums.js';
import mailRouter from './routes/mail.js';
import chatRoutes from "./routes/chat.js";

// 宋做的修改：使用 linepay 路由
import linepayRouter from './routes/line-pay-test.js';
// 宋做的修改：使用 ecpay 路由
import ecpayRouter from './routes/ecpay-test.js';

// 設定區
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定 multer 用於檔案上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads', 'avatars'));
  },
  filename: function (req, file, cb) {
    // 生成唯一檔名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 限制 5MB
  },
  fileFilter: function (req, file, cb) {
    // 只允許圖片檔案
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片檔案'), false);
    }
  },
});

// 設定 CORS
let whitelist = [
  'http://localhost:5500',
  'http://localhost:3000',
  'http://172.22.35.114:3000',
];

let corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

// 路由區
const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 宋做的修改：添加 session 中間件
app.use(
  session({
    secret: 'echoflow', // 請替換為安全的密鑰
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // 開發環境設為 false
  }),
);

// 設定靜態檔案服務
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 讓圖放在 server/public/forums/icons/* 能以 /static/forums/icons/* 對外提供
app.use('/static', express.static(path.join(process.cwd(), 'public')));

// ★ 新增：讓 /uploads/forums/* 指到 public/uploads/forums/*
app.use(
  '/uploads/forums',
  express.static(path.join(process.cwd(), 'public/uploads/forums')),
);

// 將 upload 設定傳遞給路由
//調整順序，不可以在路由之下，要先設定
app.locals.upload = upload;

app.get('/', (req, res) => {
  res.send('首頁');
});

// 使用 home 路由>>>仁甫記得改好打開
app.use('/api/home', homeRouter);

// 使用 coupons 路由>>>仁甫記得改好打開
app.use('/api/coupons', couponsRouter);

// 使用 users 路由
app.use('/api/users', usersRouter);

// 使用 cart 路由
app.use('/api/carts', cartRouter);

// 使用 orders 路由
app.use('/api/orders', ordersRouter);

//使用products路由
app.use('/api/products', productsRouter);

// 使用 addresses 路由
app.use('/api/addresses', addressesRouter);

// 使用 points 路由
app.use('/api/points', pointsRouter);

// 使用 forums 路由
app.use('/api/forums', forumsRouter);

// 使用 mail 路由
app.use('/api/mail', mailRouter);

// 宋做的修改：使用 linepay 路由
app.use('/api/linepay', linepayRouter);

// 宋做的修改：使用 ecpay 路由
app.use('/api/ecpay', ecpayRouter);

// 使用 chat 路由
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 3005;

// 用 HTTP server 包住 app，才能把 WSS 掛在同埠
const server = http.createServer(app);

// ★ 掛上 WebSocket（路徑保持 /ws/chat 不變）
setupChatWSS(server, { path: "/ws/chat" });

// 在伺服器啟動時測試連線
server.listen(3005, async () => {
  console.log(`主機+WS啟動 http://localhost:${PORT}`);

  await initializeDatabase();
});
