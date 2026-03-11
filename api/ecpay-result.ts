// FILE: api/ecpay-result.ts

export default async function handler(req: any, res: any) {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    
    // 從綠界回傳的 POST 內容中提取參數
    const orderId = req.body.CustomField1 || '';
    const orderType = req.body.CustomField2 || 'STORE';
    const amount = req.body.TradeAmt || '';
    
    // 目標網址：前端的付款結果頁面，附帶狀態參數
    const targetUrl = `${protocol}://${host}/payment-result?type=${orderType}&id=${orderId}&amt=${amount}`;

    res.redirect(302, targetUrl);
}