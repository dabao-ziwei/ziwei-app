// FILE: src/db.ts
import { supabase } from './supabase'; 
export { supabase };

import type { UserFeatures } from './logic/permissions'; 
import type { YearAdviceRule } from './logic/types';

const SUPER_VIEW_EMAIL = 'stephenwu.0926@gmail.com';

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'student' | 'general' | 'competitor'; 
  maxCharts: number;
  maxEditsPerChart: number;
  isBanned: boolean;
  can_use_divination: boolean;
  accessExpiry?: string; 
  feature_flags?: UserFeatures; 
  activeCount?: number;
  deletedCount?: number;
  joinDate?: string;
  credits?: number;
  free_divination_used?: boolean;
}

export interface Client {
  id: string;
  user_id?: string;
  name: string;
  gender: '男' | '女';
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  created_at?: string;
  type?: string; 
  majorStars?: string;
  editCount?: number;
  creatorEmail?: string;
  is_deleted?: boolean;
}

export interface Relationship {
  id: string;
  from_client_id: string;
  to_client_id: string;
  relation_type: string;
  related_client?: Client;
  is_reverse?: boolean; 
  is_inferred?: boolean;
  inferred_from?: string;
}

export const getPaywallPhase = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('get_paywall_phase');
  if (error || !data) return 'ANNOUNCE_ONLY';
  return data;
};

export const issueGuestToken = async (): Promise<string | null> => {
  const { data, error } = await supabase.rpc('issue_guest_token');
  if (error || !data?.success) return null;
  return data.token as string;
};

export const consumeDivinationV2 = async (cost: number, guestToken?: string | null) => {
  const { data, error } = await supabase.rpc('consume_divination_v2', {
    p_cost: cost,
    p_guest_token: guestToken ?? null,
  });
  if (error) return { success: false, message: error.message };
  return data;
};

const getInverseRelationType = (type: string, fromGender: '男' | '女'): string => {
    if (['配偶'].includes(type)) return '配偶';
    if (['情侶'].includes(type)) return '情侶';
    if (['子女'].includes(type)) return fromGender === '男' ? '父親' : '母親';
    if (['父親', '母親'].includes(type)) return '子女';
    if (['哥哥', '姐姐', '弟弟', '妹妹'].includes(type)) return '親戚'; 
    if (['親戚'].includes(type)) return '親戚';
    if (['朋友'].includes(type)) return '朋友';
    return '朋友'; 
};

export const loadClients = async (): Promise<Client[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const isSuperViewer = user.email === SUPER_VIEW_EMAIL;
  
  let query = supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (!isSuperViewer) {
      query = query.eq('user_id', user.id).eq('is_deleted', false);
  }
  const { data, error } = await query;
  if (error) return [];
  
  let userIdToEmailMap: Record<string, string> = {};
  if (isSuperViewer) {
      const { data: profiles } = await supabase.from('profiles').select('id, email');
      if (profiles) profiles.forEach(p => userIdToEmailMap[p.id] = p.email);
  }

  return data.map((item: any) => ({
    ...mapClientToEntity(item),
    creatorEmail: userIdToEmailMap[item.user_id] || '',
    is_deleted: item.is_deleted
  }));
};

export const getRelationships = async (clientId: string): Promise<Relationship[]> => {
    const { data, error } = await supabase
        .from('relationships')
        .select(`*, to_c:clients!to_client_id (*)`)
        .eq('from_client_id', clientId);

    if (error || !data) return [];

    return data.map((r: any) => ({
        id: r.id,
        from_client_id: r.from_client_id,
        to_client_id: r.to_client_id,
        relation_type: r.relation_type,
        is_reverse: false, 
        is_inferred: false,
        related_client: mapClientToEntity(r.to_c)
    }));
};

export const getUserCustomRelationTypes = async (): Promise<string[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('relationships')
        .select('relation_type')
        .eq('user_id', user.id);

    if (error || !data) return [];

    const types = new Set(data.map((r: any) => r.relation_type));
    return Array.from(types).filter(t => t) as string[]; 
};

