import express from 'express';
const router = express.Router();
import * as crypto from 'crypto';
import connection from '../connect.js';
// import { isDev, successResponse, errorResponse } from '../lib/utils.js'
const isDev = true;
const errorResponse = (res, message) => {
  return res.status(400).json({
    status: 'error',
    message,
  });
};
const successResponse = (res, data) => {
  return res.status(200).json({
    status: 'success',
    data,
  });
};

/* GET home page. */
// http://localhost:3005/api/ecpay-test?amount=2500&items=商品1X2,商品2X3
router.get('/', function (req, res) {
  // 目前只需要一個參數，總金額。其它的可以自行設定
  const amount = Number(req.query.amount) || 0;
  const items = req.query.items ? decodeURIComponent(req.query.items) : '';
  const orderId = req.query.orderId; // 新增：接收訂單 ID

  console.log('🔍 ECPay 接收到的參數:');
  console.log('amount:', amount);
  console.log('items:', items);
  console.log('orderId:', orderId);
  console.log('orderId type:', typeof orderId);

  // 處理商品明細參數
  let itemName = '線上商店購買一批';

  if (items && items.trim() !== '') {
    try {
      // 解析 items 參數：格式為 "商品1X數量1,商品2X數量2"
      const itemList = items.split(',').map((item) => {
        const trimmed = item.trim();
        // 檢查是否包含 X 符號（表示有數量）
        if (trimmed.includes('X')) {
          const [name, quantity] = trimmed.split('X');
          return `${name.trim()} X${quantity.trim()}`; // 保持 "商品 X數量" 格式
        } else {
          // 如果沒有 X 符號，當作單一商品
          return trimmed;
        }
      });

      // 如果有多個商品，用 # 連接；單一商品直接使用
      itemName = itemList.length > 1 ? itemList.join('#') : itemList[0];

      // 清理 ItemName：移除可能導致問題的特殊字符
      itemName = itemName
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9#\s\-\.X]/g, '') // 只保留中文、英文、數字、#、空格、-、.、X
        .replace(/\s+/g, ' ') // 將多個空格合併為單個空格
        .trim();

      // 限制長度（ECPay ItemName 最大 400 字元）
      if (itemName.length > 400) {
        itemName = itemName.substring(0, 397) + '...';
      }

      // 如果清理後為空，使用預設值
      if (!itemName || itemName.trim() === '') {
        itemName = '線上商店購買一批';
      }
    } catch (error) {
      console.error('解析商品明細失敗:', error);
      itemName = '線上商店購買一批';
    }
  }

  if (isDev) {
    console.log('=== ECPay 參數調試 ===');
    console.log('amount:', amount);
    console.log('items (原始):', items);
    console.log('itemName (處理後):', itemName);
    console.log('itemName 長度:', itemName.length);
    console.log('itemName 編碼:', encodeURIComponent(itemName));
  }

  if (!amount) {
    return errorResponse(res, '缺少總金額');
  }

  //綠界全方位金流技術文件：
  // https://developers.ecpay.com.tw/?p=2856
  // 信用卡測試卡號：4311-9522-2222-2222 安全碼 222

  ////////////////////////改以下參數即可////////////////////////
  //一、選擇帳號，是否為測試環境
  const MerchantID = '3002607'; //必填
  const HashKey = 'pwFHCqoQZGmho4w6'; //3002607
  const HashIV = 'EkRm7iFT261dpevs'; //3002607
  let isStage = true; // 測試環境： true；正式環境：false

  //二、輸入參數
  const TotalAmount = amount; //整數，不可有小數點。金額不可為0。
  const TradeDesc = '商店線上付款'; // String(200)
  const ItemName = itemName; // String(400) 如果商品名稱有多筆，需在金流選擇頁一行一行顯示商品名稱的話，商品名稱請以符號#分隔。

  // 付款結果通知回傳網址(這網址可能需要網路上的真實網址或IP，才能正確接收回傳結果)
  const ReturnURL = 'https://www.ecpay.com.tw';
  ////////////////////////以下參數不用改////////////////////////
  const stage = isStage ? '-stage' : '';
  const algorithm = 'sha256';
  const digest = 'hex';
  const APIURL = `https://payment${stage}.ecpay.com.tw//Cashier/AioCheckOut/V5`;
  // 生成 MerchantTradeNo
  let MerchantTradeNo;
  let finalOrderId;

  // 生成唯一的 MerchantTradeNo (限制在 20 字元內)
  const now = new Date();
  // 使用較短的時間戳格式：年月日時分秒毫秒 (15字元)
  const timestamp = `${now.getFullYear().toString().slice(-2)}${(
    now.getMonth() + 1
  )
    .toString()
    .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now
    .getHours()
    .toString()
    .padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now
    .getSeconds()
    .toString()
    .padStart(2, '0')}${now.getMilliseconds().toString().padStart(3, '0')}`;

  if (orderId) {
    // 如果有傳入 orderId，使用時間戳 + orderId 確保唯一性
    // 格式：od + 15字元時間戳 + orderId (最多3字元，總長度不超過20)
    const orderIdStr = orderId.toString();
    const maxOrderIdLength = 20 - 2 - 15; // 20 - 'od' - 時間戳 = 3字元
    const truncatedOrderId = orderIdStr.slice(-maxOrderIdLength);
    MerchantTradeNo = `od${timestamp}${truncatedOrderId}`;
    console.log('🔍 使用傳入的 orderId:', orderId);
    console.log(
      '🔍 生成的 MerchantTradeNo:',
      MerchantTradeNo,
      '(長度:',
      MerchantTradeNo.length,
      ')',
    );
  } else {
    // 如果沒有 orderId，生成新的
    MerchantTradeNo = `od${timestamp}`;
    console.log(
      '🔍 生成新的 MerchantTradeNo:',
      MerchantTradeNo,
      '(長度:',
      MerchantTradeNo.length,
      ')',
    );
  }

  // (二選一)以下這個設定，會有回傳結果，但要用前端的api路由來接收並協助重新導向到前端成功callback頁面(不用時下面要83~97從中的值要註解)
  //const OrderResultURL = 'http://localhost:3000/ecpay/api' //前端成功頁面api路由(POST)
  // (二選一)以下這個設定，不會任何回傳結果(不用時下面要83~97從中的值要註解)
  // 生成訂單編號用於成功回調
  const ClientBackURL = `http://localhost:3000/cart/checkout/success?orderId=${
    orderId || MerchantTradeNo
  }`; //前端成功頁面
  const ChoosePayment = 'ALL';

  const MerchantTradeDate = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  //三、計算 CheckMacValue 之前
  let ParamsBeforeCMV = {
    MerchantID: MerchantID,
    MerchantTradeNo: MerchantTradeNo,
    MerchantTradeDate: MerchantTradeDate.toString(),
    PaymentType: 'aio',
    EncryptType: 1,
    TotalAmount: TotalAmount,
    TradeDesc: TradeDesc,
    ItemName: ItemName,
    ReturnURL: ReturnURL,
    ChoosePayment: ChoosePayment,
    // OrderResultURL,
    ClientBackURL,
  };

  //四、計算 CheckMacValue
  function CheckMacValueGen(parameters, algorithm, digest) {
    // 過濾掉空值參數
    const filteredParams = Object.entries(parameters)
      .filter(
        ([key, value]) => value !== null && value !== undefined && value !== '',
      )
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    let Step0 = Object.entries(filteredParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    function DotNETURLEncode(string) {
      const list = {
        '%2D': '-',
        '%5F': '_',
        '%2E': '.',
        '%21': '!',
        '%2A': '*',
        '%28': '(',
        '%29': ')',
        '%20': '+',
      };

      Object.entries(list).forEach(([encoded, decoded]) => {
        const regex = new RegExp(encoded, 'g');
        string = string.replace(regex, decoded);
      });

      return string;
    }

    const Step1 = Step0.split('&')
      .sort((a, b) => {
        const keyA = a.split('=')[0];
        const keyB = b.split('=')[0];
        return keyA.localeCompare(keyB);
      })
      .join('&');
    const Step2 = `HashKey=${HashKey}&${Step1}&HashIV=${HashIV}`;
    const Step3 = DotNETURLEncode(encodeURIComponent(Step2));
    const Step4 = Step3.toLowerCase();
    const Step5 = crypto.createHash(algorithm).update(Step4).digest(digest);
    const Step6 = Step5.toUpperCase();

    if (isDev) {
      console.log('Step0:', Step0);
      console.log('Step1:', Step1);
      console.log('Step2:', Step2);
      console.log('Step3:', Step3);
      console.log('Step4:', Step4);
      console.log('Step5:', Step5);
      console.log('Step6 (CheckMacValue):', Step6);
    }

    return Step6;
  }
  const CheckMacValue = CheckMacValueGen(ParamsBeforeCMV, algorithm, digest);

  if (isDev) {
    console.log('=== CheckMacValue 計算過程 ===');
    console.log('ParamsBeforeCMV:', JSON.stringify(ParamsBeforeCMV, null, 2));
    console.log('CheckMacValue:', CheckMacValue);
  }

  //五、將所有的參數製作成 payload
  const AllParams = { ...ParamsBeforeCMV, CheckMacValue };

  // 六、製作送出畫面
  //
  // # region --- 純後端送出form的作法，可以進行簡單的測試用  ---

  const inputs = Object.entries(AllParams)
    .map(function (param) {
      return `<input name=${
        param[0]
      } value="${param[1].toString()}" style="display:none"><br/>`;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title></title>
    </head>
    <body>
        <form method="post" action="${APIURL}" style="display:none">
    ${inputs}
    <input type="submit" value="送出參數" style="display:none">
        </form>
    <script>
      document.forms[0].submit();
    </script>
    </body>
    </html>
    `;
  res.send(htmlContent);
  // # endregion ----------------------------------------

  // 送至react前端，由前端產生表單控制送出的動作
  // 這是為了在前端可以更靈活的控制送出的動作
  // action: 表單送出的網址, params: 所有表單中的欄位參數值
  //successResponse(res, { action: APIURL, params: AllParams })
});

export default router;
