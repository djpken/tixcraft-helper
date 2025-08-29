// ==UserScript==
// @name         Tixcraft assistant
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Includes activity/game instant purchase navigation, ticket page quick operations, area page display verification code only, quick focus on verification code input
// @author       You
// @match        https://tixcraft.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";



  // Preloading and caching system for maximum performance
  let PRELOADED_DATA = {
    seats: [],
    seatMap: new Map(),
    lastSeatScan: 0,
    captchaCache: new Map(),
    formElements: new Map()
  };



  // Ultra-fast seat preloading
  function preloadSeats() {
    const now = Date.now();
    // Only refresh if older than 100ms for ultra-fast updates
    if (now - PRELOADED_DATA.lastSeatScan < 100) {
      return PRELOADED_DATA.seats;
    }

    const seatElements = document.querySelectorAll(SELECTORS.SEAT_ELEMENTS);
    PRELOADED_DATA.seats = Array.from(seatElements);
    PRELOADED_DATA.seatMap.clear();
    
    // Build fast lookup map
    seatElements.forEach(element => {
      const textContent = element.textContent || element.innerText;
      const style = window.getComputedStyle(element);
      PRELOADED_DATA.seatMap.set(textContent.trim().toUpperCase(), {
        element,
        available: style.opacity === '1' || element.style.opacity === '1'
      });
    });
    
    PRELOADED_DATA.lastSeatScan = now;
    return PRELOADED_DATA.seats;
  }

  // Enhanced test function with preloading
  window.listAllSeats = function() {
    const seats = preloadSeats();
    console.log(`Found ${seats.length} available seats:`);
    seats.forEach((element, index) => {
      const textContent = element.textContent || element.innerText;
      const style = window.getComputedStyle(element);
      console.log(`${index + 1}. ${textContent} (opacity: ${style.opacity})`);
    });
    return seats;
  };

  // Ultra-fast seat search using preloaded data
  window.testSeatSearch = function(seatValue) {
    try {
      // 記錄座位搜索嘗試時間，防止自動刷新干擾
      sessionStorage.setItem('last_seat_attempt', Date.now().toString());
      
      // First try preloaded seat map for instant lookup
      preloadSeats();
      const upperSeatValue = seatValue.toUpperCase();
      
      // Direct map lookup for maximum speed
      if (PRELOADED_DATA.seatMap.has(upperSeatValue)) {
        const seatData = PRELOADED_DATA.seatMap.get(upperSeatValue);
        if (seatData.available) {
          console.log(`🎯 Found and clicking seat: ${upperSeatValue}`);
          seatData.element.click();
          return true;
        }
        return false;
      }

      // Fallback: search through preloaded seats
      for (let element of PRELOADED_DATA.seats) {
        const textContent = element.textContent || element.innerText;
        if (textContent.includes(seatValue)) {
          const style = window.getComputedStyle(element);
          if (style.opacity === '1' || element.style.opacity === '1') {
            element.click();
            return true;
          }
        }
      }

      // Last resort: real-time DOM query
      const seatElements = document.querySelectorAll(SELECTORS.SEAT_ELEMENTS);
      for (let element of seatElements) {
        const textContent = element.textContent || element.innerText;
        if (textContent.includes(seatValue)) {
          const style = window.getComputedStyle(element);
          if (style.opacity === '1' || element.style.opacity === '1') {
            element.click();
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  // Continuous aggressive monitoring system
  let MONITORING_SYSTEM = {
    seatMonitor: null,
    formMonitor: null,
    captchaMonitor: null,
    isActive: false
  };

  // Ultra-aggressive continuous seat monitoring
  function startContinuousMonitoring() {
    if (MONITORING_SYSTEM.isActive) return;
    MONITORING_SYSTEM.isActive = true;

    // Monitor seats with dynamic rate
    MONITORING_SYSTEM.seatMonitor = setInterval(() => {
      preloadSeats();
      
      // Auto-attempt seat selection if saved
      const savedSeat = localStorage.getItem("tixcraft_seat_value");
      if (savedSeat && savedSeat.trim()) {
        const upperSeat = savedSeat.trim().toUpperCase();
        if (PRELOADED_DATA.seatMap.has(upperSeat)) {
          const seatData = PRELOADED_DATA.seatMap.get(upperSeat);
          if (seatData.available) {
            seatData.element.click();
          }
        }
      }
    }, window.TIXCRAFT_ULTRA_MODE.seatMonitorRate);

    // Monitor forms and inputs with dynamic rate
    MONITORING_SYSTEM.formMonitor = setInterval(() => {
      const currentUrl = window.location.href;
      const isVerifyPage = /^https:\/\/tixcraft\.com\/ticket\/verify\/.*/.test(currentUrl);
      
      // Pre-cache critical elements
      getElement('verifyInput', true);
      getElement('submitButton', true); 
      getElement('agreeCheckbox', true);
      getElement('ticketSelect', true);
      
      // 在驗證頁面降低自動填寫頻率以防止無限循環
      if (isVerifyPage) {
        // 驗證頁面：檢查上次填寫時間，減少頻率
        const lastFillTime = parseInt(sessionStorage.getItem('last_verify_fill_time') || '0');
        const now = Date.now();
        if (now - lastFillTime > 2000) { // 2秒間隔
          autoFillVerificationCodes();
          sessionStorage.setItem('last_verify_fill_time', now.toString());
        }
      } else {
        // 其他頁面正常執行
        autoFillVerificationCodes();
      }
    }, window.TIXCRAFT_ULTRA_MODE.formMonitorRate);

    // Monitor captcha changes with dynamic rate
    MONITORING_SYSTEM.captchaMonitor = setInterval(() => {
      getAndStoreCaptcha();
    }, window.TIXCRAFT_ULTRA_MODE.captchaMonitorRate);
  }

  function stopContinuousMonitoring() {
    MONITORING_SYSTEM.isActive = false;
    if (MONITORING_SYSTEM.seatMonitor) {
      clearInterval(MONITORING_SYSTEM.seatMonitor);
      MONITORING_SYSTEM.seatMonitor = null;
    }
    if (MONITORING_SYSTEM.formMonitor) {
      clearInterval(MONITORING_SYSTEM.formMonitor);
      MONITORING_SYSTEM.formMonitor = null;
    }
    if (MONITORING_SYSTEM.captchaMonitor) {
      clearInterval(MONITORING_SYSTEM.captchaMonitor);
      MONITORING_SYSTEM.captchaMonitor = null;
    }
  }

  // Aggressive performance mode controls
  window.TIXCRAFT_ULTRA_MODE = {
    enabled: true,
    refreshRate: 1000,  // Area refresh every 1 second
    seatMonitorRate: 50,  // Seat check every 50ms
    formMonitorRate: 100, // Form check every 100ms
    captchaMonitorRate: 200, // Captcha check every 200ms
    
    // Ultra mode - even more aggressive
    enableUltraMode() {
      this.refreshRate = 500;  // 0.5 seconds for ultra mode
      this.seatMonitorRate = 25;
      this.formMonitorRate = 50;
      this.captchaMonitorRate = 100;
      console.log('🚀 ULTRA PERFORMANCE MODE ACTIVATED - Maximum hardware usage!');
      if (MONITORING_SYSTEM.isActive) {
        stopContinuousMonitoring();
        startContinuousMonitoring();
      }
    },
    
    // Extreme mode - sacrifice everything for speed
    enableExtremeMode() {
      this.refreshRate = 250;  // 0.25 seconds for extreme mode
      this.seatMonitorRate = 10;
      this.formMonitorRate = 25;
      this.captchaMonitorRate = 50;
      console.log('⚡ EXTREME PERFORMANCE MODE ACTIVATED - Warning: High CPU usage!');
      if (MONITORING_SYSTEM.isActive) {
        stopContinuousMonitoring();
        startContinuousMonitoring();
      }
    }
  };

  // Expose ultra mode controls to console
  window.enableUltraMode = () => window.TIXCRAFT_ULTRA_MODE.enableUltraMode();
  window.enableExtremeMode = () => window.TIXCRAFT_ULTRA_MODE.enableExtremeMode();


  
  // Placeholder for area refresh control functions - will be defined later

  console.log('Test functions loaded to global scope: listAllSeats(), testSeatSearch()');
  console.log('Performance controls: enableUltraMode(), enableExtremeMode()');
  console.log('Area refresh controls: checkRefreshStatus(), forceStartAreaRefresh(), forceStopAreaRefresh()');








  // Global error handler - execute first to intercept GTM errors
  window.addEventListener('error', function(e) {
    // Intercept GTM related errors
    if (e.filename && (e.filename.includes('gtm') || e.filename.includes('analytics'))) {
      console.log('🛑 Intercepted GTM error:', e.message);
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Intercept jQuery related GTM errors
    if (e.message && (e.message.includes('gtm') || e.message.includes('Uncaught [object Object]'))) {
      console.log('🛑 Intercepted jQuery GTM error:', e.message);
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Intercept all errors containing [object Object]
    if (e.message && e.message.includes('[object Object]')) {
      console.log('🛑 Intercepted [object Object] error:', e.message);
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // Intercept unhandled Promise rejections (possibly from GTM)
  window.addEventListener('unhandledrejection', function(e) {
    if (e.reason && (e.reason.toString().includes('gtm') || e.reason.toString().includes('analytics'))) {
      console.log('Intercepted GTM Promise error:', e.reason);
      e.preventDefault();
      return false;
    }
  });







  let assistantPanel = null;
  let currentCaptchaUrl = null;
  let storedCaptchaUrl = null;
  let refreshInterval = null;

  // Enhanced selector caching with pre-compiled selectors and priority ordering
  const SELECTORS = {
    VERIFY_INPUT: '#TicketForm_verifyCode',
    VERIFY_INPUT_FALLBACK: 'input[name="checkCode"]',
    SUBMIT_BUTTONS: [
      'button[type="submit"]',  // Most common first
      '#form-ticket-verify button[type="submit"]',
      'form button[type="submit"]',
      '.btn.btn-primary.btn-green',
      '.btn.btn-primary',
      'input[type="submit"]'
    ],
    SEAT_ELEMENTS: 'li.select_form_b a, li.select_form_a a',
    SEAT_ELEMENTS_AVAILABLE: 'li.select_form_b a[style*="opacity: 1"], li.select_form_a a[style*="opacity: 1"]',
    GAME_LIST: '#gameList',
    TICKET_BUTTONS: 'button[data-href*="/ticket/area/"]',
    AGREE_CHECKBOX: '#TicketForm_agree',
    TICKET_PRICE_SELECTS: [
      '#TicketForm_ticketPrice_01',
      '#TicketForm_ticketPrice_02', 
      '#TicketForm_ticketPrice_03',
      '#TicketForm_ticketPrice_04',
      '#TicketForm_ticketPrice_05',
      'select[name*="TicketForm[ticketPrice]"]',
      'select[id*="TicketForm_ticketPrice_"]'
    ],
    CAPTCHA_IMAGE: '#TicketForm_verifyCode-image'
  };

  // Pre-cache DOM elements for ultra-fast access
  let CACHED_ELEMENTS = {
    verifyInput: null,
    submitButton: null,
    agreeCheckbox: null,
    ticketSelect: null,
    captchaImage: null,
    gameList: null
  };

  // Ultra-fast element finder with aggressive caching
  function getElement(key, forceRefresh = false) {
    if (!forceRefresh && CACHED_ELEMENTS[key]) {
      return CACHED_ELEMENTS[key];
    }

    let element = null;
    switch(key) {
      case 'verifyInput':
        element = document.querySelector(SELECTORS.VERIFY_INPUT) || 
                 document.querySelector(SELECTORS.VERIFY_INPUT_FALLBACK);
        break;
      case 'submitButton':
        for (let selector of SELECTORS.SUBMIT_BUTTONS) {
          element = document.querySelector(selector);
          if (element) break;
        }
        break;
      case 'agreeCheckbox':
        element = document.querySelector(SELECTORS.AGREE_CHECKBOX);
        break;
      case 'ticketSelect':
        for (let selector of SELECTORS.TICKET_PRICE_SELECTS) {
          element = document.querySelector(selector);
          if (element) break;
        }
        break;
      case 'captchaImage':
        element = document.querySelector(SELECTORS.CAPTCHA_IMAGE);
        break;
      case 'gameList':
        element = document.querySelector(SELECTORS.GAME_LIST);
        break;
    }

    if (element) {
      CACHED_ELEMENTS[key] = element;
    }
    return element;
  }

  // Ultra-fast submit function with aggressive optimization
  function ultraFastSubmit() {
    // Try cached element first for maximum speed
    let submitBtn = CACHED_ELEMENTS.submitButton;
    
    if (!submitBtn) {
      // Fast selector-based search without logging for speed
      for (const selector of SELECTORS.SUBMIT_BUTTONS) {
        submitBtn = document.querySelector(selector);
        if (submitBtn) {
          CACHED_ELEMENTS.submitButton = submitBtn;
          break;
        }
      }
    }
    
    if (submitBtn) {
      submitBtn.click();
      return true;
    }
    
    return false;
  }

  // Legacy function for backwards compatibility
  function fastSubmit() {
    return ultraFastSubmit();
  }

  // Aggressive parallel DOM operations - sacrifice memory for speed
  function ultraFastDOMOperations(operations) {
    // Execute immediately without waiting for RAF for maximum speed
    operations.forEach(op => {
      try {
        op();
      } catch (e) {
        // Silent fail for speed
      }
    });
  }

  // Parallel execution engine for multiple tasks
  function executeInParallel(...tasks) {
    const promises = tasks.map(task => {
      return new Promise(resolve => {
        try {
          const result = task();
          resolve(result);
        } catch (e) {
          resolve(null);
        }
      });
    });
    return Promise.all(promises);
  }

  // Legacy function for backwards compatibility
  function batchDOMOperations(operations) {
    ultraFastDOMOperations(operations);
  }

  // Area page auto-refresh functionality
  let areaRefreshInterval = null;
  
  function setupAreaAutoRefresh() {
    // Clear any existing interval
    if (areaRefreshInterval) {
      clearInterval(areaRefreshInterval);
    }
    
    console.log(`🔄 Setting up area auto-refresh with ${window.TIXCRAFT_ULTRA_MODE.refreshRate}ms interval`);
    
    // 極簡化的刷新邏輯，主要防止用戶正在操作時刷新
    areaRefreshInterval = setInterval(() => {
      const now = Date.now();
      
      // 只檢查最基本的條件
      const hasUserInput = document.activeElement && (
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'SELECT' ||
        document.activeElement.tagName === 'TEXTAREA'
      );
      
      // 檢查最近1秒內是否有座位選擇嘗試（大幅縮短）
      const lastSeatAttempt = parseInt(sessionStorage.getItem('last_seat_attempt') || '0');
      const recentAttempt = now - lastSeatAttempt < 1000; // 只保護1秒
      
      // 極簡條件：只要沒有用戶輸入且最近沒有座位操作就刷新
      if (!hasUserInput && !recentAttempt) {
        console.log('🔄 Area page auto-refresh - executing');
        window.location.reload();
      } else {
        const reason = hasUserInput ? 'user typing' : 'recent seat click';
        const timeSinceAttempt = now - lastSeatAttempt;
        console.log(`⏸️ Delaying refresh - ${reason} (last attempt: ${timeSinceAttempt}ms ago)`);
      }
    }, window.TIXCRAFT_ULTRA_MODE.refreshRate);
  }
  
  function stopAreaAutoRefresh() {
    if (areaRefreshInterval) {
      clearInterval(areaRefreshInterval);
      areaRefreshInterval = null;
      const currentPageType = getPageType();
      console.log(`⏹️ Stopped area page auto-refresh (current page: ${currentPageType})`);
    }
  }

  // Ultra-fast element waiting with aggressive polling
  function ultraFastWaitForElement(selector, timeout = 1000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      function check() {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        } else {
          // Aggressive 10ms polling instead of 50ms
          setTimeout(check, 10);
        }
      }

      check();
    });
  }

  // Legacy compatibility 
  function waitForElement(selector, timeout = 1000) {
    return ultraFastWaitForElement(selector, timeout);
  }

  // New: Find and navigate to instant purchase button using gameList parent element
  function findAndNavigateToTicket() {
    // Get user selected button index (read from localStorage, default to 0)
    const selectedButtonIndex = parseInt(
      localStorage.getItem("tixcraft_button_index") || "0"
    );

    // Primary approach: Find buttons within gameList container
    const gameListContainer = document.getElementById("gameList");
    if (gameListContainer) {
      const gameListButtons = gameListContainer.querySelectorAll(SELECTORS.TICKET_BUTTONS);
      
      if (gameListButtons.length > 0) {
        // Select button based on user's chosen index, if index exceeds range then select the last one
        const selectedButton = gameListButtons[
          Math.min(selectedButtonIndex, gameListButtons.length - 1)
        ];
        const targetUrl = selectedButton.getAttribute("data-href");

        console.log(
          `Selected button ${Math.min(
            selectedButtonIndex + 1,
            gameListButtons.length
          )} from gameList container, navigating to:`,
          targetUrl
        );
        window.location.href = targetUrl;
        return true;
      }
    }

    // Fallback approach: Find buttons containing specific data-href anywhere on page
    const fallbackButtons = document.querySelectorAll(SELECTORS.TICKET_BUTTONS);
    if (fallbackButtons.length > 0) {
      const selectedButton = fallbackButtons[
        Math.min(selectedButtonIndex, fallbackButtons.length - 1)
      ];
      const targetUrl = selectedButton.getAttribute("data-href");

      console.log(
        `Selected button ${Math.min(
          selectedButtonIndex + 1,
          fallbackButtons.length
        )} via fallback method, navigating to:`,
        targetUrl
      );
      window.location.href = targetUrl;
      return true;
    }

    return false;
  }

  function monitorForTicketButtons() {
    if (findAndNavigateToTicket()) {
      return;
    }

    // Use MutationObserver to monitor dynamically loaded content
    const observer = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          if (findAndNavigateToTicket()) {
            observer.disconnect();
            return;
          }
        }
      }
    });

    // Start monitoring
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Reduced monitoring time for faster execution
    setTimeout(() => {
      observer.disconnect();
    }, 2000); // Reduced from 5 seconds to 2 seconds
  }

  // Path replacement functionality
  function redirectIfDetailPath() {
    const currentUrl = window.location.href;
    if (/^https:\/\/tixcraft\.com\/activity\/detail\/.*/.test(currentUrl)) {
      const newUrl = currentUrl.replace("/activity/detail/", "/activity/game/");
      window.location.href = newUrl;
      return true;
    }
    return false;
  }

  // Setup auto refresh
  function setupAutoRefresh() {
    const currentUrl = window.location.href;
    if (
      /^https:\/\/tixcraft\.com\/activity\/game\/.*/.test(currentUrl) ||
      currentUrl === "https://tixcraft.com/activity/game"
    ) {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      const now = new Date();
      const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      setTimeout(() => {
        window.location.reload();
        refreshInterval = setInterval(() => {
          window.location.reload();
        }, 60000);
      }, delay);
    }
  }

  // Stop auto refresh
  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

     // Remove header, footer, ad-footer and event-banner elements (only for known page types)
   function removeUnnecessaryElements(pageType) {
     try {
       // For unknown page types, preserve headers but still remove other elements
       const shouldRemoveHeaders = pageType !== "unknown";
       
       const headers = document.querySelectorAll('header');
       const footers = document.querySelectorAll('footer');
       const adFooters = document.querySelectorAll('#ad-footer');
       const eventBanners = document.querySelectorAll('.event-banner, #event-banner, [class*="event-banner"]');
       let removedCount = 0;

       // Only remove headers for known page types
       if (shouldRemoveHeaders) {
         headers.forEach(header => {
           if (header && header.parentNode) {
             header.remove();
             removedCount++;
           }
         });
       }

       footers.forEach(footer => {
         if (footer && footer.parentNode) {
           footer.remove();
           removedCount++;
         }
       });

       adFooters.forEach(adFooter => {
         if (adFooter && adFooter.parentNode) {
           adFooter.remove();
           removedCount++;
         }
       });

       eventBanners.forEach(eventBanner => {
         if (eventBanner && eventBanner.parentNode) {
           eventBanner.remove();
           removedCount++;
         }
       });

       if (removedCount > 0) {
         const elementsDescription = shouldRemoveHeaders 
           ? "header, footer, ad-footer and event-banner elements" 
           : "footer, ad-footer and event-banner elements (header preserved for unknown page type)";
         console.log(`Removed ${removedCount} ${elementsDescription}`);
       }
     } catch (error) {
       console.warn('Element removal error:', error);
     }
   }





  // Auto-fill verification code functionality with submit control
  let SUBMIT_STATE = {
    verifySubmitted: false,
    ticketSubmitted: false,
    lastSubmitTime: 0,
    lastVerifyValue: "",
    submitCount: 0,
    pageLoadTime: Date.now() // 添加頁面載入時間追蹤
  };

  function autoFillVerificationCodes() {
    const currentUrl = window.location.href;

    // Auto-fill on verify page with enhanced loop prevention
    if (/^https:\/\/tixcraft\.com\/ticket\/verify\/.*/.test(currentUrl)) {
      const verifyInput = document.querySelector('input[name="checkCode"]');
      const savedVerify = localStorage.getItem("tixcraft_verify_value");
      
      if (verifyInput && savedVerify) {
        const now = Date.now();
        
        // 檢查是否在同一個頁面載入週期內已經提交過
        const pageLoadKey = `tixcraft_submit_${currentUrl}_${SUBMIT_STATE.pageLoadTime}`;
        const alreadySubmittedThisPage = sessionStorage.getItem(pageLoadKey);
        
        // Enhanced loop prevention with multiple checks
        const valueChanged = verifyInput.value !== savedVerify;
        const timeSinceLastSubmit = now - SUBMIT_STATE.lastSubmitTime;
        const notRecentlySubmitted = timeSinceLastSubmit > 3000; // 增加到3秒冷卻時間
        const valueNotRecentlyUsed = SUBMIT_STATE.lastVerifyValue !== savedVerify;
        const notSubmittedThisPage = !alreadySubmittedThisPage;
        
        // 只有在滿足所有條件時才提交
        if (valueChanged && notRecentlySubmitted && valueNotRecentlyUsed && notSubmittedThisPage) {
          verifyInput.value = savedVerify;
          verifyInput.dispatchEvent(new Event("input", { bubbles: true }));
          
          // 標記此頁面已提交，防止重複提交
          sessionStorage.setItem(pageLoadKey, 'true');
          
          // Auto-submit with strict loop prevention
          const form = verifyInput.closest('form');
          let submitBtn = null;
          
          if (form) {
            submitBtn = form.querySelector('button[type="submit"]');
          }
          
          if (!submitBtn) {
            submitBtn = document.querySelector('button[type="submit"]');
          }
          
          if (submitBtn) {
            // Update submit state
            SUBMIT_STATE.lastSubmitTime = now;
            SUBMIT_STATE.lastVerifyValue = savedVerify;
            SUBMIT_STATE.submitCount++;
            
            console.log(`🚀 Auto-submitting verify form #${SUBMIT_STATE.submitCount} (enhanced loop prevention active)`);
            
            // 延遲提交以確保表單填寫完成
            setTimeout(() => {
              if (!sessionStorage.getItem(pageLoadKey + '_submitted')) {
                sessionStorage.setItem(pageLoadKey + '_submitted', 'true');
                submitBtn.click();
              }
            }, 100);
          }
        } else {
          // 填入驗證碼但不自動提交，讓用戶手動提交
          if (valueChanged && verifyInput.value !== savedVerify) {
            verifyInput.value = savedVerify;
            verifyInput.dispatchEvent(new Event("input", { bubbles: true }));
            console.log('🔄 Verification code filled, manual submit required to prevent loop');
          }
        }
      }
    }

    // Auto-fill on ticket page
    if (/^https:\/\/tixcraft\.com\/ticket\/ticket\/.*/.test(currentUrl)) {
      const captchaInput = document.querySelector("#TicketForm_verifyCode");
      const savedCaptura = localStorage.getItem("tixcraft_captura_value");
      if (captchaInput && savedCaptura) {
        captchaInput.value = savedCaptura;
        captchaInput.dispatchEvent(new Event("input", { bubbles: true }));
        
        // Clear captcha code from localStorage after auto-fill to prevent reuse
        localStorage.removeItem("tixcraft_captura_value");
        console.log("🧹 Cleared captcha code from localStorage after auto-fill");
        
        // Also clear the input field in assistant panel if it exists
        if (assistantPanel) {
          const capturaInput = assistantPanel.querySelector('input[placeholder="Enter captura code"]');
          if (capturaInput) {
            capturaInput.value = "";
            console.log("🧹 Cleared captcha input field in assistant panel");
          }
        }
        
        // Auto-submit after filling captcha code
        console.log("🚀 Auto-submitting after filling captcha code:", savedCaptura);
        fastSubmit();
      }
    }
  }

  // Focus on verification code input (ticket page) or checkCode input (verify page)
  function focusOnVerifyCodeInput() {
    try {
      const currentUrl = window.location.href;
      let inputElement = null;

      // Choose different input based on page type - immediate selection for speed
      if (/^https:\/\/tixcraft\.com\/ticket\/verify\/.*/.test(currentUrl)) {
        // verify page
        inputElement = document.querySelector('input[name="checkCode"]');
      } else {
        // ticket page - use cached selector
        inputElement = document.querySelector(SELECTORS.VERIFY_INPUT);
      }

      if (inputElement && inputElement.offsetParent !== null) {
        inputElement.scrollIntoView({
          behavior: "instant",
          block: "center",
        });

        inputElement.focus();

        if (document.activeElement === inputElement) {
          inputElement.style.outline = "2px solid #007bff";
          inputElement.style.boxShadow = "0 0 5px rgba(0,123,255,0.5)";

          // Remove visual feedback faster for immediate response
          setTimeout(() => {
            inputElement.style.outline = "";
            inputElement.style.boxShadow = "";
          }, 200);
        } else {
          inputElement.focus();
        }
      }
    } catch (error) {
      // Handle error silently
    }
  }

  // Ultra-fast ticket selection using cached elements
  function ultraFastFindTicketSelect() {
    // Try cached element first
    let element = CACHED_ELEMENTS.ticketSelect;
    if (element) return element;

    // Use pre-compiled selectors for speed
    for (let selector of SELECTORS.TICKET_PRICE_SELECTS) {
      element = document.querySelector(selector);
      if (element) {
        CACHED_ELEMENTS.ticketSelect = element;
        return element;
      }
    }
    return null;
  }

  // Legacy compatibility
  function findTicketPriceSelect() {
    return ultraFastFindTicketSelect();
  }

  // Get and store captcha
  function getAndStoreCaptcha() {
    const existingImg = document.querySelector("#TicketForm_verifyCode-image");
    if (existingImg && existingImg.src) {
      const fullUrl = existingImg.src.startsWith("/")
        ? `https://tixcraft.com${existingImg.src}`
        : existingImg.src;

      storedCaptchaUrl = fullUrl;
      currentCaptchaUrl = fullUrl;

      try {
        localStorage.setItem("tixcraft_captcha_url", fullUrl);
        localStorage.setItem(
          "tixcraft_captcha_timestamp",
          Date.now().toString()
        );
      } catch (error) {
        // Handle error silently
      }

      return fullUrl;
    }
    return null;
  }

  // Get captcha from storage
  function getStoredCaptcha() {
    if (storedCaptchaUrl) {
      return storedCaptchaUrl;
    }

    try {
      const stored = localStorage.getItem("tixcraft_captcha_url");
      const timestamp = localStorage.getItem("tixcraft_captcha_timestamp");

      if (stored && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        const maxAge = 30 * 60 * 1000; // 30 minutes

        if (age < maxAge) {
          storedCaptchaUrl = stored;
          return stored;
        } else {
          localStorage.removeItem("tixcraft_captcha_url");
          localStorage.removeItem("tixcraft_captcha_timestamp");
        }
      }
    } catch (error) {
      // Handle error silently
    }
    return null;
  }

  // Update captcha display
  function updateCaptchaDisplay(imageUrl, title = "Captcha") {
    if (!assistantPanel) {
      assistantPanel = createTixcraftAssistantPanel();
    }

    const contentDiv = assistantPanel.querySelector(".captcha-content");
    const existingImg = contentDiv.querySelector("img");

    if (!existingImg) {
      // Create title
      const captchaTitle = document.createElement("div");
      captchaTitle.textContent = title;
      captchaTitle.style.cssText = `
                font-size: 14px;
                color: #495057;
                margin-bottom: 8px;
                font-weight: bold;
                text-align: center;
            `;

      // Create image
      const imgElement = document.createElement("img");
      imgElement.src = imageUrl;
      imgElement.alt = title;
      imgElement.style.cssText = `
                max-width: 100%;
                height: auto;
                border: 2px solid #007bff;
                border-radius: 4px;
                background: white;
                display: block;
                margin: 0 auto;
            `;

      // Add page type hint
      const currentUrl = window.location.href;
      const isTicketPage = /^https:\/\/tixcraft\.com\/ticket\/ticket\/.*/.test(
        currentUrl
      );

      const infoText = document.createElement("div");
      if (isTicketPage) {
        infoText.textContent = "(Ticket page)";
        infoText.style.color = "#007bff";
      } else {
        infoText.textContent = "(Area page - Keep existing captcha)";
        infoText.style.color = "#6c757d";
      }
      infoText.style.cssText += `
                font-size: 11px;
                margin-top: 5px;
                text-align: center;
                font-style: italic;
            `;

      contentDiv.appendChild(captchaTitle);
      contentDiv.appendChild(imgElement);
      contentDiv.appendChild(infoText);
    } else {
      // Update existing image
      existingImg.src = imageUrl;
    }
  }

  async function loadAndDisplayCaptcha() {
    const currentUrl = window.location.href;
    const isTicketPage = /^https:\/\/tixcraft\.com\/ticket\/ticket\/.*/.test(
      currentUrl
    );
    const isAreaPage = /^https:\/\/tixcraft\.com\/ticket\/area\/.*/.test(
      currentUrl
    );

    if (isTicketPage) {
      // Ticket page: only use existing captcha
      const existingCaptchaUrl = getAndStoreCaptcha();
      if (existingCaptchaUrl) {
        updateCaptchaDisplay(existingCaptchaUrl, "Existing page captcha");
      }
    } else if (isAreaPage) {
      // Area page: try to use stored captcha
      const storedCaptcha = getStoredCaptcha();
      if (storedCaptcha) {
        updateCaptchaDisplay(storedCaptcha, "Stored captcha");
      } else {
        // Try existing page captcha
        const existingCaptchaUrl = getAndStoreCaptcha();
        if (existingCaptchaUrl) {
          updateCaptchaDisplay(existingCaptchaUrl, "Existing page captcha");
        }
      }
    }
  }

  function createTixcraftAssistantPanel() {
    let container = document.getElementById("tixcraft-assistant-panel");

    if (!container) {
      container = document.createElement("div");
      container.id = "tixcraft-assistant-panel";

      container.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 280px;
                padding: 15px;
                background: #ffffff;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            `;

      // Add title bar
      const titleBar = document.createElement("div");
      titleBar.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #e9ecef;
            `;

      const title = document.createElement("div");
      title.textContent = "Tixcraft Assistant";
      title.style.cssText = `
                font-weight: 600;
                color: #495057;
                font-size: 14px;
            `;

      // Add minimize button
      const minimizeBtn = document.createElement("button");
      minimizeBtn.textContent = "−";
      minimizeBtn.style.cssText = `
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 3px;
                width: 24px;
                height: 24px;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                color: #6c757d;
            `;

      let isMinimized = false;
      minimizeBtn.onclick = () => {
        const verifySection = container.querySelector(".verify-section");
        const buttonSection = container.querySelector(".button-section");
        const seatSection = container.querySelector(".seat-section");
        const captchaContent = container.querySelector(".captcha-content");
        const capturaSection = container.querySelector(".captura-section");
        if (isMinimized) {
          // Ensure container returns to correct position when expanded
          container.style.left = "20px";
          container.style.bottom = "20px";
          container.style.right = "auto";
          container.style.top = "auto";

          buttonSection.style.display = "block";
          verifySection.style.display = "block";
          seatSection.style.display = "block";
          captchaContent.style.display = "block";
          capturaSection.style.display = "block";
          minimizeBtn.textContent = "−";
          isMinimized = false;
        } else {
          buttonSection.style.display = "none";
          verifySection.style.display = "none";
          seatSection.style.display = "none";
          captchaContent.style.display = "none";
          capturaSection.style.display = "none";
          minimizeBtn.textContent = "+";
          isMinimized = true;
        }
      };

      titleBar.appendChild(title);
      titleBar.appendChild(minimizeBtn);
      container.appendChild(titleBar);

      // Button selection area (shown on all pages)
      const buttonSection = document.createElement("div");
      buttonSection.className = "button-section";
      buttonSection.style.cssText = `
                            margin-bottom: 12px;
                            padding-bottom: 12px;
                            border-bottom: 1px solid #e9ecef;
                            display: block;
                        `;

      const buttonLabel = document.createElement("label");
      buttonLabel.textContent = "Button Selection:";
      buttonLabel.style.cssText = `
                            display: block;
                            font-size: 12px;
                            color: #495057;
                            margin-bottom: 4px;
                            font-weight: 500;
                        `;

      const buttonSelect = document.createElement("select");
      buttonSelect.style.cssText = `
                            width: 100%;
                            padding: 6px 8px;
                            border: 1px solid #ced4da;
                            border-radius: 4px;
                            font-size: 12px;
                            box-sizing: border-box;
                            background: white;
                        `;

             // Add options (default 1-5 options provided)
       for (let i = 0; i < 5; i++) {
         const option = document.createElement("option");
         option.value = i.toString();
         option.textContent = `Show ${i + 1}`;
         buttonSelect.appendChild(option);
       }

      // Load saved value
      buttonSelect.value = localStorage.getItem("tixcraft_button_index") || "0";

      buttonSelect.addEventListener("change", () => {
        localStorage.setItem("tixcraft_button_index", buttonSelect.value);
        console.log(
          `Set to select button ${parseInt(buttonSelect.value) + 1} for instant purchase`
        );
      });

      buttonSection.appendChild(buttonLabel);
      buttonSection.appendChild(buttonSelect);
      container.appendChild(buttonSection);

      // 1. Verify input area (top)
      const verifySection = document.createElement("div");
      verifySection.className = "verify-section";
      verifySection.style.cssText = `
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e9ecef;
            `;

      const verifyLabel = document.createElement("label");
      verifyLabel.textContent = "Verify:";
      verifyLabel.style.cssText = `
                display: block;
                font-size: 12px;
                color: #495057;
                margin-bottom: 4px;
                font-weight: 500;
            `;

      const verifyInput = document.createElement("input");
      verifyInput.type = "text";
      verifyInput.placeholder = "Enter verify code";
      verifyInput.style.cssText = `
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 12px;
                box-sizing: border-box;
            `;

      // Load saved value
      verifyInput.value = localStorage.getItem("tixcraft_verify_value") || "";

      verifyInput.addEventListener("input", () => {
        localStorage.setItem("tixcraft_verify_value", verifyInput.value);
        // Auto-fill with built-in loop prevention
        autoFillVerificationCodes();
      });

      // Auto-submit is now handled automatically with loop prevention

      verifySection.appendChild(verifyLabel);
      verifySection.appendChild(verifyInput);
      container.appendChild(verifySection);

      // Seat selection area (shown below verify on all pages)
      const seatSection = document.createElement("div");
      seatSection.className = "seat-section";
      seatSection.style.cssText = `
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e9ecef;
            `;

      const seatLabel = document.createElement("label");
      seatLabel.textContent = "Seat Selection:";
      seatLabel.style.cssText = `
                display: block;
                font-size: 12px;
                color: #495057;
                margin-bottom: 4px;
                font-weight: 500;
            `;

      const seatInput = document.createElement("input");
      seatInput.type = "text";
      seatInput.placeholder = "Enter seat area (e.g. C1)";
      seatInput.style.cssText = `
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 12px;
                box-sizing: border-box;
            `;

      // Load saved value
      seatInput.value = localStorage.getItem("tixcraft_seat_value") || "";

              seatInput.addEventListener("input", () => {
          const seatValue = seatInput.value.trim().toUpperCase();
          localStorage.setItem("tixcraft_seat_value", seatValue);

          // If there's an input value, try to find and click the corresponding seat element
          if (seatValue) {
            window.testSeatSearch(seatValue);
          }
        });

      seatSection.appendChild(seatLabel);
      seatSection.appendChild(seatInput);
      container.appendChild(seatSection);

      // 2. Captcha display area (middle)
      const captchaContent = document.createElement("div");
      captchaContent.className = "captcha-content";
      captchaContent.style.cssText = `
                text-align: center;
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e9ecef;
            `;
      container.appendChild(captchaContent);

      // 3. Captura input area (bottom)
      const capturaSection = document.createElement("div");
      capturaSection.className = "captura-section";
      capturaSection.style.cssText = `
                margin-bottom: 0;
            `;

      const capturaLabel = document.createElement("label");
      capturaLabel.textContent = "Captura:";
      capturaLabel.style.cssText = `
                display: block;
                font-size: 12px;
                color: #495057;
                margin-bottom: 4px;
                font-weight: 500;
            `;

      const capturaInput = document.createElement("input");
      capturaInput.type = "text";
      capturaInput.placeholder = "Enter captura code";
      capturaInput.style.cssText = `
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 12px;
                box-sizing: border-box;
            `;

      // Load saved value
      capturaInput.value = localStorage.getItem("tixcraft_captura_value") || "";

      capturaInput.addEventListener("input", () => {
        localStorage.setItem("tixcraft_captura_value", capturaInput.value);
        autoFillVerificationCodes();
      });

      // Listen for real-time changes in verify input
      verifyInput.addEventListener("input", () => {
        const currentValue = verifyInput.value;
        localStorage.setItem("tixcraft_verify_value", currentValue);

        // Note: Removed auto-submit for verify pages per user request
      });

      capturaSection.appendChild(capturaLabel);
      capturaSection.appendChild(capturaInput);
      container.appendChild(capturaSection);



      document.body.appendChild(container);
    }

    return container;
  }

  // Check page type
  function getPageType(url = window.location.href) {
    const currentUrl = url;
    if (/^https:\/\/tixcraft\.com\/ticket\/ticket\/.*/.test(currentUrl)) {
      return "ticket";
    } else if (/^https:\/\/tixcraft\.com\/ticket\/area\/.*/.test(currentUrl)) {
      return "area";
    } else if (
      /^https:\/\/tixcraft\.com\/ticket\/verify\/.*/.test(currentUrl)
    ) {
      return "verify";
    } else if (
      /^https:\/\/tixcraft\.com\/activity\/game\/.*/.test(currentUrl) ||
      currentUrl === "https://tixcraft.com/activity/game"
    ) {
      return "game";
    } else if (
      /^https:\/\/tixcraft\.com\/activity\/detail\/.*/.test(currentUrl)
    ) {
      return "detail";
    } else if (
      /^https:\/\/tixcraft\.com\/ticket\/order\/.*/.test(currentUrl)
    ) {
      return "order";
    }
    return "unknown";
  }

          // Quick execution of main functions
  async function executeScript() {
    try {
      // 重置頁面載入時間，確保每次頁面載入都有唯一標識
      SUBMIT_STATE.pageLoadTime = Date.now();
      
      // Cache URL and page type for performance
      const currentUrl = window.location.href;
      const pageType = getPageType(currentUrl);



             // Immediately remove unnecessary DOM elements to improve performance
      removeUnnecessaryElements(pageType);



       if (pageType === "detail") {
         // Immediate redirect for maximum speed
         redirectIfDetailPath();
         return;
       }



      if (pageType === "area") {
        console.log('📍 Confirmed area page - setting up auto-refresh');
        setupAreaAutoRefresh();
        
        // Start continuous aggressive monitoring
        startContinuousMonitoring();
        
        // Immediate seat preloading
        preloadSeats();
        
        // Ultra-aggressive parallel seat selection with refresh control
        const savedSeat = localStorage.getItem("tixcraft_seat_value");
        if (savedSeat && savedSeat.trim()) {
          const seatValue = savedSeat.trim().toUpperCase();
          
          // 記錄開始選座位的時間
          sessionStorage.setItem('last_seat_attempt', Date.now().toString());
          console.log(`🎯 Starting seat selection for: ${seatValue}`);
          
          // Execute multiple attempts in parallel immediately
          executeInParallel(
            () => window.testSeatSearch(seatValue),
            () => {
              // Direct map lookup for speed
              sessionStorage.setItem('last_seat_attempt', Date.now().toString());
              if (PRELOADED_DATA.seatMap.has(seatValue)) {
                const seatData = PRELOADED_DATA.seatMap.get(seatValue);
                if (seatData.available) {
                  console.log(`🎯 Direct map: clicking seat ${seatValue}`);
                  seatData.element.click();
                  return true;
                }
              }
              return false;
            },
            () => {
              // Alternative seat finding method
              sessionStorage.setItem('last_seat_attempt', Date.now().toString());
              const seatElements = document.querySelectorAll(SELECTORS.SEAT_ELEMENTS);
              for (let element of seatElements) {
                const textContent = element.textContent || element.innerText;
                if (textContent.includes(seatValue)) {
                  const style = window.getComputedStyle(element);
                  if (style.opacity === '1' || element.style.opacity === '1') {
                    console.log(`🎯 Alternative method: clicking seat ${seatValue}`);
                    element.click();
                    return true;
                  }
                }
              }
              return false;
            }
          );
          
          // Immediate fallback attempts without delay
          window.testSeatSearch(seatValue);
          
          // Additional rapid attempts with faster intervals
          setTimeout(() => window.testSeatSearch(seatValue), 10);
          setTimeout(() => window.testSeatSearch(seatValue), 25);
          setTimeout(() => window.testSeatSearch(seatValue), 50);
          setTimeout(() => window.testSeatSearch(seatValue), 100);
        }

        // Monitor dynamic seat loading
        const areaObserver = new MutationObserver((mutations) => {
          for (let mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
              // Check if there are new seat elements using cached selector
              const newSeats = document.querySelectorAll(SELECTORS.SEAT_ELEMENTS);
              if (newSeats.length > 0) {
                const savedSeat = localStorage.getItem("tixcraft_seat_value");
                if (savedSeat && savedSeat.trim()) {
                  console.log(`Detected new seat loading, immediate retry: ${savedSeat}`);
                  // Immediate retry for fastest selection
                  window.testSeatSearch(savedSeat.trim().toUpperCase());
                  areaObserver.disconnect(); // Stop monitoring after success
                  break;
                }
              }
            }
          }
        });

        // Start monitoring
        areaObserver.observe(document.body, {
          childList: true,
          subtree: true
        });

        // Reduced monitoring time for faster execution
        setTimeout(() => {
          areaObserver.disconnect();
          // 確保在監控結束後自動刷新仍然運行
          if (!areaRefreshInterval) {
            console.log('🔄 Re-enabling auto-refresh after seat monitoring');
            setupAreaAutoRefresh();
          }
        }, 3000); // Reduced from 10 seconds to 3 seconds
      }

      // New: Handle instant purchase buttons on game page
      if (pageType === "game") {
        setupAutoRefresh();

        // Monitor instant purchase buttons
        monitorForTicketButtons();

        // Create UI container immediately for faster response
        assistantPanel = createTixcraftAssistantPanel();

        return;
      } else {
        stopAutoRefresh();
        // 只在非區域頁面時才停止區域刷新
        if (pageType !== "area") {
          stopAreaAutoRefresh(); // Stop area refresh when not on area page
        }
      }

      if (pageType === "ticket") {
        // Ultra-fast parallel execution of all ticket operations
        executeInParallel(
          // Task 1: Set ticket quantity
          () => {
            const selectElement = ultraFastFindTicketSelect();
            if (selectElement) {
              const option2 = selectElement.querySelector('option[value="2"]');
              if (option2) {
                selectElement.value = "2";
                selectElement.dispatchEvent(new Event("change", { bubbles: true }));
              } else {
                const options = Array.from(selectElement.options).filter(
                  (opt) => opt.value !== "0"
                );
                if (options.length > 0) {
                  const maxOption = options[options.length - 1];
                  selectElement.value = maxOption.value;
                  selectElement.dispatchEvent(new Event("change", { bubbles: true }));
                }
              }
            }
            return true;
          },
          
          // Task 2: Check agreement checkbox
          () => {
            let checkboxElement = getElement('agreeCheckbox');
            if (!checkboxElement) {
              checkboxElement = document.querySelector(SELECTORS.AGREE_CHECKBOX);
            }
            if (checkboxElement) {
              checkboxElement.checked = true;
              checkboxElement.dispatchEvent(new Event("change", { bubbles: true }));
              return true;
            }
            return false;
          },
          
          // Task 3: Pre-cache captcha
          () => {
            getAndStoreCaptcha();
            return true;
          },
          
          // Task 4: Focus on input immediately
          () => {
            focusOnVerifyCodeInput();
            return true;
          }
        );

        // Immediate fallback for checkbox if parallel execution failed
        setTimeout(() => {
          const checkboxElement = document.querySelector(SELECTORS.AGREE_CHECKBOX);
          if (checkboxElement && !checkboxElement.checked) {
            checkboxElement.checked = true;
            checkboxElement.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }, 10);
      }

      // Ultra-fast parallel focus and auto-fill operations  
      if (pageType === "ticket" || pageType === "verify") {
        executeInParallel(
          () => focusOnVerifyCodeInput(),
          () => autoFillVerificationCodes()
        );
      }

      // 5. Create assistant panel immediately for faster UI response
      assistantPanel = createTixcraftAssistantPanel();
      
      // Immediate captcha handling - no delay for maximum speed
      if (pageType === "ticket" || pageType === "area" || pageType === "verify") {
        loadAndDisplayCaptcha();
      }
    } catch (error) {
      // Handle error silently
    }
  }

  function isTargetPage() {
    const currentUrl = window.location.href;
    return /^https:\/\/tixcraft\.com\/.*/.test(currentUrl);
  }

  window.addEventListener("beforeunload", () => {
    stopAutoRefresh();
    stopAreaAutoRefresh();
    stopContinuousMonitoring();
  });

   // Performance optimization: early exit if not target page
   if (isTargetPage()) {
     executeScript();

     if (document.readyState === "loading") {
       document.addEventListener("DOMContentLoaded", executeScript);
     }

     // Test functions already exposed above
     window.testSeatSearch = window.testSeatSearch; // Already defined at script start
     console.log('Test functions loaded: listAllSeats(), testSeatSearch()');
   }

   // Monitor DOM changes, remove dynamically loaded specified elements and protect new iframes
   const elementObserver = new MutationObserver((mutations) => {
      let dynamicRemovedCount = 0;
      let foundNewIframes = false;
      const currentPageType = getPageType(); // Get current page type for dynamic removal

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            try {
              // Check if it's a new iframe
              if (node.tagName && node.tagName.toLowerCase() === 'iframe') {
                foundNewIframes = true;
              }

              // Check if it's a specified element type
              if (node.tagName && (
                (currentPageType !== "unknown" && node.tagName.toLowerCase() === 'header') ||
                node.tagName.toLowerCase() === 'footer'
              )) {
                if (node.parentNode) {
                  node.remove();
                  dynamicRemovedCount++;
                }
              } else if (node.id === 'ad-footer' || node.id === 'event-banner') {
                if (node.parentNode) {
                  node.remove();
                  dynamicRemovedCount++;
                }
              } else if (node.className && typeof node.className === 'string' &&
                         node.className.includes('event-banner')) {
                if (node.parentNode) {
                  node.remove();
                  dynamicRemovedCount++;
                }
              } else if (node.querySelectorAll) {
                // Check if there are new iframes inside
                const iframes = node.querySelectorAll('iframe');
                if (iframes.length > 0) {
                  foundNewIframes = true;
                }
                 // Check if there are specified elements inside
                 const headers = node.querySelectorAll('header');
                 const footers = node.querySelectorAll('footer');
                 const adFooters = node.querySelectorAll('#ad-footer');
                 const eventBanners = node.querySelectorAll('.event-banner, #event-banner, [class*="event-banner"]');

                 // Only remove headers for known page types
                 if (currentPageType !== "unknown") {
                   headers.forEach(header => {
                     if (header && header.parentNode) {
                       header.remove();
                       dynamicRemovedCount++;
                     }
                   });
                 }

                 footers.forEach(footer => {
                   if (footer && footer.parentNode) {
                     footer.remove();
                     dynamicRemovedCount++;
                   }
                 });

                 adFooters.forEach(adFooter => {
                   if (adFooter && adFooter.parentNode) {
                     adFooter.remove();
                     dynamicRemovedCount++;
                   }
                 });

                 eventBanners.forEach(eventBanner => {
                   if (eventBanner && eventBanner.parentNode) {
                     eventBanner.remove();
                     dynamicRemovedCount++;
                   }
                 });
               }
             } catch (error) {
               console.warn('Dynamic element removal error:', error);
             }
           }
         });
       });

       if (dynamicRemovedCount > 0) {
         console.log(`Remove ${dynamicRemovedCount} elements`);
       }
     });

     elementObserver.observe(document.documentElement, {
       childList: true,
       subtree: true
     });

   // Define area refresh control functions at the end to ensure all dependencies are available
   window.checkRefreshStatus = function() {
     const pageType = getPageType();
     console.log(`Current page type: ${pageType}`);
     console.log(`Refresh rate: ${window.TIXCRAFT_ULTRA_MODE.refreshRate}ms`);
     console.log(`Area refresh active: ${areaRefreshInterval !== null}`);
     if (areaRefreshInterval) {
       console.log('✅ Area auto-refresh is running');
     } else {
       console.log('❌ Area auto-refresh is NOT running');
     }
     return {
       pageType,
       refreshRate: window.TIXCRAFT_ULTRA_MODE.refreshRate,
       isActive: areaRefreshInterval !== null
     };
   };
   
   window.forceStartAreaRefresh = function() {
     console.log('🔧 Force starting area refresh...');
     setupAreaAutoRefresh();
   };
   
   window.forceStopAreaRefresh = function() {
     console.log('🛑 Force stopping area refresh...');
     stopAreaAutoRefresh();
   };

   // 添加無條件刷新模式
   window.enableDirectRefresh = function() {
     console.log('⚡ Enabling direct refresh mode (no checks)...');
     stopAreaAutoRefresh();
     areaRefreshInterval = setInterval(() => {
       console.log('🔄 Direct refresh - no conditions checked');
       window.location.reload();
     }, window.TIXCRAFT_ULTRA_MODE.refreshRate);
   };

   // 清除所有座位選擇記錄
   window.clearSeatAttempts = function() {
     sessionStorage.removeItem('last_seat_attempt');
     console.log('🧹 Cleared seat attempt records');
   };

   // 心跳檢查機制 - 每5秒檢查一次
   window.startRefreshHeartbeat = function() {
     if (window.refreshHeartbeat) {
       clearInterval(window.refreshHeartbeat);
     }
     
     window.refreshHeartbeat = setInterval(() => {
       const pageType = getPageType();
       if (pageType === "area" && !areaRefreshInterval) {
         console.log('💗 Heartbeat: Re-starting stopped area refresh');
         setupAreaAutoRefresh();
       }
     }, 5000);
     
     console.log('💗 Started refresh heartbeat monitor');
   };

   // 自動啟動心跳檢查
   if (getPageType() === "area") {
     setTimeout(() => {
       window.startRefreshHeartbeat();
     }, 2000);
   }

   console.log('✅ Area refresh control functions are now available');
   console.log('📝 New functions: enableDirectRefresh(), clearSeatAttempts()');
})();
