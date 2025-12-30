// ... 前面 imports 不變
// 找到 handleCreateDivination 函式，替換為以下內容：

const handleCreateDivination = async (data: any) => {
  const tempClient = { 
      ...data, 
      id: `temp-${Date.now()}`,
      user_id: userProfile?.id,
      // 確保 divNum (4位數字) 被包含在 client 物件中，或者直接放在 state 根層級也可以
      // 這裡我們把它放在 client 物件裡，方便 ChartBoard 統一讀取
      divNum: data.divNum 
  };
  
  // 將 divNum 也顯式放在 state 根層級，雙重保險
  navigate('/divination', { 
      state: { 
          client: tempClient,
          divNum: data.divNum 
      } 
  });
};

// ... 其餘程式碼不變