export const addRelationship = async (fromId: string, toId: string, type: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: fromClient } = await supabase.from('clients').select('gender').eq('id', fromId).single();
    if (!fromClient) return false;

    const inverseType = getInverseRelationType(type, fromClient.gender as '男' | '女');

    const { data: exists } = await supabase.from('relationships')
        .select('id')
        .eq('from_client_id', fromId).eq('to_client_id', toId);
    
    if (exists && exists.length > 0) return true;

    const payloadForward = { user_id: user.id, from_client_id: fromId, to_client_id: toId, relation_type: type };
    const payloadReverse = { user_id: user.id, from_client_id: toId, to_client_id: fromId, relation_type: inverseType };

    const { error: err1 } = await supabase.from('relationships').insert(payloadForward);
    const { error: err2 } = await supabase.from('relationships').insert(payloadReverse);
    if (err2) console.warn("Reverse link failed", err2);

    if (!err1) {
        autoLinkFamily(user.id, fromId, toId, type);
    }

    return !err1;
};

const autoLinkFamily = async (user_id: string, fromId: string, toId: string, type: string) => {
    if (['子女'].includes(type)) {
        const { data: spouses } = await supabase.from('relationships')
            .select('to_client_id')
            .eq('from_client_id', fromId)
            .in('relation_type', ['配偶']);
        
        if (spouses) {
            for (const spouse of spouses) {
                const { data: exists } = await supabase.from('relationships').select('id')
                    .eq('from_client_id', spouse.to_client_id).eq('to_client_id', toId);
                
                if (!exists || exists.length === 0) {
                    await addRelationship(spouse.to_client_id, toId, '子女'); 
                }
            }
        }
    }

    if (['配偶'].includes(type)) {
        const { data: children } = await supabase.from('relationships')
            .select('to_client_id')
            .eq('from_client_id', fromId)
            .in('relation_type', ['子女']);
        
        if (children) {
            for (const child of children) {
                const { data: exists } = await supabase.from('relationships').select('id')
                    .eq('from_client_id', toId).eq('to_client_id', child.to_client_id);
                
                if (!exists || exists.length === 0) {
                    await addRelationship(toId, child.to_client_id, '子女');
                }
            }
        }
    }
};

export const deleteRelationship = async (relId: string): Promise<boolean> => {
    const { data: rel } = await supabase.from('relationships').select('from_client_id, to_client_id').eq('id', relId).single();
    if (!rel) return false;
    const { error } = await supabase.from('relationships')
        .delete()
        .or(`and(from_client_id.eq.${rel.from_client_id},to_client_id.eq.${rel.to_client_id}),and(from_client_id.eq.${rel.to_client_id},to_client_id.eq.${rel.from_client_id})`);
    return !error;
};

const mapClientToEntity = (data: any): Client => ({
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    gender: data.gender,
    birthYear: data.birth_year ?? data.birthYear,
    birthMonth: data.birth_month ?? data.birthMonth,
    birthDay: data.birth_day ?? data.birthDay,
    birthHour: data.birth_hour ?? data.birthHour,
    birthMinute: data.birth_minute ?? data.birthMinute,
    type: data.type,
    majorStars: data.major_stars
});

export const getMyProfile = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email,
    role: data.role,
    maxCharts: data.max_charts,
    maxEditsPerChart: data.max_edits_per_chart,
    isBanned: data.is_banned || false,
    can_use_divination: data.can_use_divination ?? true,
    accessExpiry: data.access_expiry,
    feature_flags: data.feature_flags,
    credits: data.credits || 0,
    free_divination_used: data.free_divination_used || false
  };
};

export const getClient = async (id: string): Promise<Client | null> => {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error) return null;
  return { ...mapClientToEntity(data), is_deleted: data.is_deleted };
};

export const saveClient = async (clientData: any): Promise<string | null> => {
    if (clientData.id && !clientData.id.toString().startsWith('temp-') && clientData.id !== '') {
        const success = await updateClient(clientData.id, clientData);
        return success ? clientData.id : null;
    } else {
        return await addClient(clientData);
    }
};

