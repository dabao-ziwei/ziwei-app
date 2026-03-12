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

        // 嚴格讀取正式金鑰，拔除所有測試預設值
        const HASH_KEY = process.env.ECPAY_HASH_KEY;
        const HASH_IV = process.env.ECPAY_HASH_IV;
        const RESEND_API_KEY = process.env.RESEND_API_KEY; 
        const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        const ADMIN_LINE_ID = process.env.ADMIN_LINE_USER_ID;

        if (!HASH_KEY || !HASH_IV) {
            console.error('[Webhook 錯誤] 伺服器未設定正式 HashKey/IV');
            return res.status(500).send('0|ErrorMessage');
        }

        const calculatedMac = generateCheckMacValue(params, HASH_KEY, HASH_IV);
        if (calculatedMac !== receivedMac) {
            console.error('[Webhook 錯誤] 驗證失敗');
            return res.status(400).send('0|ErrorMessage'); 
        }

        const rtnCode = params.RtnCode; 
        const transactionId = params.CustomField1; 
        const orderType = params.CustomField2 || 'STORE'; 
        const tradeNo = params.TradeNo; 
        const amount = params.TradeAmt;

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

                const { data: resData } = await supabase.from('reservations').select('*').eq('id', transactionId).single();
                
                if (resData) {
                    const displayTime = new Date(resData.start_time).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
                    
                    // --- 1. 發送 Email 給客戶 ---
                    if (RESEND_API_KEY && resData.client_email) {
                        const htmlContent = `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                                <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
                                    <h2 style="margin: 0;">大寶紫微斗數 - 預約付款成功</h2>
                                </div>
                                <div style="padding: 24px; color: #334155;">
                                    <p>親愛的 <strong>${resData.client_name}</strong> 您好，</p>
                                    <p>我們已收到您的線上預約與信用卡付款，感謝您的支持！以下是您的預約明細：</p>
                                    
                                    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
                                        <p style="margin: 4px 0;"><strong>預約項目：</strong>${resData.service_type}</p>
                                        <p style="margin: 4px 0;"><strong>預約時間：</strong>${displayTime}</p>
                                        <p style="margin: 4px 0;"><strong>實付金額：</strong>NT$ ${amount}</p>
                                        <p style="margin: 4px 0; color: #16a34a;"><strong>付款狀態：</strong>✅ 已完成線上信用卡付款</p>
                                    </div>

                                    <div style="background-color: #fff1f2; border: 1px solid #fecdd3; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                                        <h3 style="color: #e11d48; margin-top: 0;">⚠️ 預約尚未最終確認！</h3>
                                        <p style="margin-bottom: 0;">系統時段僅供初步保留。請務必點擊下方按鈕加入大寶官方 LINE，並<strong>回覆您的姓名或截圖此信件</strong>，以完成最終時段確認。</p>
                                    </div>

                                    <div style="text-align: center; margin-bottom: 24px;">
                                        <a href="https://line.me/R/ti/p/@653jrxjt" style="display: inline-block; background-color: #00B900; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">點此加入大寶官方 LINE</a>
                                    </div>
                                </div>
                            </div>
                        `;

                        try {
                            const resendResponse = await fetch('https://api.resend.com/emails', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    from: '大寶紫微斗數系統 <system@dabao.life>', 
                                    to: resData.client_email,
                                    subject: '【大寶紫微斗數】預約付款成功與後續確認步驟',
                                    html: htmlContent
                                })
                            });

                            if (!resendResponse.ok) {
                                console.error('[Resend 發信失敗]', await resendResponse.text());
                            } else {
                                console.log(`[Resend 發信成功] 已寄送至 ${resData.client_email}`);
                            }
                        } catch (err) {
                            console.error('[Resend 網路錯誤]', err);
                        }
                    }

                    // --- 2. 發送 LINE 給小幫手 ---
                    if (LINE_TOKEN && ADMIN_LINE_ID) {
                        const lineText = `🎉 收到新預約 (已付款) 🎉\n\n👤 客戶：${resData.client_name}\n📱 LINE：${resData.client_line_id}\n📅 時間：${displayTime}\n🔮 項目：${resData.service_type}\n💰 金額：NT$ ${amount}\n\n⚠️ 請留意客戶是否已主動聯繫官方帳號對接時段。`;
                        
                        try {
                            const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${LINE_TOKEN}`
                                },
                                body: JSON.stringify({
                                    to: ADMIN_LINE_ID,
                                    messages: [{ type: 'text', text: lineText }]
                                })
                            });
                            
                            if (!lineResponse.ok) {
                                console.error('[LINE 發信失敗]', await lineResponse.text());
                            } else {
                                console.log('[LINE 發信成功] 小幫手已收到通知');
                            }
                        } catch (err) {
                            console.error('[LINE 網路錯誤]', err);
                        }
                    }
                }
            } else {
                console.log(`[Webhook] 預約付款失敗/取消`);
                await supabase.from('reservations').update({ status: 'CANCELLED' }).eq('id', transactionId);
            }
            return res.send('1|OK');
        }

        // ==========================================
        // 類型 2：商城方案 (STORE)
        // ==========================================
        if (rtnCode === '1') {
            const { data: txData } = await supabase.from('point_transactions').select('*').eq('id', transactionId).single();
            if (!txData || txData.status === 'SUCCESS') return res.send('1|OK');

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
            if (transactionId) await supabase.from('point_transactions').update({ status: 'FAILED' }).eq('id', transactionId);
        }
        return res.send('1|OK');

    } catch (error: any) {
        console.error('[Webhook 錯誤]', error);
        return res.status(500).send('0|ErrorMessage');
    }
}