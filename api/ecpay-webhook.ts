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
            console.error('[Webhook 錯誤] CheckMacValue 驗證失敗！可能有駭客試圖偽造通知。', { receivedMac, calculatedMac });
            return res.status(400).send('0|ErrorMessage'); 
        }

        // 3. 驗證成功！開始處理訂單與權限
        const rtnCode = params.RtnCode; 
        const transactionId = params.CustomField1; 
        const tradeNo = params.TradeNo; // 綠界的交易編號

        // 初始化 Supabase 後端連線 (使用 Service Role Key)
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        if (rtnCode === '1') {
            console.log(`[Webhook 執行] 收到成功付款通知，訂單 ID: ${transactionId}`);
            
            // A. 查詢並確認該筆訂單 (對齊 Schema: point_transactions)
            const { data: txData, error: txError } = await supabase
                .from('point_transactions')
                .select('*')
                .eq('id', transactionId)
                .single();

            if (txError || !txData) {
                console.error('[Webhook 資料庫錯誤] 查詢訂單失敗:', txError);
                throw new Error(`找不到該筆訂單記錄 (ID: ${transactionId})`);
            }

            // 防呆：如果訂單已經是 SUCCESS，代表綠界重複通知，直接回傳 OK 結束
            if (txData.status === 'SUCCESS') {
                console.log('[Webhook 提醒] 該筆訂單已是 SUCCESS 狀態，略過處理。');
                return res.send('1|OK');
            }

            // B. 更新訂單狀態為 SUCCESS (對齊 Schema: paid_at, provider_trade_no)
            const { error: updateTxError } = await supabase
                .from('point_transactions')
                .update({ 
                    status: 'SUCCESS', 
                    paid_at: new Date().toISOString(),
                    provider_trade_no: tradeNo 
                })
                .eq('id', transactionId);

            if (updateTxError) {
                console.error('[Webhook 資料庫錯誤] 更新訂單狀態失敗:', updateTxError);
                throw new Error('更新訂單狀態失敗');
            }

            // C. 查詢使用者購買的方案內容 (對齊 Schema: point_packs, point_pack_id)
            const { data: packData, error: packError } = await supabase
                .from('point_packs')
                .select('*')
                .eq('id', txData.point_pack_id)
                .single();

            if (packError || !packData) {
                console.error('[Webhook 資料庫錯誤] 查詢方案失敗:', packError);
                throw new Error('找不到對應的方案紀錄');
            }

            const userId = txData.user_id;
            
            // 計算應該增加的天數 (判斷是否為首購)
            const { count: prevPurchases, error: countError } = await supabase
                .from('point_transactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'SUCCESS')
                .neq('id', transactionId); 

            if (countError) {
                console.error('[Webhook 資料庫錯誤] 查詢歷史訂單失敗:', countError);
            }

            let totalDaysToAdd = packData.base_points + (packData.bonus_points || 0);
            if (prevPurchases === 0 && packData.first_time_bonus_points) {
                totalDaysToAdd += packData.first_time_bonus_points; 
                console.log(`[Webhook 執行] 判定為首購，加贈 ${packData.first_time_bonus_points} 天`);
            }

            console.log(`[Webhook 執行] 準備為用戶 ${userId} 展延 ${totalDaysToAdd} 天`);

            // D. 幫使用者展延 VIP 天數 (對齊 Schema: profiles, access_expiry)
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('[Webhook 資料庫錯誤] 查詢使用者 profile 失敗:', profileError);
            }

            let newExpiry = new Date();
            if (profile && profile.access_expiry) {
                const currentExpiry = new Date(profile.access_expiry);
                // 如果原本權限還沒過期，就從未來的到期日開始累加；若已過期，則從今天開始算
                if (currentExpiry > newExpiry) {
                    newExpiry = currentExpiry;
                }
            }
            
            newExpiry.setDate(newExpiry.getDate() + totalDaysToAdd);

            if (profile) {
                const { error: updateProfileError } = await supabase
                    .from('profiles')
                    .update({ access_expiry: newExpiry.toISOString() })
                    .eq('id', userId);
                
                if (updateProfileError) {
                    console.error('[Webhook 資料庫錯誤] 更新 Profile 失敗:', updateProfileError);
                } else {
                    console.log(`[Webhook 執行] 成功！已將用戶到期日展延至: ${newExpiry.toISOString()}`);
                }
            } else {
                // 極端狀況防護：若 profiles 不存在，則幫他新建一筆 (依照你的 Schema 預設值)
                console.log(`[Webhook 執行] 找不到 Profile，為用戶建立新紀錄`);
                const { error: insertProfileError } = await supabase
                    .from('profiles')
                    .insert({ 
                        id: userId, 
                        access_expiry: newExpiry.toISOString(),
                        role: 'general',
                        max_charts: 3,
                        max_edits_per_chart: 3,
                        can_use_divination: true
                    });
                
                if (insertProfileError) {
                    console.error('[Webhook 資料庫錯誤] 建立 Profile 失敗:', insertProfileError);
                }
            }

        } else {
            // --- [付款失敗流程] ---
            console.log(`[Webhook 執行] 收到付款失敗或取消通知，RtnCode: ${rtnCode}`);
            if (transactionId) {
                await supabase
                    .from('point_transactions')
                    .update({ status: 'FAILED' })
                    .eq('id', transactionId);
            }
        }

        // 4. 無論成功或失敗，只要我們成功收到且處理完畢，都必須回傳 1|OK 給綠界
        return res.send('1|OK');

    } catch (error: any) {
        console.error('[Webhook 致命錯誤] 處理發生例外狀況:', error);
        return res.status(500).send('0|ErrorMessage');
    }
}