// FILE: api/ecpay-result.ts

export default async function handler(req: any, res: any) {
    // 綠界結帳完成後，會自動用 POST 方式將交易結果打到這個網址。
    // 我們不需要在這裡做複雜的驗證（驗證與開通會交給 Webhook 在背景處理，以防客戶把網頁關掉）。
    // 這裡的唯一任務就是：把 POST 請求截斷，並轉換成標準的 302 網頁重定向，
    // 瞬間把客戶導向我們前端的 React 付款結果頁。
    
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    
    // 目標網址：前端的付款結果頁面
    const targetUrl = `${protocol}://${host}/payment-result`;

    // 執行重定向
    res.redirect(302, targetUrl);
}