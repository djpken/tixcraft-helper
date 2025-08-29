# Tixcraft Automation Test Guide

## 測試目標
從 `https://tixcraft.com/activity/game/*` 頁面開始，測試自動化購票流程直到 `https://tixcraft.com/ticket/order` 頁面停止計時。

## 測試準備

### 1. 環境設置
- ✅ 安裝 Tampermonkey 擴展
- ✅ 導入 `main.js` 腳本
- ✅ 確保腳本在 `tixcraft.com` 域名下啟用

### 2. 配置面板設置
在開始測試前，請在控制面板中配置：

#### 左上角 - Booking Control Panel
- **Showtime**: 選擇場次編號 (1-5)
- **Verify code**: 預填驗證碼 (如果已知)
- **Auto Seat**: ☑️ 啟用自動選座
- **Seat**: 留空或填入特定座位號 (如 "C1")
- **Ticket account**: 選擇票數 (1-4)

#### 左下角 - Captcha Viewer Panel
- **持久化面板**: 跨頁面保持顯示
- **驗證碼輸入**: 自動聚焦於 area 頁面

## 測試流程

### Phase 1: 活動頁面 (Game Page)
**起始 URL**: `https://tixcraft.com/activity/game/*`

1. **開始計時** ⏱️
2. 腳本會自動監控 "立即購買" 或相關按鈕
3. 按鈕出現時自動點擊進入購票流程

**預期行為**:
- ✅ 自動檢測可點擊的購票按鈕
- ✅ 根據 Showtime 設置選擇對應場次
- ✅ 自動進入下一頁面

### Phase 2: 票務頁面 (Ticket Page)
**URL 模式**: `https://tixcraft.com/ticket/*/`

**預期行為**:
- ✅ 自動選擇票數 (根據 Ticket account 設置)
- ✅ 自動提交表單進入座位選擇頁面

### Phase 3: 座位選擇頁面 (Area Page)
**URL 模式**: `https://tixcraft.com/ticket/area/*`

**關鍵功能測試**:
1. **自動聚焦驗證碼輸入框** 🎯
   - 頁面載入後 300ms 自動聚焦到 Captcha Panel
   
2. **座位自動選擇** 🪑
   - 如果 Seat 欄位為空: 自動選擇第一個可用座位
   - 如果 Seat 欄位有值: 嘗試選擇指定座位
   - 如果 Auto Seat 關閉: 不進行自動選座

3. **驗證碼處理** 🔢
   - 手動輸入驗證碼到 Captcha Panel
   - 自動同步到頁面上的驗證碼欄位

4. **自動重新整理** 🔄
   - 如果座位不可用，自動重新整理頁面
   - 保持驗證碼輸入值

### Phase 4: 確認頁面 (Verify Page)
**URL 模式**: `https://tixcraft.com/ticket/verify/*`

**預期行為**:
- ✅ 自動填入預設的驗證碼
- ✅ 自動提交表單

### Phase 5: 訂單頁面 (Order Page) - 停止點
**終點 URL**: `https://tixcraft.com/ticket/order`

**停止計時** ⏹️ - 測試完成

## 性能指標

### 時間測量
- **目標時間**: < 5 秒 (從 game 頁面到 order 頁面)
- **測量點**:
  - T0: 點擊 game 頁面按鈕
  - T1: 進入 ticket 頁面
  - T2: 進入 area 頁面
  - T3: 完成座位選擇
  - T4: 到達 order 頁面

### 成功率指標
- **座位選擇成功率**: > 90%
- **驗證碼自動填入率**: > 95%
- **整體流程成功率**: > 85%

## 測試案例

### Test Case 1: 基本自動化流程
```
配置:
- Showtime: 1
- Auto Seat: ✅
- Seat: (空白)
- Ticket account: 2

預期結果:
✅ 自動選擇第一場次
✅ 自動選擇 2 張票
✅ 自動選擇第一個可用座位
✅ 成功到達訂單頁面
```

### Test Case 2: 指定座位測試
```
配置:
- Showtime: 2
- Auto Seat: ✅
- Seat: C10
- Ticket account: 1

預期結果:
✅ 自動選擇第二場次
✅ 自動選擇 1 張票
✅ 嘗試選擇 C10 座位
✅ 如果 C10 不可用，自動選擇其他座位
```

### Test Case 3: 手動座位選擇
```
配置:
- Showtime: 3
- Auto Seat: ❌
- Seat: (任意)
- Ticket account: 4

預期結果:
✅ 自動選擇第三場次
✅ 自動選擇 4 張票
❌ 不自動選擇座位，等待手動操作
```

## 故障排除

### 常見問題
1. **按鈕未被點擊**
   - 檢查 Showtime 設置是否正確
   - 查看控制台是否有錯誤訊息

2. **座位選擇失敗**
   - 確認 Auto Seat 是否啟用
   - 檢查座位是否真的可用

3. **驗證碼未自動填入**
   - 確認 Captcha Panel 中有輸入值
   - 檢查頁面是否有驗證碼欄位

4. **頁面重新整理過於頻繁**
   - 調整自動重新整理間隔
   - 檢查網路連線狀況

### 調試方法
1. 開啟瀏覽器開發者工具 (F12)
2. 查看 Console 標籤的訊息
3. 關鍵訊息包含:
   - `📍 Area page detected` - 確認頁面檢測
   - `❌ No available seats found` - 座位選擇問題
   - 錯誤訊息以 `🛑` 開頭

## 測試記錄範本

```
測試日期: ___________
測試者: ___________
瀏覽器: ___________

測試結果:
□ Game 頁面自動點擊: 成功/失敗
□ Ticket 頁面自動選擇: 成功/失敗  
□ Area 頁面座位選擇: 成功/失敗
□ 驗證碼自動聚焦: 成功/失敗
□ Verify 頁面自動提交: 成功/失敗
□ 到達 Order 頁面: 成功/失敗

總耗時: _____ 秒
備註: ___________
```

## 更新日誌
- v1.0: 初始測試指南
- 持久化 Captcha Panel 功能
- 自動聚焦優化
- 日誌訊息精簡