export const addClient = async (client: any): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const profile = await getMyProfile();
    if (profile && profile.role !== 'admin') {
        const currentCount = await getUsedChartCount(user.id);
        if (currentCount >= profile.maxCharts) {
            throw new Error(`您的命盤數量已達上限 (${profile.maxCharts} 張)，無法再新增。`);
        }
    }

    const dbPayload = {
        user_id: user.id,
        name: client.name,
        gender: client.gender,
        birth_year: client.birthYear,
        birth_month: client.birthMonth,
        birth_day: client.birthDay,
        birth_hour: client.birthHour,
        birth_minute: client.birthMinute,
        type: client.type,
        major_stars: client.majorStars
    };
    const { data, error } = await supabase.from('clients').insert(dbPayload).select().single();
    if (error) throw error;

    if (client.linkRequest && data?.id) {
        try {
            await addRelationship(data.id, client.linkRequest.targetId, client.linkRequest.type);
        } catch (e) {
            console.error("Auto link failed", e);
        }
    }
    return data.id;
};

export const updateClient = async (id: string, client: any): Promise<boolean> => {
    const dbPayload: any = {};
    if (client.name) dbPayload.name = client.name;
    if (client.gender) dbPayload.gender = client.gender;
    if (client.birthYear !== undefined) dbPayload.birth_year = client.birthYear;
    if (client.birthMonth !== undefined) dbPayload.birth_month = client.birthMonth;
    if (client.birthDay !== undefined) dbPayload.birth_day = client.birthDay;
    if (client.birthHour !== undefined) dbPayload.birth_hour = client.birthHour;
    if (client.birthMinute !== undefined) dbPayload.birth_minute = client.birthMinute;
    if (client.type) dbPayload.type = client.type;
    if (client.majorStars) dbPayload.major_stars = client.majorStars;
    const { error } = await supabase.from('clients').update(dbPayload).eq('id', id);
    return !error;
};

export const deleteClient = async (id: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    const isSuperAdmin = user?.email === SUPER_VIEW_EMAIL;
    if (isSuperAdmin) {
        const res = await supabase.from('clients').delete().eq('id', id);
        return !res.error;
    } else {
        const res = await supabase.from('clients').update({ is_deleted: true }).eq('id', id);
        return !res.error;
    }
};

export const getUsedChartCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_deleted', false);
    return count || 0;
};

export const getAllProfilesWithStats = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase.from('user_statistics').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data.map((p: any) => ({
    id: p.id, email: p.email, role: p.role, maxCharts: p.max_charts,
    maxEditsPerChart: p.max_edits_per_chart, isBanned: p.is_banned,
    can_use_divination: p.can_use_divination ?? true,
    accessExpiry: p.access_expiry,
    feature_flags: p.feature_flags, 
    activeCount: p.active_count, deletedCount: p.deleted_count,
    joinDate: p.created_at,
    credits: p.credits || 0,
    free_divination_used: p.free_divination_used || false
  }));
};

export const toggleUserBan = async (id: string, currentStatus: boolean): Promise<boolean> => {
  const { error } = await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', id);
  return !error;
};

export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<boolean> => {
  const dbUpdates: any = {
    role: updates.role,
    max_charts: updates.maxCharts,
    max_edits_per_chart: updates.maxEditsPerChart,
    can_use_divination: updates.can_use_divination,
    access_expiry: updates.accessExpiry, 
    feature_flags: updates.feature_flags 
  };
  const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
  return !error;
};

