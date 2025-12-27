export interface Client {
  id: number;
  name: string;
  gender: '男' | '女';
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  type: '我' | '家人' | '朋友' | '客戶' | '名人' | '其他';
  
  majorStars: string; // 命宮主星
  isDeleted: boolean; // 假刪除標記
  ownerId: string;
  createdAt: number;
}

const STORAGE_KEY = 'ziwei_clients_v2';

// 預設資料
const DEFAULT_CLIENTS: Client[] = [
  {
    id: 1,
    name: '我 (本命)',
    gender: '男',
    birthYear: 1979,
    birthMonth: 9,
    birthDay: 26,
    birthHour: 18,
    birthMinute: 26,
    type: '我',
    majorStars: '天同',
    isDeleted: false,
    ownerId: 'admin',
    createdAt: Date.now()
  }
];

export const loadClients = async (includeDeleted: boolean = false): Promise<Client[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CLIENTS));
        resolve(DEFAULT_CLIENTS);
        return;
      }
      try {
        const data: Client[] = JSON.parse(raw);
        const filtered = data.filter(c => includeDeleted ? true : !c.isDeleted);
        resolve(filtered.sort((a, b) => b.createdAt - a.createdAt));
      } catch (e) {
        resolve(DEFAULT_CLIENTS);
      }
    }, 50); 
  });
};

export const saveClient = async (clientData: Omit<Client, 'id' | 'createdAt'> & { id?: number }): Promise<number> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      const currentList: Client[] = raw ? JSON.parse(raw) : [];

      let newId = clientData.id;
      let newList = [...currentList];

      if (newId) {
        const idx = newList.findIndex(c => c.id === newId);
        if (idx >= 0) {
          newList[idx] = {
            ...newList[idx],
            ...clientData,
            id: newId, 
          };
        }
      } else {
        newId = Date.now();
        const newClient: Client = {
          ...clientData,
          id: newId,
          createdAt: Date.now(),
          isDeleted: false,
          ownerId: 'user',
          majorStars: clientData.majorStars || ''
        } as Client;
        newList = [newClient, ...newList];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
      resolve(newId!);
    }, 100);
  });
};

export const deleteClient = async (id: number): Promise<void> => {
    return new Promise((resolve) => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if(!raw) { resolve(); return; }
        let list: Client[] = JSON.parse(raw);
        const idx = list.findIndex(c => c.id === id);
        if (idx >= 0) list[idx].isDeleted = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        resolve();
    });
}

export const restoreClient = async (id: number): Promise<void> => {
    return new Promise((resolve) => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if(!raw) { resolve(); return; }
        let list: Client[] = JSON.parse(raw);
        const idx = list.findIndex(c => c.id === id);
        if (idx >= 0) list[idx].isDeleted = false;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        resolve();
    });
}