// FILE: api/ecpay-webhook.ts
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

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

// 計算 CheckMacValue (用來驗證綠界的通知是否為真)
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
    // 綠界 Webhook 只接受 POST 請求
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        // 1. 取得綠界傳來的參數，並分離 CheckMacValue
        const params = { ...req.body };
        const receivedMac = params.CheckMacValue;
        delete params.CheckMacValue; // 移除 CheckMacValue 以便重新計算雜湊

        // 讀取環境變數中的金鑰
        const HASH_KEY = process.env.ECPAY_HASH_KEY || '5294y06JbISpM5x9';
        const HASH_IV = process.env.ECPAY_HASH_IV || 'v77hoKGq4kWxNNIS';

        // 2. 驗證檢查碼 (防偽造)
        const calculatedMac = generateCheckMacValue(params, HASH_KEY, HASH_IV);
        if (calculatedMac !== receivedMac) {
            console.error('CheckMacValue 驗證失敗！可能有駭客試圖偽造通知。', { receivedMac, calculatedMac });
            return res.status(400).send('0|ErrorMessage'); // 回傳失敗讓綠界知道
        }

        // 3. 驗證成功！開始處理訂單與權限
        const rtnCode = params.RtnCode; // '1' 代表付款成功
        const transactionId = params.CustomField1; // 這是我們在建立訂單時偷塞的資料庫訂單 ID

        // 初始化 Supabase 後端連線 (讀取 Vercel 的環境變數)
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        if (rtnCode === '1') {
            // --- [付款成功流程] ---
            
            // A. 查詢並確認該筆訂單
            const { data: txData, error: txError } = await supabase
                .from('PointTransactions') // 注意：請確認你的資料表名稱是否為 PointTransactions
                .select('*')
                .eq('id', transactionId)
                .single();

            if (txError || !txData) throw new Error('找不到該筆訂單記錄');

            // 防呆：如果訂單已經是 SUCCESS，代表綠界重複通知，直接回傳 OK 結束
            if (txData.status === 'SUCCESS') {
                return res.send('1|OK');
            }

            // B. 更新訂單狀態為 SUCCESS
            await supabase
                .from('PointTransactions')
                .update({ status: 'SUCCESS', updated_at: new Date().toISOString() })
                .eq('id', transactionId);

            // C. 查詢使用者購買的方案內容
            const { data: packData } = await supabase
                .from('PointPacks')
                .select('*')
                .eq('id', txData.pack_id)
                .single();

            if (packData) {
                const userId = txData.user_id;
                
                // 計算應該增加的天數 (判斷是否為首購)
                const { count: prevPurchases } = await supabase
                    .from('PointTransactions')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('status', 'SUCCESS')
                    .neq('id', transactionId); // 排除剛成功這筆

                let totalDaysToAdd = packData.base_points + (packData.bonus_points || 0);
                if (prevPurchases === 0 && packData.first_time_bonus_points) {
                    totalDaysToAdd += packData.first_time_bonus_points; // 首購加贈
                }

                // D. 幫使用者展延 VIP 天數
                const { data: profile } = await supabase
                    .from('UserProfiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                let newExpiry = new Date();
                if (profile && profile.accessExpiry) {
                    const currentExpiry = new Date(profile.accessExpiry);
                    // 如果原本權限還沒過期，就從未來的到期日開始累加；若已過期，則從今天開始算
                    if (currentExpiry > newExpiry) {
                        newExpiry = currentExpiry;
                    }
                }
                
                newExpiry.setDate(newExpiry.getDate() + totalDaysToAdd);

                if (profile) {
                    await supabase
                        .from('UserProfiles')
                        .update({ accessExpiry: newExpiry.toISOString() })
                        .eq('id', userId);
                } else {
                    // 極端狀況防護：若 UserProfile 不存在，則幫他新建一筆
                    await supabase
                        .from('UserProfiles')
                        .insert({ id: userId, accessExpiry: newExpiry.toISOString() });
                }
            }

        } else {
            // --- [付款失敗流程] ---
            // RtnCode 不是 1，代表客戶刷卡失敗、額度不足或取消交易
            if (transactionId) {
                await supabase
                    .from('PointTransactions')
                    .update({ status: 'FAILED', updated_at: new Date().toISOString() })
                    .eq('id', transactionId);
            }
        }

        // 4. 無論成功或失敗，只要我們成功收到且處理完畢，都必須回傳 1|OK 給綠界
        // 這樣綠界才不會判定通知失敗而一直重複發送
        return res.send('1|OK');

    } catch (error: any) {
        console.error('ECPay Webhook 處理發生錯誤:', error);
        // 回傳錯誤，讓綠界知道我們這邊出了點狀況，它過陣子會再試一次
        return res.status(500).send('0|ErrorMessage');
    }
}