export const deleteUserProfile = async (targetUserId: string): Promise<boolean> => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.email !== SUPER_VIEW_EMAIL) return false;

    const { data: targetUser } = await supabase.from('profiles').select('email').eq('id', targetUserId).single();
    const sourceLabel = targetUser?.email || '未知使用者';

    const { data: clients } = await supabase.from('clients').select('id, name').eq('user_id', targetUserId);

    if (clients && clients.length > 0) {
        const updates = clients.map(client => ({
            id: client.id,
            user_id: currentUser.id, 
            name: `${client.name} (來源: ${sourceLabel})` 
        }));

        const { error: transferError } = await supabase.from('clients').upsert(updates);
        
        if (transferError) {
            console.error("Transfer failed:", transferError);
            return false;
        }
    }

    const { error: deleteError } = await supabase.from('profiles').delete().eq('id', targetUserId);
    
    return !deleteError;
};

export const inviteUserByEmail = async (email: string): Promise<{ success: boolean; msg: string }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login' });
    if (error) return { success: false, msg: error.message };
    return { success: true, msg: "邀請信已發送 (重設密碼連結)" };
};

export const bulkUpdateAccessExpiry = async (ids: string[], expiryDate: string): Promise<boolean> => {
    const timestamp = `${expiryDate} 23:59:59`; 
    
    const { error } = await supabase
        .from('profiles')
        .update({ access_expiry: timestamp })
        .in('id', ids);

    if (error) {
        console.error('Bulk update failed:', error);
        return false;
    }
    return true;
};

// --- 占卜文案相關 API ---

export interface DivinationContent {
    category: string;
    zhi: string;
    gan: string;
    content: string;
    luck: string;
}

export const getDivinationResult = async (category: string, zhi: string, gan: string) => {
    const { data, error } = await supabase
        .from('divination_contents')
        .select('*')
        .eq('category', category)
        .eq('zhi', zhi)
        .eq('gan', gan)
        .maybeSingle();

    if (error) {
        console.error('Error fetching divination:', error);
        return null;
    }
    return data;
};

export const getAllDivinationContents = async () => {
    const { data, error } = await supabase
        .from('divination_contents')
        .select('*');
    
    if (error) return [];
    
    const dbMap: Record<string, any> = {};
    data.forEach((row: any) => {
        const key = `${row.category}-${row.zhi}-${row.gan}`;
        dbMap[key] = { content: row.content, luck: row.luck };
    });
    return dbMap;
};

export const saveDivinationContent = async (category: string, zhi: string, gan: string, content: string, luck: string) => {
    const { error } = await supabase
        .from('divination_contents')
        .upsert({ 
            category, 
            zhi, 
            gan, 
            content, 
            luck,
            updated_at: new Date().toISOString()
        }, { onConflict: 'category,zhi,gan' });

    return !error;
};

export const deleteDivinationContent = async (category: string, zhi: string, gan: string) => {
    const { error } = await supabase
        .from('divination_contents')
        .delete()
        .eq('category', category)
        .eq('zhi', zhi)
        .eq('gan', gan);
        
    return !error;
};

export const bulkUploadDivination = async (items: DivinationContent[]) => {
    if (items.length === 0) return true;
    const { error } = await supabase
        .from('divination_contents')
        .upsert(items, { onConflict: 'category,zhi,gan' });
    
    return !error;
};

// --- 流年建議規則 CRUD ---

export const loadYearAdviceRules = async (): Promise<YearAdviceRule[]> => {
    const { data, error } = await supabase
        .from('year_advice_rules')
        .select('*')
        .order('priority', { ascending: true });

    if (error) {
        console.error('Error loading year advice rules:', error);
        return [];
    }
    return data || [];
};

export const saveYearAdviceRule = async (rule: Partial<YearAdviceRule>) => {
    if (rule.is_default) {
        let query = supabase.from('year_advice_rules').update({ is_default: false });
        if (rule.id) {
            query = query.neq('id', rule.id);
        }
        await query;
    }

    const payload = {
        ...rule,
        max_score: rule.max_score === undefined ? null : rule.max_score,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('year_advice_rules')
        .upsert(payload);

    if (error) {
        console.error('Error saving advice rule:', error);
        return false;
    }
    return true;
};

export const deleteYearAdviceRule = async (id: string) => {
    const { error } = await supabase
        .from('year_advice_rules')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting advice rule:', error);
        return false;
    }
    return true;
};