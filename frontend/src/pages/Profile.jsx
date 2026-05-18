import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('social');
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [bioEdit, setBioEdit] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [cosmeticsList, setCosmeticsList] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [achievementsList, setAchievementsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingAchievements, setSyncingAchievements] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

  const showAlert = (text, type = 'success') => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg({ type: '', text: '' }), 5000);
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      // Get current logged-in user
      const meRes = await api.auth.me();
      setCurrentUser(meRes.data);

      // Fetch public profile for current user
      const profileRes = await api.user.getProfile(meRes.data.username);
      setProfile(profileRes.data.profile);
      setBioEdit(profileRes.data.profile.bio || '');

      // Fetch platform cosmetics
      const cosmeticsRes = await api.cosmetics.listPlatform();
      setCosmeticsList(cosmeticsRes.data || []);

      // Fetch inventory
      const inventoryRes = await api.user.getInventory();
      setInventoryList(inventoryRes.data || []);

      // Fetch platform achievements
      const achievementsRes = await api.achievements.listPlatform();
      setAchievementsList(achievementsRes.data || []);
    } catch (err) {
      console.error("Failed to load profile data:", err);
      showAlert(err.message || "Failed to retrieve profile data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleUpdateBio = async () => {
    try {
      await api.user.updateProfile({ bio: bioEdit });
      showAlert("Bio updated successfully!");
      setIsEditingBio(false);
      
      // Reload profile
      const meRes = await api.auth.me();
      const profileRes = await api.user.getProfile(meRes.data.username);
      setProfile(profileRes.data.profile);
    } catch (err) {
      showAlert(err.message || "Failed to update bio.", "error");
    }
  };

  const handlePurchaseCosmetic = async (sku) => {
    try {
      const res = await api.cosmetics.purchase(sku);
      showAlert(`Successfully purchased cosmetic item!`);
      loadAllData(); // Reload inventory and coin balance
    } catch (err) {
      showAlert(err.message || "Purchase failed.", "error");
    }
  };

  const handleEquipCosmetic = async (cosmeticId, slot, isEquipped) => {
    try {
      await api.user.equipCosmetic({
        slot,
        cosmeticId: isEquipped ? null : cosmeticId // if already equipped, send null to unequip
      });
      showAlert(isEquipped ? `Unequipped item successfully!` : `Equipped item successfully!`);
      loadAllData(); // Reload profile preview
    } catch (err) {
      showAlert(err.message || "Failed to update equipment.", "error");
    }
  };

  const handleSyncAchievements = async () => {
    try {
      setSyncingAchievements(true);
      const res = await api.achievements.check();
      const newlyUnlocked = res.data.newlyUnlocked || [];
      if (newlyUnlocked.length > 0) {
        const titles = newlyUnlocked.map(a => `🏆 "${a.title}"`).join(', ');
        showAlert(`Unlocked ${newlyUnlocked.length} achievement(s): ${titles}! Earned +${res.data.coinsAwarded} coins!`, "success");
      } else {
        showAlert("All achievements are up to date! Keep playing to unlock more.", "info");
      }
      loadAllData();
    } catch (err) {
      showAlert(err.message || "Failed to sync achievements.", "error");
    } finally {
      setSyncingAchievements(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-primary space-y-4">
        <span className="material-symbols-outlined animate-spin text-5xl font-bold">sync</span>
        <div className="font-label-mono text-label-mono animate-pulse uppercase tracking-widest text-lg">&gt; INITIALIZING_PLAYER_PROFILE...</div>
      </div>
    );
  }

  // Get active cosmetic styles
  const equippedBorder = profile.equipped.find(e => e.slot === 'border')?.cosmetic;
  const equippedTheme = profile.equipped.find(e => e.slot === 'theme')?.cosmetic;
  const equippedBanner = profile.equipped.find(e => e.slot === 'banner')?.cosmetic;
  const equippedAvatar = profile.equipped.find(e => e.slot === 'avatar')?.cosmetic;

  const isCosmeticOwned = (cosmeticId) => {
    return inventoryList.some(inv => inv.cosmeticId === cosmeticId);
  };

  const isCosmeticEquipped = (cosmeticId) => {
    return profile.equipped.some(eq => eq.cosmetic?.id === cosmeticId);
  };

  // Dynamic Border Style Generator
  const getBorderStyles = (cosmetic) => {
    if (!cosmetic) return {};
    const meta = cosmetic.metadata || {};
    return {
      borderColor: meta.borderColor || 'var(--primary)',
      boxShadow: `0 0 15px ${meta.glowColor || 'var(--glow-primary)'}`,
      animation: meta.style === 'pulse' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
    };
  };

  // Dynamic Theme Style Generator
  const getThemeStyles = () => {
    if (!equippedTheme) return {};
    const meta = equippedTheme.metadata || {};
    return {
      background: meta.bgGradient || 'none',
      color: meta.textColor || 'inherit',
    };
  };

  return (
    <div className="p-4 md:p-8 max-w-container-max mx-auto space-y-6 text-on-surface select-none" style={getThemeStyles()}>
      {/* Alert Messages banner */}
      {alertMsg.text && (
        <div className={`p-4 border-2 flex items-center justify-between transition-all duration-300 animate-bounce ${
          alertMsg.type === 'error' ? 'bg-error-container text-on-error-container border-error' :
          alertMsg.type === 'info' ? 'bg-primary-container text-on-primary-container border-primary' :
          'bg-primary-container text-on-primary-fixed-variant border-primary-fixed shadow-[0_0_15px_rgba(0,246,246,0.3)]'
        }`}>
          <div className="flex items-center gap-3 font-label-mono text-label-mono">
            <span className="material-symbols-outlined">{alertMsg.type === 'error' ? 'error' : 'info'}</span>
            <span>{alertMsg.text.toUpperCase()}</span>
          </div>
          <button onClick={() => setAlertMsg({ type: '', text: '' })} className="material-symbols-outlined hover:text-white shrink-0">close</button>
        </div>
      )}

      {/* Cyber Hero Banner Display */}
      <div 
        className="h-48 md:h-64 border-2 border-outline-variant bg-surface-container relative flex items-end p-6 overflow-hidden shadow-2xl group"
        style={{
          backgroundImage: equippedBanner ? `url(${equippedBanner.metadata?.bannerUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {!equippedBanner && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary-container/20 to-secondary-container/20 opacity-60 z-0"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10"></div>
        
        {/* Dynamic Grid Gridlines in Banner */}
        <div className="absolute inset-0 grid-glow-bg opacity-30 z-0"></div>

        {/* Profile Card Header Info */}
        <div className="flex flex-col md:flex-row items-center gap-6 z-20 w-full">
          {/* Avatar Area with Equipped Frame & Neon Borders */}
          <div 
            className="w-24 h-24 md:w-32 md:h-32 bg-surface border-4 flex items-center justify-center shrink-0 overflow-hidden relative shadow-lg"
            style={getBorderStyles(equippedBorder)}
          >
            <span className="material-symbols-outlined text-outline-variant text-6xl md:text-8xl">account_circle</span>
            {equippedAvatar && (
              <div className="absolute inset-0 border-4 border-dashed border-secondary pointer-events-none animate-spin"></div>
            )}
          </div>

          <div className="text-center md:text-left flex-1 space-y-2">
            <h1 className="text-headline-lg md:text-headline-xl font-bold uppercase tracking-widest text-primary drop-shadow-[0_0_10px_rgba(0,246,246,0.6)]">
              {profile.displayName}
            </h1>
            <p className="text-label-mono font-label-mono text-outline-variant uppercase text-xs">
              SYSTEM_COORDS: @{profile.username} | LEVEL: {profile.achievements.length} INDIE_CYBERNETIC
            </p>
            
            {/* User Bio Block */}
            <div className="max-w-2xl">
              {isEditingBio ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={bioEdit}
                    onChange={(e) => setBioEdit(e.target.value)}
                    className="w-full bg-surface-container border border-primary text-sm px-2 py-1 focus:ring-0 focus:outline-none"
                    placeholder="Enter short social description..."
                  />
                  <button onClick={handleUpdateBio} className="px-3 py-1 bg-primary text-black font-label-mono text-xs hover:bg-primary-fixed transition-colors">SAVE</button>
                  <button onClick={() => setIsEditingBio(false)} className="px-3 py-1 bg-surface-variant text-white font-label-mono text-xs hover:bg-surface-bright transition-colors">CANCEL</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-sm italic opacity-85 text-on-surface-variant">
                    {profile.bio || "No data bio loaded. Upgrade your neural link profile."}
                  </p>
                  <button onClick={() => setIsEditingBio(true)} className="material-symbols-outlined text-primary hover:text-primary-fixed text-lg shrink-0">edit</button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats & Coins display */}
          <div className="bg-surface/80 border-2 border-outline-variant p-4 font-label-mono text-label-mono text-sm space-y-2 shrink-0 self-center md:self-end">
            <div className="flex items-center gap-2 text-primary font-bold">
              <span className="material-symbols-outlined text-yellow-400">monetization_on</span>
              <span>COINS: {profile.coins || 0}</span>
            </div>
            <div className="flex justify-between gap-8 text-[11px] text-on-surface-variant">
              <span>ACHIEVEMENTS:</span>
              <span className="text-white font-bold">{profile.achievements.length}</span>
            </div>
            <div className="flex justify-between gap-8 text-[11px] text-on-surface-variant">
              <span>PLAYTIME:</span>
              <span className="text-white font-bold">{Math.round((profile.stats?.totalPlaytime || 0) / 60)} MINS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher Navigation */}
      <div className="flex border-b-2 border-outline-variant font-label-mono text-label-mono">
        {[
          { id: 'social', name: 'SOCIAL_OVERVIEW', icon: 'diversity_3' },
          { id: 'store', name: 'COSMETIC_SHOP', icon: 'shopping_bag' },
          { id: 'inventory', name: 'INVENTORY_EQUIP', icon: 'inventory' },
          { id: 'achievements', name: 'ACHIEVEMENTS_LOG', icon: 'emoji_events' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-6 py-3 border-t-2 border-x-2 border-transparent transition-all uppercase tracking-widest text-xs font-bold ${
              activeTab === t.id
                ? 'bg-surface-container border-x-outline-variant border-t-primary text-primary font-bold shadow-[0_-2px_8px_rgba(0,246,246,0.15)]'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container/50'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{t.icon}</span>
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="bg-surface-container border-2 border-outline-variant p-6 shadow-xl">
        {/* Tab 1: Social Overview */}
        {activeTab === 'social' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Player Stats & Equipped Cards */}
            <div className="space-y-6 lg:col-span-1">
              <h3 className="font-label-mono text-label-mono text-primary font-bold uppercase tracking-widest border-b border-outline-variant pb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">workspace_premium</span>
                <span>PLAYER_CREDENTIALS</span>
              </h3>
              <div className="bg-surface p-4 border-2 border-outline-variant space-y-4 font-label-mono text-label-mono text-sm">
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
                  <span className="opacity-75">LIBRARY_GAMES</span>
                  <span className="text-primary font-bold text-lg">{profile.stats?.gamesCount || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
                  <span className="opacity-75">REVIEWS_SUBMITTED</span>
                  <span className="text-primary font-bold text-lg">{profile.stats?.reviewsCount || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
                  <span className="opacity-75">TOTAL_EARNED_COINS</span>
                  <span className="text-yellow-400 font-bold text-lg">{profile.coins || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="opacity-75">ACHIEVEMENTS_UNLOCKED</span>
                  <span className="text-secondary font-bold text-lg">{profile.achievements.length}</span>
                </div>
              </div>

              {/* Equipped items details card */}
              <h3 className="font-label-mono text-label-mono text-primary font-bold uppercase tracking-widest border-b border-outline-variant pb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">shield_with_heart</span>
                <span>EQUIPPED_COSMETICS</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {['border', 'theme', 'avatar', 'banner'].map(slot => {
                  const item = profile.equipped.find(e => e.slot === slot)?.cosmetic;
                  return (
                    <div key={slot} className="bg-surface p-3 border border-outline-variant/40 flex flex-col justify-between h-24">
                      <span className="text-[10px] text-outline-variant uppercase tracking-widest">{slot}</span>
                      <span className="text-xs font-bold truncate text-white uppercase">{item ? item.name : 'EMPTY'}</span>
                      {item ? (
                        <span className="text-[9px] text-primary uppercase font-label-mono">ACTIVE</span>
                      ) : (
                        <span className="text-[9px] text-on-surface-variant/40 uppercase font-label-mono">NONE</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Recent Activity & Favorite Games */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="font-label-mono text-label-mono text-primary font-bold uppercase tracking-widest border-b border-outline-variant pb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">history</span>
                <span>RECENT_NEURAL_SESSIONS</span>
              </h3>
              {profile.recentActivity?.length > 0 ? (
                <div className="space-y-3">
                  {profile.recentActivity.map((act, i) => (
                    <div key={i} className="bg-surface p-4 border border-outline-variant/50 hover:border-primary flex justify-between items-center transition-colors">
                      <div className="space-y-1">
                        <div className="font-bold text-white uppercase text-sm">{act.gameTitle}</div>
                        <div className="text-[10px] text-on-surface-variant font-label-mono">
                          PLAYED_AT: {new Date(act.playedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="font-label-mono text-label-mono text-xs text-primary bg-primary-container/20 border border-primary/30 px-3 py-1">
                        +{Math.round(act.duration || 0)} SECS RUNTIME
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-surface border border-dashed border-outline-variant/35 text-on-surface-variant text-sm font-label-mono">
                  &gt; NO RECENT PLAYTIME ACTIVITY RECORDED. ENTER_THE_MATRIX...
                </div>
              )}

              {/* Favorites list */}
              <h3 className="font-label-mono text-label-mono text-primary font-bold uppercase tracking-widest border-b border-outline-variant pb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">grade</span>
                <span>FAVORITE_COLLECTION</span>
              </h3>
              {profile.favoriteGames?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {profile.favoriteGames.map((fav, i) => (
                    <div key={i} className="bg-surface border border-outline-variant/50 relative overflow-hidden group hover:border-primary transition-all">
                      <img 
                        src={fav.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80'} 
                        alt={fav.title}
                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex items-end p-3">
                        <span className="text-white font-bold uppercase tracking-wider text-xs truncate w-full">{fav.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-surface border border-dashed border-outline-variant/35 text-on-surface-variant text-sm font-label-mono">
                  &gt; NO GAMES STAR_FAVORITED IN YOUR LIBRARY.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Cosmetic Store */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-4">
              <div>
                <h3 className="font-label-mono text-label-mono text-lg text-primary font-bold uppercase tracking-wider">PLATFORM_VIRTUAL_MARKETPLACE</h3>
                <p className="text-xs text-on-surface-variant uppercase font-label-mono mt-1">&gt; SPEND EARNED LAZPLAY COINS TO UPGRADE YOUR SOCIAL IDENTITY</p>
              </div>
              <div className="bg-surface border border-outline-variant py-2 px-4 flex items-center gap-2 font-label-mono text-label-mono text-sm font-bold text-yellow-400">
                <span className="material-symbols-outlined">monetization_on</span>
                <span>AVAILABLE: {profile.coins || 0} COINS</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {cosmeticsList.map(item => {
                const owned = isCosmeticOwned(item.id);
                return (
                  <div key={item.id} className="bg-surface border-2 border-outline-variant hover:border-primary flex flex-col justify-between p-5 relative transition-all group">
                    
                    {/* Glowing Accent strip */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary/45 group-hover:bg-primary"></div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-label-mono bg-primary-container text-primary font-bold px-2 py-0.5 uppercase tracking-widest">
                          {item.kind}
                        </span>
                        {owned && (
                          <span className="text-[10px] font-label-mono bg-secondary-container text-secondary font-bold px-2 py-0.5 uppercase tracking-widest border border-secondary/30">
                            OWNED
                          </span>
                        )}
                      </div>

                      <h4 className="text-white font-bold uppercase text-base tracking-wide group-hover:text-primary transition-colors">{item.name}</h4>
                      
                      {/* Interactive UI Mockups */}
                      {item.kind === 'border' && (
                        <div className="h-28 bg-surface-container flex items-center justify-center border border-outline-variant/30 relative">
                          <div 
                            className="w-16 h-16 border-4 flex items-center justify-center relative bg-surface"
                            style={{
                              borderColor: item.metadata?.borderColor,
                              boxShadow: `0 0 10px ${item.metadata?.glowColor}`
                            }}
                          >
                            <span className="material-symbols-outlined text-outline-variant">account_circle</span>
                          </div>
                        </div>
                      )}
                      
                      {item.kind === 'theme' && (
                        <div 
                          className="h-28 p-3 border border-outline-variant/30 flex flex-col justify-between font-label-mono text-[9px] uppercase"
                          style={{ background: item.metadata?.bgGradient, color: item.metadata?.textColor }}
                        >
                          <span className="font-bold">theme_preview</span>
                          <span style={{ color: item.metadata?.accentColor }}>ACCENT_NEON</span>
                          <div className="h-6 opacity-80 border" style={{ background: item.metadata?.primaryBg }}></div>
                        </div>
                      )}

                      {item.kind === 'banner' && (
                        <div 
                          className="h-28 border border-outline-variant/30 bg-cover bg-center flex items-end p-2"
                          style={{ backgroundImage: `url(${item.metadata?.bannerUrl})` }}
                        >
                          <span className="text-[9px] font-bold text-white bg-black/60 px-2 py-0.5 uppercase">SKYLINE_PREVIEW</span>
                        </div>
                      )}

                      {item.kind === 'avatar' && (
                        <div className="h-28 bg-surface-container flex items-center justify-center border border-outline-variant/30 relative">
                          <div className="w-16 h-16 bg-surface flex items-center justify-center relative">
                            <span className="material-symbols-outlined text-outline-variant text-4xl">account_circle</span>
                            <div className="absolute inset-0 border-2 border-dashed border-secondary pointer-events-none"></div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-outline-variant/30 flex justify-between items-center">
                      <div className="flex items-center gap-1 font-label-mono text-label-mono text-sm font-bold text-yellow-400">
                        <span className="material-symbols-outlined text-xs">monetization_on</span>
                        <span>{item.price}</span>
                      </div>
                      
                      {owned ? (
                        <button 
                          disabled
                          className="px-4 py-2 border border-outline-variant/40 text-on-surface-variant/40 font-label-mono text-xs uppercase cursor-not-allowed"
                        >
                          ACQUIRED
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePurchaseCosmetic(item.sku)}
                          disabled={Number(profile.coins || 0) < item.price}
                          className={`px-4 py-2 font-label-mono text-xs font-bold uppercase transition-all ${
                            Number(profile.coins || 0) < item.price
                              ? 'border border-outline-variant/30 text-on-surface-variant/30 cursor-not-allowed'
                              : 'bg-primary text-black hover:bg-primary-fixed hover:shadow-[0_0_10px_var(--glow-primary)]'
                          }`}
                        >
                          PURCHASE_ITEM
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Inventory / Equipment */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <h3 className="font-label-mono text-label-mono text-lg text-primary font-bold uppercase tracking-wider border-b border-outline-variant/30 pb-4">
              PERSONAL_EQUIPMENT_LOCKER
            </h3>
            {inventoryList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inventoryList.map(inv => {
                  const item = cosmeticsList.find(c => c.id === inv.cosmeticId);
                  if (!item) return null;
                  const isEquipped = isCosmeticEquipped(item.id);
                  return (
                    <div key={inv.id} className="bg-surface border-2 border-outline-variant p-4 flex flex-col justify-between hover:border-primary transition-all">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-label-mono bg-primary-container text-primary font-bold px-2 py-0.5 uppercase tracking-widest">
                            {item.kind}
                          </span>
                          <span className="text-[9px] text-on-surface-variant font-label-mono uppercase">
                            ACQUIRED: {new Date(inv.acquiredAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-white font-bold uppercase text-sm tracking-wider">{item.name}</h4>
                      </div>

                      <div className="mt-4 pt-3 border-t border-outline-variant/30 flex justify-end">
                        <button
                          onClick={() => handleEquipCosmetic(item.id, item.kind, isEquipped)}
                          className={`w-full py-2 font-label-mono text-xs font-bold uppercase tracking-widest transition-all ${
                            isEquipped
                              ? 'bg-secondary text-black hover:bg-white'
                              : 'bg-primary-container text-primary border border-primary hover:bg-primary hover:text-black hover:shadow-[0_0_10px_rgba(0,246,246,0.3)]'
                          }`}
                        >
                          {isEquipped ? 'UNEQUIP_ITEM' : 'EQUIP_ITEM'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center bg-surface border border-dashed border-outline-variant/40 text-on-surface-variant text-sm font-label-mono space-y-4">
                <div>&gt; YOUR VIRTUAL STORAGE INVENTORY IS EMPTY.</div>
                <button 
                  onClick={() => setActiveTab('store')} 
                  className="px-5 py-2 bg-primary text-black font-label-mono font-bold text-xs uppercase tracking-widest hover:bg-primary-fixed transition-all"
                >
                  VISIT_VIRTUAL_MARKETPLACE
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Achievements Log & Sync */}
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-outline-variant/30 pb-4 gap-4">
              <div>
                <h3 className="font-label-mono text-label-mono text-lg text-primary font-bold uppercase tracking-wider">NEURAL_ACHIEVEMENT_CORE</h3>
                <p className="text-xs text-on-surface-variant uppercase font-label-mono mt-1">&gt; SYSTEM SYNCS AND MONITORS YOUR PLATFORM LEVEL ACHIEVEMENTS IN REALTIME</p>
              </div>
              <button
                onClick={handleSyncAchievements}
                disabled={syncingAchievements}
                className={`px-5 py-3 font-label-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border shadow-lg ${
                  syncingAchievements
                    ? 'border-outline-variant text-on-surface-variant/40 cursor-not-allowed animate-pulse'
                    : 'bg-primary text-black border-primary hover:bg-primary-fixed hover:shadow-[0_0_15px_rgba(0,246,246,0.4)] animate-pulse'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{syncingAchievements ? 'hourglass_empty' : 'sync'}</span>
                <span>{syncingAchievements ? 'SCANNING_NEURAL_LINKS...' : 'SYNC_ACHIEVEMENTS'}</span>
              </button>
            </div>

            <div className="space-y-4">
              {achievementsList.map(ach => (
                <div 
                  key={ach.id} 
                  className={`border-2 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all relative ${
                    ach.isUnlocked
                      ? 'bg-surface border-primary shadow-[0_0_10px_rgba(0,246,246,0.1)]'
                      : 'bg-surface/50 border-outline-variant/40 opacity-75'
                  }`}
                >
                  <div className="flex gap-4 items-center flex-1">
                    {/* Badge Icon box */}
                    <div className={`w-12 h-12 flex items-center justify-center shrink-0 border-2 ${
                      ach.isUnlocked ? 'border-primary bg-primary-container/20 text-primary' : 'border-outline-variant/40 bg-surface-container text-on-surface-variant/35'
                    }`}>
                      <span className="material-symbols-outlined text-2xl font-bold">
                        {ach.isUnlocked ? 'emoji_events' : 'lock'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-white font-bold uppercase text-sm tracking-wider">{ach.title}</h4>
                        <span className="text-[9px] font-label-mono px-2 py-0.5 border border-secondary/40 text-secondary uppercase bg-secondary-container/10">
                          +{ach.points} POINTS
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant">{ach.description}</p>
                      
                      {/* Dynamic Criteria Progress Indicator */}
                      {!ach.isUnlocked && (
                        <div className="w-48 mt-2 space-y-1">
                          <div className="flex justify-between text-[8px] font-label-mono text-outline-variant uppercase">
                            <span>PROGRESS</span>
                            <span>CRITERIA_PENDING</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-container border border-outline-variant/30">
                            <div className="h-full bg-outline-variant animate-pulse" style={{ width: '40%' }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 font-label-mono text-label-mono text-xs w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-outline-variant/20 pt-3 md:pt-0">
                    <div className="flex items-center gap-1 font-bold text-yellow-400">
                      <span className="material-symbols-outlined text-xs">monetization_on</span>
                      <span>REWARD: +{ach.coinReward} COINS</span>
                    </div>
                    {ach.isUnlocked ? (
                      <span className="text-[10px] text-primary bg-primary-container/10 border border-primary/20 px-2 py-1 uppercase tracking-widest">
                        UNLOCKED: {new Date(ach.unlockedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest">
                        LOCKED
                      </span>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Aesthetic Cyberpunk CSS Custom Keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 15px var(--glow-primary);
          }
          50% {
            opacity: .6;
            box-shadow: 0 0 5px var(--glow-primary);
          }
        }
      `}} />
    </div>
  );
}
