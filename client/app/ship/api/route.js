import { NextResponse } from 'next/server';

export async function POST(request) {
  let body = null;

  try {
    body = await request.formData();
    console.log('711 API 路由收到表單資料:', body);

    // 將 FormData 轉換為普通物件
    const formDataObj = {};
    for (const [key, value] of body.entries()) {
      formDataObj[key] = value;
    }

    console.log('711 API 路由處理後的資料:', formDataObj);

    // 使用 NextResponse.redirect 進行重導向
    const queryParams = new URLSearchParams(formDataObj).toString();
    const redirectUrl = `/ship/callback?${queryParams}`;

    console.log('711 API 路由重導向到:', redirectUrl);

    // 使用 HTML 重導向頁面
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>711 門市選擇回調</title>
        </head>
        <body>
          <script>
            // 立即重導向到回調頁面
            window.location.href = '${redirectUrl}';
          </script>
          <p>正在重導向到 711 門市選擇回調頁面...</p>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('711 API 路由處理錯誤:', error);
    return NextResponse.json({ message: 'Error', error }, { status: 500 });
  }
}
