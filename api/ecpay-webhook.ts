// FILE: api/ecpay-webhook.ts
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

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
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const params = { ...req.body };
        const receivedMac = params.CheckMacValue;
        delete params.CheckMacValue; 

        const HASH_KEY = process.env.ECPAY_HASH_KEY || '5294y06JbISpM5x9';
        const HASH_IV = process.env.ECPAY_HASH_IV || 'v77hoKGq4kWxNNIS';

        const calculatedMac = generateCheckMacValue(params, HASH_KEY, HASH_IV);
        if (calculatedMac !== receivedMac) {
            console.error('[Webhook 錯誤] 驗證失敗', { receivedMac, calculatedMac });
            return res.status(400).send('0|ErrorMessage'); 
        }

        const rtnCode = params.RtnCode; 
        const transactionId = params.CustomField1; 
        const orderType = params.CustomField2 || 'STORE'; // 取出訂單類型
        const tradeNo = params.TradeNo; 

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // ==========================================
        // 類型 1：預約諮詢 (BOOKING)
        // ==========================================
        if (orderType === 'BOOKING') {
            if (rtnCode === '1') {
                console.log(`[Webhook] 收到預約成功付款通知，ID: ${transactionId}`);
                await supabase.from('reservations').update({ status: 'PAID' }).eq('id', transactionId);
            } else {
                console.log(`[Webhook] 預約付款失敗/取消，ID: ${transactionId}`);
                await supabase.from('reservations').update({ status: 'CANCELLED' }).eq('id', transactionId);
            }
            return res.send('1|OK');
        }

        // ==========================================
        // 類型 2：商城方案 (STORE)
        // ==========================================
        if (rtnCode === '1') {
            console.log(`[Webhook] 收到方案成功付款通知，ID: ${transactionId}`);
            const { data: txData, error: txError } = await supabase.from('point_transactions').select('*').eq('id', transactionId).single();
            if (txError || !txData) throw new Error('找不到該筆訂單');
            if (txData.status === 'SUCCESS') return res.send('1|OK');

            await supabase.from('point_transactions').update({ status: 'SUCCESS', paid_at: new Date().toISOString(), provider_trade_no: tradeNo }).eq('id', transactionId);
            
            const { data: packData } = await supabase.from('point_packs').select('*').eq('id', txData.point_pack_id).single();
            if (packData) {
                const userId = txData.user_id;
                const { count: prevPurchases } = await supabase.from('point_transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'SUCCESS').neq('id', transactionId); 

                let totalDaysToAdd = packData.base_points + (packData.bonus_points || 0);
                if (prevPurchases === 0 && packData.first_time_bonus_points) {
                    totalDaysToAdd += packData.first_time_bonus_points; 
                }

                const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
                let newExpiry = new Date();
                if (profile && profile.access_expiry) {
                    const currentExpiry = new Date(profile.access_expiry);
                    if (currentExpiry > newExpiry) newExpiry = currentExpiry;
                }
                newExpiry.setDate(newExpiry.getDate() + totalDaysToAdd);

                if (profile) {
                    await supabase.from('profiles').update({ access_expiry: newExpiry.toISOString() }).eq('id', userId);
                } else {
                    await supabase.from('profiles').insert({ id: userId, access_expiry: newExpiry.toISOString(), role: 'general', max_charts: 3, max_edits_per_chart: 3, can_use_divination: true });
                }
            }
        } else {
            console.log(`[Webhook] 方案付款失敗/取消`);
            if (transactionId) await supabase.from('point_transactions').update({ status: 'FAILED' }).eq('id', transactionId);
        }
        return res.send('1|OK');

    } catch (error: any) {
        console.error('[Webhook 錯誤]', error);
        return res.status(500).send('0|ErrorMessage');
    }
}