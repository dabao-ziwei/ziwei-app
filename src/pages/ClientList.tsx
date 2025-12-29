// src/pages/ClientList.tsx (在 refreshData 中加入 log)

// ... 前略

  // 讀取資料與權限
  const refreshData = async () => {
    setLoading(true);
    
    // 1. 讀取命盤列表
    const data = await loadClients(); 
    setClients(data);

    // 2. 讀取個人 Profile
    const profile = await getMyProfile();
    console.log("ClientList loaded profile:", profile); // Debug Log
    setUserProfile(profile);

    // 3. 讀取已用額度
    if (profile) {
        const count = await getUsedChartCount(profile.id);
        setUsedCount(count);
    }

    setLoading(false);
  };

// ... 後略