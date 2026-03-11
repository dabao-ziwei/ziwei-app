// FILE: api/create-ecpay-order.ts
import crypto from 'crypto';

// 綠界專用的 URL Encode
function ecpayUrlEncode(str: string) {
    return encodeURIComponent(str)
        .replace(/%20/g, '+')
        .replace(/%2d/g, '-')
        .replace(/%5f/g, '_')
        .replace(/%2e/g, '.')
        .replace(/%21/g, '!')
        .replace(/%2a/g, '*')
        .replace(/%28/g, '(')
        .replace(/%29/g, ')');
}

// 計算 CheckMacValue
function generateCheckMacValue(params: Record<string, string>, hashKey: string, hashIv: string) {
    const sortedKeys = Object.keys(params).sort();
    let macStr = `HashKey=${hashKey}`;
    
    for (const key of sortedKeys) {
        macStr += `&${key}=${params[key]}`;
    }
    macStr += `&HashIV=${hashIv}`;
    
    const encodedStr = ecpayUrlEncode(macStr).toLowerCase();
    return crypto.createHash('sha256').update(encodedStr).digest('hex').toUpperCase();
}

// Vercel Serverless Function 進入點
export default async function handler(req: any, res: any) {
    // 處理 CORS (允許跨域請求)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { amount, itemName, tradeDesc, customField1 } = req.body;

        // 從 Vercel 環境變數讀取金鑰 (預設給綠界測試金鑰)
        const MERCHANT_ID = process.env.ECPAY_MERCHANT_ID || '2000132';
        const HASH_KEY = process.env.ECPAY_HASH_KEY || '5294y06JbISpM5x9';
        const HASH_IV = process.env.ECPAY_HASH_IV || 'v77hoKGq4kWxNNIS';
        
        // 取得目前的網站網域，自動組出 Webhook 網址
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const RETURN_URL = process.env.ECPAY_RETURN_URL || `${protocol}://${host}/api/ecpay-webhook`;
        
        // 正式環境請改為 https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5
        const ACTION_URL = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'; 

        // 產生訂單編號
        const date = new Date();
        const tradeNo = `DZ${date.getTime()}${Math.floor(Math.random() * 1000)}`;
        
        const pad = (n: number) => n.toString().padStart(2, '0');
        const tradeDate = `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

        const params: Record<string, string> = {
            MerchantID: MERCHANT_ID,
            MerchantTradeNo: tradeNo,
            MerchantTradeDate: tradeDate,
            PaymentType: 'aio',
            TotalAmount: amount.toString(),
            TradeDesc: tradeDesc || '大寶紫微斗數服務',
            ItemName: itemName || '命理諮詢服務',
            ReturnURL: RETURN_URL,
            ChoosePayment: 'Credit',
            EncryptType: '1',
            CustomField1: customField1 || '',
            ClientBackURL: `${protocol}://${host}/payment-result` // 跳轉回付款結果頁
        };

        // 壓上加密檢查碼
        params['CheckMacValue'] = generateCheckMacValue(params, HASH_KEY, HASH_IV);

        return res.status(200).json({ 
            success: true, 
            actionUrl: ACTION_URL, 
            params,
            tradeNo 
        });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
}