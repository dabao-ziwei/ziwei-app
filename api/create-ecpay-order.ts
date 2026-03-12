// FILE: api/create-ecpay-order.ts
import crypto from 'crypto';

function ecpayUrlEncode(str: string) {
    return encodeURIComponent(str).replace(/%20/g, '+').replace(/%2d/g, '-').replace(/%5f/g, '_').replace(/%2e/g, '.').replace(/%21/g, '!').replace(/%2a/g, '*').replace(/%28/g, '(').replace(/%29/g, ')');
}

function generateCheckMacValue(params: Record<string, string>, hashKey: string, hashIv: string) {
    const sortedKeys = Object.keys(params).sort();
    let macStr = `HashKey=${hashKey}`;
    for (const key of sortedKeys) { macStr += `&${key}=${params[key]}`; }
    macStr += `&HashIV=${hashIv}`;
    return crypto.createHash('sha256').update(ecpayUrlEncode(macStr).toLowerCase()).digest('hex').toUpperCase();
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

    try {
        const { amount, itemName, tradeDesc, customField1, orderType } = req.body;

        // 1. 強制讀取正式環境變數 (拔除所有測試金鑰)
        const MERCHANT_ID = process.env.ECPAY_MERCHANT_ID;
        const HASH_KEY = process.env.ECPAY_HASH_KEY;
        const HASH_IV = process.env.ECPAY_HASH_IV;

        if (!MERCHANT_ID || !HASH_KEY || !HASH_IV) {
            throw new Error('伺服器未設定綠界正式金鑰，請檢查 Vercel 環境變數');
        }

        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;

        const tradeNo = `DB${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const tradeDate = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/-/g, '/');

        const params: Record<string, string> = {
            MerchantID: MERCHANT_ID,
            MerchantTradeNo: tradeNo,
            MerchantTradeDate: tradeDate,
            PaymentType: 'aio',
            TotalAmount: amount.toString(),
            TradeDesc: tradeDesc || '大寶紫微斗數服務',
            ItemName: itemName || '訂閱方案/預約諮詢',
            ReturnURL: `${baseUrl}/api/ecpay-webhook`,
            OrderResultURL: `${baseUrl}/api/ecpay-result`,
            ChoosePayment: 'Credit',
            EncryptType: '1',
            CustomField1: customField1 || '',
            CustomField2: orderType || 'STORE'
        };

        params.CheckMacValue = generateCheckMacValue(params, HASH_KEY, HASH_IV);

        // 2. 切換為綠界【正式環境】的刷卡網址
        const actionUrl = 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5';

        res.status(200).json({ success: true, actionUrl, params });
    } catch (error: any) {
        console.error('Create ECPay Order Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}