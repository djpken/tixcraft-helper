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

  // 攔截 DOM 元素創建，在瀏覽器分析前就移除不需要的元素
  function interceptDOMCreation() {
    // 保存原始的 appendChild 和 insertBefore 方法
    const originalAppendChild = Node.prototype.appendChild;
    const originalInsertBefore = Node.prototype.insertBefore;
    
    // 檢查元素是否應該被阻擋
    function shouldBlockElement(element) {
      if (!element || !element.tagName) return false;
      
      const tagName = element.tagName.toLowerCase();
      const className = element.className || '';
      const id = element.id || '';
      const src = element.src || '';
      
      // 阻擋 header 和 footer
      if (tagName === 'header' || tagName === 'footer') {
        return true;
      }
      
      // 阻擋特定 ID
      if (id === 'ad-footer' || id === 'event-banner') {
        return true;
      }
      
      // 阻擋包含 event-banner 的 class
      if (className.includes('event-banner')) {
        return true;
      }
      
      // 阻擋不必要的追蹤和廣告腳本
      if (tagName === 'script' && src) {
        // Google Analytics 和 GTM 
        if (src.includes('googletagmanager.com') || 
            src.includes('google-analytics.com') || 
            src.includes('gtag/js') ||
            src.includes('doubleclick.net') ||
            src.includes('eps-mgr')) {
          return true;
        }
      }
      
      // 阻擋不必要的 CSS 檔案
      if (tagName === 'link' && element.rel === 'stylesheet') {
        const href = element.href || '';
        // 阻擋 Font Awesome（如果不需要圖示）
        if (href.includes('font-awesome')) {
          return true;
        }
        // 阻擋 OwlCarousel（如果不是在輪播頁面）
        if (href.includes('owl.carousel') && !window.location.href.includes('/activity/detail/')) {
          return true;
        }
        // 阻擋 Fancybox（如果不需要彈窗功能）
        if (href.includes('fancybox') && !window.location.href.includes('/ticket/')) {
          return true;
        }
      }
      
      return false;
    }
    
    // 攔截 appendChild
    Node.prototype.appendChild = function(child) {
      if (shouldBlockElement(child)) {
        // 創建一個空的文檔片段來"吞掉"這個元素
        return document.createDocumentFragment();
      }
      return originalAppendChild.call(this, child);
    };
    
    // 攔截 insertBefore
    Node.prototype.insertBefore = function(newNode, referenceNode) {
      if (shouldBlockElement(newNode)) {
        return document.createDocumentFragment();
      }
      return originalInsertBefore.call(this, newNode, referenceNode);
    };
  }
  
  // 立即執行攔截（在任何 DOM 內容載入前）
  interceptDOMCreation();

  // =============================================================================
  // CONSTANTS & CONFIGURATION
  // =============================================================================

  const SELECTORS = {
    VERIFY_INPUT: '#TicketForm_verifyCode',
    VERIFY_INPUT_FALLBACK: 'input[name="checkCode"]',
    SUBMIT_BUTTONS: [
      'button[type="submit"]',
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
    CAPTCHA_IMAGE: '#TicketForm_verifyCode-image',
    FANCYBOX_OVERLAY: '.fancybox-overlay',
    FANCYBOX_WRAP: '.fancybox-wrap',
    FANCYBOX_OUTER: '.fancybox-outer',
    FANCYBOX_INNER: '.fancybox-inner',
    FANCYBOX_CONTENT: '.fancybox-content',
    FANCYBOX_BUTTONS: '.fancybox-button, .fancybox-close, .fancybox-item',
    CONFIRM_BUTTONS: [
      'button[class*="confirm"]',
      'button[class*="ok"]', 
      'input[type="submit"]',
      'button[type="submit"]',
      '.btn-primary',
      '.btn-success', 
      '.confirm-btn',
      '.btn-confirm'
    ],
    CONFIRM_KEYWORDS: ['確認', 'confirm', '確定', '刪除', '提交', '購買', 'OK', '是', 'Yes']
  };

  window.TIXCRAFT_PERFORMANCE = {
    enabled: true,
    refreshRate: 10000,
    areaRefreshRate: 1200, // area頁面每秒檢查
    seatMonitorRate: 100,
    formMonitorRate: 200,
    captchaMonitorRate: 500
  };

  // =============================================================================
  // GLOBAL VARIABLES & STATE
  // =============================================================================

  // Preloading and caching system
  let PRELOADED_DATA = {
    seats: [],
    seatMap: new Map(),
    lastSeatScan: 0,
    captchaCache: new Map(),
    formElements: new Map()
  };

  // Pre-cache DOM elements
  let CACHED_ELEMENTS = {
    verifyInput: null,
    submitButton: null,
    agreeCheckbox: null,
    ticketSelect: null,
    captchaImage: null,
    gameList: null
  };

  // Monitoring system
  let MONITORING_SYSTEM = {
    seatMonitor: null,
    formMonitor: null,
    captchaMonitor: null,
    isActive: false
  };

  // Auto-fill verification code functionality
  let SUBMIT_STATE = {
    verifySubmitted: false,
    ticketSubmitted: false,
    lastSubmitTime: 0,
    lastVerifyValue: "",
    submitCount: 0,
    pageLoadTime: Date.now()
  };

  // Global state variables
  let assistantPanel = null;
  let currentCaptchaUrl = null;
  let storedCaptchaUrl = null;
  let refreshInterval = null;
  let areaRefreshInterval = null;


  // =============================================================================
  // MAIN ENTRY POINT
  // =============================================================================

  // Global error handler
  window.addEventListener('error', function(e) {
    if (e.filename && (e.filename.includes('gtm') || e.filename.includes('analytics'))) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    if (e.message && (e.message.includes('gtm') || e.message.includes('Uncaught [object Object]'))) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    if (e.message && e.message.includes('[object Object]')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  window.addEventListener('unhandledrejection', function(e) {
    if (e.reason && (e.reason.toString().includes('gtm') || e.reason.toString().includes('analytics'))) {
      e.preventDefault();
      return false;
    }
  });

  async function executeScript() {
    try {
      SUBMIT_STATE.pageLoadTime = Date.now();
      
      const currentUrl = window.location.href;
      const pageType = getPageType(currentUrl);

      removeUnnecessaryElements(pageType);

      if (pageType === "detail") {
        redirectIfDetailPath();
        return;
      }

      if (pageType === "area") {
        handleAreaPage();
      } else if (pageType === "game") {
        handleGamePage();
      } else if (pageType === "ticket") {
        handleTicketPage();
      }

      if (pageType === "ticket" || pageType === "verify") {
        executeInParallel(
          () => focusOnVerifyCodeInput(),
          () => autoFillVerificationCodes()
        );
      }

      assistantPanel = createBookingControlPanels();
      
      if (pageType === "ticket" || pageType === "area" || pageType === "verify") {
        loadAndDisplayCaptcha();
      }
    } catch (error) {
      // Handle error silently
    }
  }


  // =============================================================================
  // LOGIC FUNCTIONS - Core Business Logic
  // =============================================================================

  // Check if this is a target page
  function isTargetPage() {
    const currentUrl = window.location.href;
    return /^https:\/\/tixcraft\.com\/.*/.test(currentUrl);
  }

  // Check page type
  function getPageType(url = window.location.href) {
    const currentUrl = url;
    if (/^https:\/\/tixcraft\.com\/ticket\/ticket\/.*/.test(currentUrl)) {
      return "ticket";
    } else if (/^https:\/\/tixcraft\.com\/ticket\/area\/.*/.test(currentUrl)) {
      return "area";
    } else if (/^https:\/\/tixcraft\.com\/ticket\/verify\/.*/.test(currentUrl)) {
      return "verify";
    } else if (/^https:\/\/tixcraft\.com\/activity\/game\/.*/.test(currentUrl) || currentUrl === "https://tixcraft.com/activity/game") {
      return "game";
    } else if (/^https:\/\/tixcraft\.com\/activity\/detail\/.*/.test(currentUrl)) {
      return "detail";
    } else if (/^https:\/\/tixcraft\.com\/ticket\/order/.test(currentUrl)) {
      return "order";
    }
    return "unknown";
  }

  function autoSelectFirstAvailableSeat() {
    try {
      preloadSeats();
      
      const availableSeats = document.querySelectorAll(SELECTORS.SEAT_ELEMENTS_AVAILABLE);
      
      if (availableSeats.length > 0) {
        const firstSeat = availableSeats[0];
        sessionStorage.setItem('last_seat_attempt', Date.now().toString());
        firstSeat.click();
        return true;
      } else {
        const allSeats = document.querySelectorAll(SELECTORS.SEAT_ELEMENTS);
        for (let seat of allSeats) {
          const style = window.getComputedStyle(seat);
          if (style.opacity === '1' || seat.style.opacity === '1') {
            sessionStorage.setItem('last_seat_attempt', Date.now().toString());
            seat.click();
            return true;
          }
        }
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  function handleAreaPage() {
    setupAreaAutoRefresh();
    startContinuousMonitoring();
    preloadSeats();
    
    setTimeout(() => {
      const captchaInput = document.querySelector("#persistent-captura-input");
      if (captchaInput) {
        captchaInput.focus();
        // 確保驗證碼圖片已更新
        updatePersistentCaptchaImage();
      } else {
        createPersistentCaptchaViewerPanel();
        setTimeout(() => {
          const newCaptchaInput = document.querySelector("#persistent-captura-input");
          if (newCaptchaInput) {
            newCaptchaInput.focus();
          }
          // 創建面板後立即更新驗證碼圖片
          updatePersistentCaptchaImage();
        }, 100);
      }
    }, 300);
    
    const seatAutoSelectEnabled = localStorage.getItem("tixcraft_seat_auto_select") !== "false";
    
    if (!seatAutoSelectEnabled) {
      return;
    }
    
    const savedSeat = localStorage.getItem("tixcraft_seat_value");
    
    if (!savedSeat || savedSeat.trim() === '') {
      setTimeout(() => {
        autoSelectFirstAvailableSeat();
      }, 500);
    } else {
      const seatValue = savedSeat.trim().toUpperCase();
      sessionStorage.setItem('last_seat_attempt', Date.now().toString());
      
      executeInParallel(
        () => window.testSeatSearch(seatValue),
        () => {
          sessionStorage.setItem('last_seat_attempt', Date.now().toString());
          if (PRELOADED_DATA.seatMap.has(seatValue)) {
            const seatData = PRELOADED_DATA.seatMap.get(seatValue);
            if (seatData.available) {
              seatData.element.click();
              return true;
            }
          }
          return false;
        }
      );
      
      window.testSeatSearch(seatValue);
      setTimeout(() => window.testSeatSearch(seatValue), 10);
      setTimeout(() => window.testSeatSearch(seatValue), 25);
      setTimeout(() => window.testSeatSearch(seatValue), 50);
      setTimeout(() => window.testSeatSearch(seatValue), 100);
    }

    const areaObserver = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          const newSeats = document.querySelectorAll(SELECTORS.SEAT_ELEMENTS);
          if (newSeats.length > 0) {
            const seatAutoSelectEnabled = localStorage.getItem("tixcraft_seat_auto_select") !== "false";
            if (!seatAutoSelectEnabled) {
              areaObserver.disconnect();
              break;
            }
            
            const savedSeat = localStorage.getItem("tixcraft_seat_value");
            if (savedSeat && savedSeat.trim()) {
              window.testSeatSearch(savedSeat.trim().toUpperCase());
              areaObserver.disconnect();
              break;
            } else {
              autoSelectFirstAvailableSeat();
              areaObserver.disconnect();
              break;
            }
          }
        }
      }
    });

    areaObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      areaObserver.disconnect();
      if (!areaRefreshInterval) {
        setupAreaAutoRefresh();
      }
    }, 3000);
  }

  function handleGamePage() {
    setupAutoRefresh();
    assistantPanel = createBookingControlPanels();
    
    // Monitor for ticket buttons and auto-navigate
    monitorForTicketButtons();
    
    // Also monitor for any dynamically loaded buttons
    setTimeout(() => {
      monitorForTicketButtons();
    }, 1000);
  }

  function handleTicketPage() {
    executeInParallel(
      () => {
        const selectElement = ultraFastFindTicketSelect();
        if (selectElement) {
          const userOptionValue = localStorage.getItem("tixcraft_option_value") || "2";
          const userOption = selectElement.querySelector(`option[value="${userOptionValue}"]`);
          
          if (userOption) {
            selectElement.value = userOptionValue;
            selectElement.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            const options = Array.from(selectElement.options).filter((opt) => opt.value !== "0");
            if (options.length > 0) {
              const maxOption = options[options.length - 1];
              selectElement.value = maxOption.value;
              selectElement.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }
        }
        return true;
      },
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
      () => {
        getAndStoreCaptcha();
        return true;
      },
      () => {
        focusOnVerifyCodeInput();
        return true;
      }
    );

    setTimeout(() => {
      const checkboxElement = document.querySelector(SELECTORS.AGREE_CHECKBOX);
      if (checkboxElement && !checkboxElement.checked) {
        checkboxElement.checked = true;
        checkboxElement.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, 10);

    stopAutoRefresh();
    stopAreaAutoRefresh();
  }

  function preloadSeats() {
    const now = Date.now();
    if (now - PRELOADED_DATA.lastSeatScan < 100) {
      return PRELOADED_DATA.seats;
    }

    const seatElements = document.querySelectorAll(SELECTORS.SEAT_ELEMENTS);
    PRELOADED_DATA.seats = Array.from(seatElements);
    PRELOADED_DATA.seatMap.clear();
    
    seatElements.forEach(element => {
      const textContent = element.textContent || element.innerText;
      const isAvailable = element.style.opacity === '1' || 
                         element.style.opacity === '' || 
                         !element.style.opacity ||
                         element.getAttribute('style')?.includes('opacity: 1');
      
      PRELOADED_DATA.seatMap.set(textContent.trim().toUpperCase(), {
        element,
        available: isAvailable
      });
    });
    
    PRELOADED_DATA.lastSeatScan = now;
    return PRELOADED_DATA.seats;
  }

  window.listAllSeats = function() {
    const seats = preloadSeats();
    seats.forEach((element, index) => {
      const textContent = element.textContent || element.innerText;
      const style = window.getComputedStyle(element);
    });
    return seats;
  };

  window.testSeatSearch = function(seatValue) {
    try {
      sessionStorage.setItem('last_seat_attempt', Date.now().toString());
      preloadSeats();
      const upperSeatValue = seatValue.toUpperCase();
      
      if (PRELOADED_DATA.seatMap.has(upperSeatValue)) {
        const seatData = PRELOADED_DATA.seatMap.get(upperSeatValue);
        if (seatData.available) {
          seatData.element.click();
          return true;
        }
        return false;
      }

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

  function getElement(key, forceRefresh = false) {
    if (!forceRefresh && CACHED_ELEMENTS[key]) {
      const cached = CACHED_ELEMENTS[key];
      if (cached && cached.isConnected) {
        return cached;
      } else {
        CACHED_ELEMENTS[key] = null;
      }
    }

    let element = null;
    switch(key) {
      case 'verifyInput':
        element = document.getElementById('TicketForm_verifyCode') || 
                 document.querySelector('input[name="checkCode"]');
        break;
      case 'submitButton':
        for (let selector of SELECTORS.SUBMIT_BUTTONS) {
          element = document.querySelector(selector);
          if (element) {
            const index = SELECTORS.SUBMIT_BUTTONS.indexOf(selector);
            if (index > 0) {
              SELECTORS.SUBMIT_BUTTONS.splice(index, 1);
              SELECTORS.SUBMIT_BUTTONS.unshift(selector);
            }
            break;
          }
        }
        break;
      case 'agreeCheckbox':
        element = document.getElementById('TicketForm_agree');
        break;
      case 'ticketSelect':
        element = document.getElementById('TicketForm_ticketPrice_01') ||
                 document.getElementById('TicketForm_ticketPrice_02') ||
                 document.querySelector('select[name*="TicketForm[ticketPrice]"]');
        break;
      case 'captchaImage':
        element = document.getElementById('TicketForm_verifyCode-image');
        break;
      case 'gameList':
        element = document.getElementById('gameList');
        break;
    }

    if (element) {
      CACHED_ELEMENTS[key] = element;
    }
    return element;
  }

  function ultraFastSubmit() {
    let submitBtn = CACHED_ELEMENTS.submitButton;
    
    if (!submitBtn) {
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

  function ultraFastFindTicketSelect() {
    let element = CACHED_ELEMENTS.ticketSelect;
    if (element) return element;

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

  function startContinuousMonitoring() {
    if (MONITORING_SYSTEM.isActive) return;
    MONITORING_SYSTEM.isActive = true;

    MONITORING_SYSTEM.seatMonitor = setInterval(() => {
      const seatAutoSelectEnabled = localStorage.getItem("tixcraft_seat_auto_select") !== "false";
      if (!seatAutoSelectEnabled) {
        return;
      }
      
      preloadSeats();
      
      const savedSeat = localStorage.getItem("tixcraft_seat_value");
      if (savedSeat && savedSeat.trim()) {
        const upperSeat = savedSeat.trim().toUpperCase();
        if (PRELOADED_DATA.seatMap.has(upperSeat)) {
          const seatData = PRELOADED_DATA.seatMap.get(upperSeat);
          if (seatData.available) {
            seatData.element.click();
          }
        }
      } else {
        autoSelectFirstAvailableSeat();
      }
    }, window.TIXCRAFT_PERFORMANCE.seatMonitorRate);

    MONITORING_SYSTEM.formMonitor = setInterval(() => {
      const currentUrl = window.location.href;
      const isVerifyPage = currentUrl.includes('/ticket/verify/');
      
      if (Math.random() < 0.3) {
        getElement('verifyInput', true);
        getElement('submitButton', true); 
        getElement('agreeCheckbox', true);
        getElement('ticketSelect', true);
      }
      
      if (isVerifyPage) {
        const lastFillTime = parseInt(sessionStorage.getItem('last_verify_fill_time') || '0');
        const now = Date.now();
        if (now - lastFillTime > 800) {
          autoFillVerificationCodes();
          sessionStorage.setItem('last_verify_fill_time', now.toString());
        }
      } else {
        autoFillVerificationCodes();
      }
    }, window.TIXCRAFT_PERFORMANCE.formMonitorRate);

    MONITORING_SYSTEM.captchaMonitor = setInterval(() => {
      getAndStoreCaptcha();
    }, window.TIXCRAFT_PERFORMANCE.captchaMonitorRate);
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

  function setupAreaAutoRefresh() {
    if (areaRefreshInterval) {
      clearInterval(areaRefreshInterval);
    }
    
    console.log('🔄 Area auto-refresh started - direct refresh every', window.TIXCRAFT_PERFORMANCE.areaRefreshRate, 'ms');
    
    areaRefreshInterval = setInterval(() => {
      console.log('🔄 Area page refreshing now');
      window.location.reload();
    }, window.TIXCRAFT_PERFORMANCE.areaRefreshRate);
  }
  
  function stopAreaAutoRefresh() {
    if (areaRefreshInterval) {
      clearInterval(areaRefreshInterval);
      areaRefreshInterval = null;
    }
  }

  // Navigation and button handling
  function findAndNavigateToTicket() {
    const selectedShowtimeIndex = parseInt(localStorage.getItem("tixcraft_showtime_index") || "0");

    const gameListContainer = document.getElementById("gameList");
    if (gameListContainer) {
      const gameListButtons = gameListContainer.querySelectorAll(SELECTORS.TICKET_BUTTONS);
      
      if (gameListButtons.length > 0) {
        const selectedButton = gameListButtons[Math.min(selectedShowtimeIndex, gameListButtons.length - 1)];
        const targetUrl = selectedButton.getAttribute("data-href");

        console.log(`Selected showtime ${Math.min(selectedShowtimeIndex + 1, gameListButtons.length)} from gameList container, navigating to:`, targetUrl);
        window.location.href = targetUrl;
        return true;
      }
    }

    const fallbackButtons = document.querySelectorAll(SELECTORS.TICKET_BUTTONS);
    if (fallbackButtons.length > 0) {
      const selectedButton = fallbackButtons[Math.min(selectedShowtimeIndex, fallbackButtons.length - 1)];
      const targetUrl = selectedButton.getAttribute("data-href");

      console.log(`Selected showtime ${Math.min(selectedShowtimeIndex + 1, fallbackButtons.length)} via fallback method, navigating to:`, targetUrl);
      window.location.href = targetUrl;
      return true;
    }

    return false;
  }

  function monitorForTicketButtons() {
    if (findAndNavigateToTicket()) {
      return;
    }

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

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
    }, 2000);
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

  function setupAutoRefresh() {
    const currentUrl = window.location.href;
    if (
      /^https:\/\/tixcraft\.com\/activity\/game\/.*/.test(currentUrl) ||
      currentUrl === "https://tixcraft.com/activity/game"
    ) {
      // 實現每分鐘的第0、10、20、30、40、50秒刷新
      const targetSeconds = [0, 10, 20, 30, 40, 50];
      
      function scheduleNextRefresh() {
        const now = new Date();
        const currentSecond = now.getSeconds();
        
        // 找到下一個目標秒數
        let nextTargetSecond = targetSeconds.find(sec => sec > currentSecond);
        if (!nextTargetSecond) {
          // 如果當前秒數已超過所有目標秒數，則等待下一分鐘的第0秒
          nextTargetSecond = targetSeconds[0] + 60;
        }
        
        // 計算等待時間（毫秒）
        const waitTime = (nextTargetSecond - currentSecond) * 1000;
        
        refreshInterval = setTimeout(() => {
          window.location.reload();
        }, waitTime);
      }
      
      // 開始調度
      scheduleNextRefresh();
    }
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearTimeout(refreshInterval);
      refreshInterval = null;
    }
  }

  function removeUnnecessaryElements(pageType) {
    try {
      const shouldRemoveHeaders = pageType !== "unknown";
      
      const headers = document.querySelectorAll('header');
      const footers = document.querySelectorAll('footer');
      const adFooters = document.querySelectorAll('#ad-footer');
      const eventBanners = document.querySelectorAll('.event-banner, #event-banner, [class*="event-banner"]');
      let removedCount = 0;

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
    } catch (error) {
      // Handle error silently
    }
  }

  // Auto-refresh captcha for game page
  

  function addConfirmedInputToVerifyForm() {
    if (window.confirmedInputAdded) {
      return;
    }
    
    const formSelector = '#form-ticket-verify';
    const form = document.querySelector(formSelector);
    
    if (form) {
      const existingInput = form.querySelector('input[name="confirmed"]');
      if (!existingInput) {
        const confirmedInput = document.createElement('input');
        confirmedInput.type = 'hidden';
        confirmedInput.name = 'confirmed';
        confirmedInput.value = 'true';
        
        form.appendChild(confirmedInput);
        
        window.confirmedInputAdded = true;
      } else {
        window.confirmedInputAdded = true;
      }
    } else {
      setTimeout(() => {
        addConfirmedInputToVerifyForm();
      }, 500);
    }
  }

  function autoFillVerificationCodes() {
    const currentUrl = window.location.href;
    
    if (/^https:\/\/tixcraft\.com\/ticket\/verify\/.*/.test(currentUrl)) {
      addConfirmedInputToVerifyForm();
      
      const verifyInput = document.querySelector('input[name="checkCode"]');
      const savedVerify = localStorage.getItem("tixcraft_verify_value");
      
      if (verifyInput && savedVerify) {
        const now = Date.now();
        
        const pageLoadKey = `tixcraft_submit_${currentUrl}_${SUBMIT_STATE.pageLoadTime}`;
        const alreadySubmittedThisPage = sessionStorage.getItem(pageLoadKey);
        
        const valueChanged = verifyInput.value !== savedVerify;
        const timeSinceLastSubmit = now - SUBMIT_STATE.lastSubmitTime;
        const notRecentlySubmitted = timeSinceLastSubmit > 3000;
        const valueNotRecentlyUsed = SUBMIT_STATE.lastVerifyValue !== savedVerify;
        const notSubmittedThisPage = !alreadySubmittedThisPage;
        
        if (valueChanged && notRecentlySubmitted && valueNotRecentlyUsed && notSubmittedThisPage) {
          verifyInput.value = savedVerify;
          verifyInput.dispatchEvent(new Event("input", { bubbles: true }));
          
          sessionStorage.setItem(pageLoadKey, 'true');
          
          const form = verifyInput.closest('form');
          let submitBtn = null;
          
          if (form) {
            submitBtn = form.querySelector('button[type="submit"]');
          }
          
          if (!submitBtn) {
            submitBtn = document.querySelector('button[type="submit"]');
          }
          
          if (submitBtn) {
            SUBMIT_STATE.lastSubmitTime = now;
            SUBMIT_STATE.lastVerifyValue = savedVerify;
            SUBMIT_STATE.submitCount++;
            
            setTimeout(() => {
              if (!sessionStorage.getItem(pageLoadKey + '_submitted')) {
                sessionStorage.setItem(pageLoadKey + '_submitted', 'true');
                submitBtn.click();
              }
            }, 100);
          }
        } else {
          if (valueChanged && verifyInput.value !== savedVerify) {
            verifyInput.value = savedVerify;
            verifyInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      }
    }

    if (/^https:\/\/tixcraft\.com\/ticket\/ticket\/.*/.test(currentUrl)) {
      const captchaInput = document.querySelector("#TicketForm_verifyCode");
      const savedCaptura = localStorage.getItem("tixcraft_captura_value");
      if (captchaInput && savedCaptura) {
        captchaInput.value = savedCaptura;
        captchaInput.dispatchEvent(new Event("input", { bubbles: true }));
        
        localStorage.removeItem("tixcraft_captura_value");
        
        if (assistantPanel) {
          const captchaViewerPanel = document.getElementById("tixcraft-captcha-viewer-panel");
          const capturaInput = captchaViewerPanel ? captchaViewerPanel.querySelector('input[placeholder="Enter captura code"]') : null;
          if (capturaInput) {
            capturaInput.value = "";
          }
        }
        
        fastSubmit();
      }
    }
  }

  // Focus on verification code input
  function focusOnVerifyCodeInput() {
    try {
      const currentUrl = window.location.href;
      let inputElement = null;

      if (/^https:\/\/tixcraft\.com\/ticket\/verify\/.*/.test(currentUrl)) {
        inputElement = document.querySelector('input[name="checkCode"]');
      } else {
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

  // Get and store captcha
  function getAndStoreCaptcha() {
    const existingImg = document.querySelector("#TicketForm_verifyCode-image");
    if (existingImg && existingImg.src) {
      let fullUrl = existingImg.src.startsWith("/")
        ? `https://tixcraft.com${existingImg.src}`
        : existingImg.src;

      // 處理captcha URL，確保有最新的timestamp
      if (fullUrl.includes('/ticket/captcha')) {
        const currentTimestamp = Date.now();
        
        if (fullUrl.includes('timestamp=')) {
          fullUrl = fullUrl.replace(/timestamp=\d+/, `timestamp=${currentTimestamp}`);
        } else {
          const separator = fullUrl.includes('?') ? '&' : '?';
          fullUrl = `${fullUrl}${separator}timestamp=${currentTimestamp}`;
        }
      }

      storedCaptchaUrl = fullUrl;
      currentCaptchaUrl = fullUrl;

      try {
        localStorage.setItem("tixcraft_captcha_url", fullUrl);
        localStorage.setItem("tixcraft_captcha_timestamp", Date.now().toString());
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

  function updateCaptchaDisplay(imageUrl, title = "Captcha") {
    if (!assistantPanel) {
      assistantPanel = createBookingControlPanels();
    }

    const captchaViewerPanel = document.getElementById("tixcraft-captcha-viewer-panel");
    if (!captchaViewerPanel) {
      createBookingControlPanels();
    }

    const contentDiv = document.getElementById("tixcraft-captcha-viewer-panel").querySelector(".captcha-content");
    const existingImg = contentDiv.querySelector("img");

    if (!existingImg) {
      const captchaTitle = document.createElement("div");
      captchaTitle.textContent = title;
      captchaTitle.style.cssText = `
                font-size: 14px;
                color: #495057;
                margin-bottom: 8px;
                font-weight: bold;
                text-align: center;
            `;

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

      const currentUrl = window.location.href;
      const isTicketPage = /^https:\/\/tixcraft\.com\/ticket\/ticket\/.*/.test(currentUrl);

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
      existingImg.src = imageUrl;
    }
  }

  async function loadAndDisplayCaptcha() {
    const currentUrl = window.location.href;
    const isTicketPage = /^https:\/\/tixcraft\.com\/ticket\/ticket\/.*/.test(currentUrl);
    const isAreaPage = /^https:\/\/tixcraft\.com\/ticket\/area\/.*/.test(currentUrl);

    if (isTicketPage) {
      const existingCaptchaUrl = getAndStoreCaptcha();
      if (existingCaptchaUrl) {
        updateCaptchaDisplay(existingCaptchaUrl, "Existing page captcha");
        // 同時更新持久化面板
        updatePersistentCaptchaImage();
      }
    } else if (isAreaPage) {
      // 確保持久化面板存在
      if (!document.getElementById("tixcraft-captcha-viewer-panel")) {
        createPersistentCaptchaViewerPanel();
      }
      
      const storedCaptcha = getStoredCaptcha();
      if (storedCaptcha) {
        updateCaptchaDisplay(storedCaptcha, "Stored captcha");
        // 更新持久化面板圖片
        updatePersistentCaptchaImage();
      } else {
        const existingCaptchaUrl = getAndStoreCaptcha();
        if (existingCaptchaUrl) {
          updateCaptchaDisplay(existingCaptchaUrl, "Existing page captcha");
          // 更新持久化面板圖片
          updatePersistentCaptchaImage();
        } else {
          // 即使沒有找到驗證碼，也要更新持久化面板（可能會隱藏圖片）
          updatePersistentCaptchaImage();
        }
      }
    }
  }


  // =============================================================================
  // UI COMPONENTS & CSS STYLING
  // =============================================================================

  function updatePersistentCaptchaImage() {
    const persistentImg = document.getElementById("persistent-captcha-image");
    if (!persistentImg) return;
    
    let imageUrl = null;
    
    // 首先嘗試從頁面中的驗證碼圖片獲取
    const pageImg = document.querySelector("#TicketForm_verifyCode-image");
    if (pageImg && pageImg.src) {
      imageUrl = pageImg.src.startsWith("/")
        ? `https://tixcraft.com${pageImg.src}`
        : pageImg.src;
    } else {
      // 如果頁面中沒有驗證碼圖片，嘗試從localStorage獲取
      const storedCaptcha = getStoredCaptcha();
      if (storedCaptcha) {
        imageUrl = storedCaptcha;
      } else {
        // 如果沒有儲存的驗證碼，嘗試構建一個標準的captcha URL
        const pageType = getPageType();
        if (pageType === "area") {
          console.log('🔍 No captcha found, constructing default captcha URL for area page');
          imageUrl = `https://tixcraft.com/ticket/captcha?timestamp=${Date.now()}`;
        }
      }
    }
    
    if (imageUrl) {
      // 處理特殊的captcha URL格式，添加timestamp參數
      if (imageUrl.includes('/ticket/captcha')) {
        const currentTimestamp = Date.now();
        
        // 如果URL已經有timestamp參數，替換它
        if (imageUrl.includes('timestamp=')) {
          imageUrl = imageUrl.replace(/timestamp=\d+/, `timestamp=${currentTimestamp}`);
        } else {
          // 如果沒有timestamp參數，添加它
          const separator = imageUrl.includes('?') ? '&' : '?';
          imageUrl = `${imageUrl}${separator}timestamp=${currentTimestamp}`;
        }
      } else {
        // 對於其他URL，添加時間戳避免快取
        const separator = imageUrl.includes('?') ? '&' : '?';
        imageUrl = `${imageUrl}${separator}t=${Date.now()}`;
      }
      
      console.log('🖼️ Updating captcha image:', imageUrl);
      persistentImg.src = imageUrl;
      persistentImg.style.display = "block";
    } else {
      // 如果沒有找到任何驗證碼圖片，隱藏圖片元素
      console.log('❌ No captcha image found, hiding image element');
      persistentImg.style.display = "none";
    }
  }

  function createPersistentCaptchaViewerPanel() {
    // 確保DOM已經載入
    if (!document.body) {
      // 如果body還不存在，等待DOM載入
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createPersistentCaptchaViewerPanel);
        return;
      } else {
        // 如果readyState不是loading但body仍然不存在，延遲執行
        setTimeout(createPersistentCaptchaViewerPanel, 100);
        return;
      }
    }

    let captchaViewerPanel = document.getElementById("tixcraft-captcha-viewer-panel");
    
    if (!captchaViewerPanel) {
      captchaViewerPanel = document.createElement("div");
      captchaViewerPanel.id = "tixcraft-captcha-viewer-panel";
      
      captchaViewerPanel.setAttribute("data-persistent", "true");
      captchaViewerPanel.setAttribute("data-tixcraft-panel", "captcha");

      captchaViewerPanel.style.cssText = `
                position: fixed !important;
                bottom: 20px;
                left: 20px;
                width: 200px;
                padding: 15px;
                background: #ffffff;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            `;

      const captchaContent = document.createElement("div");
      captchaContent.className = "captcha-content";
      captchaContent.style.cssText = `
                text-align: center;
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e9ecef;
            `;

      // 添加驗證碼圖片
      const captchaImg = document.createElement("img");
      captchaImg.id = "persistent-captcha-image";
      captchaImg.style.cssText = `
                max-width: 100%;
                height: auto;
                margin-bottom: 8px;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                cursor: pointer;
            `;
      
      // 點擊圖片刷新
      captchaImg.addEventListener("click", () => {
        updatePersistentCaptchaImage();
      });
      
      captchaContent.appendChild(captchaImg);
      
      // 初始載入圖片
      updatePersistentCaptchaImage();

      const capturaInput = document.createElement("input");
      capturaInput.type = "text";
      capturaInput.placeholder = "Enter captura code";
      capturaInput.id = "persistent-captura-input";
      capturaInput.style.cssText = `
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 12px;
                box-sizing: border-box;
            `;

      capturaInput.value = localStorage.getItem("tixcraft_captura_value") || "";
      
      capturaInput.addEventListener("input", () => {
        const value = capturaInput.value;
        localStorage.setItem("tixcraft_captura_value", value);
        
        // 只有當輸入超過4個字符時才同步到其他input
        if (value.length >= 4) {
          document.querySelectorAll('input[name*="captcha"], input[id*="captcha"], input[placeholder*="驗證"], input[name="checkCode"]').forEach(input => {
            if (input !== capturaInput) {
              input.value = value;
              // 觸發change事件
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
          
          if (typeof autoFillVerificationCodes === 'function') {
            autoFillVerificationCodes();
          }
        }
      });

      captchaViewerPanel.appendChild(captchaContent);
      captchaViewerPanel.appendChild(capturaInput);
      
      // 安全地添加到body
      if (document.body) {
        document.body.appendChild(captchaViewerPanel);
        protectPersistentPanel(captchaViewerPanel);
      }
    } else {
      captchaViewerPanel.style.display = "block";
      captchaViewerPanel.style.visibility = "visible";
      captchaViewerPanel.style.opacity = "1";
      
      const capturaInput = captchaViewerPanel.querySelector("#persistent-captura-input");
      if (capturaInput) {
        capturaInput.value = localStorage.getItem("tixcraft_captura_value") || "";
      }
      
      // 更新驗證碼圖片
      updatePersistentCaptchaImage();
    }
    
    return captchaViewerPanel;
  }

  function protectPersistentPanel(panel) {
    if (!panel) return;
    
    const originalRemove = panel.remove;
    panel.remove = function() {
      this.style.display = this.style.display === "none" ? "block" : this.style.display;
    };
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (node === panel || (node.contains && node.contains(panel))) {
              if (!document.body.contains(panel)) {
                document.body.appendChild(panel);
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    panel._protectionObserver = observer;
  }

  // Legacy function for compatibility
  function createCaptchaViewerPanel() {
    return createPersistentCaptchaViewerPanel();
  }

  // Create booking control panel
  function createBookingControlPanel() {
    let container = document.getElementById("tixcraft-booking-control-panel");

    if (!container) {
      container = document.createElement("div");
      container.id = "tixcraft-booking-control-panel";

      container.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                width: 180px;
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
      title.textContent = "Booking Control";
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
        const mainContent = container.querySelector(".main-content");
        if (isMinimized) {
          mainContent.style.display = "block";
          minimizeBtn.textContent = "−";
          isMinimized = false;
        } else {
          mainContent.style.display = "none";
          minimizeBtn.textContent = "+";
          isMinimized = true;
        }
      };

      titleBar.appendChild(title);
      titleBar.appendChild(minimizeBtn);
      container.appendChild(titleBar);

      // Create main content area for inputs (button, verify, seat)
      const mainContent = document.createElement("div");
      mainContent.className = "main-content";

      // Button selection section
      const buttonSection = document.createElement("div");
      buttonSection.style.cssText = `
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e9ecef;
            `;

      const showtimeLabel = document.createElement("label");
      showtimeLabel.textContent = "Showtime:";
      showtimeLabel.style.cssText = `
                display: block;
                font-size: 12px;
                color: #495057;
                margin-bottom: 4px;
                font-weight: 500;
            `;

      const showtimeSelect = document.createElement("select");
      showtimeSelect.style.cssText = `
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 12px;
                box-sizing: border-box;
                background: white;
            `;

      for (let i = 0; i < 5; i++) {
        const option = document.createElement("option");
        option.value = i.toString();
        option.textContent = `${i + 1}`;
        showtimeSelect.appendChild(option);
      }

      showtimeSelect.value = localStorage.getItem("tixcraft_showtime_index") || "0";
      showtimeSelect.addEventListener("change", () => {
        localStorage.setItem("tixcraft_showtime_index", showtimeSelect.value);
      });

      buttonSection.appendChild(showtimeLabel);
      buttonSection.appendChild(showtimeSelect);
      mainContent.appendChild(buttonSection);

      // Verify input section
      const verifySection = document.createElement("div");
      verifySection.style.cssText = `
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e9ecef;
            `;

      const verifyLabel = document.createElement("label");
      verifyLabel.textContent = "Verify code:";
      verifyLabel.style.cssText = `
                display: block;
                font-size: 12px;
                color: #495057;
                margin-bottom: 4px;
                font-weight: 500;
            `;

      const verifyInput = document.createElement("input");
      verifyInput.type = "text";
      verifyInput.placeholder = "Enter code";
      verifyInput.style.cssText = `
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 12px;
                box-sizing: border-box;
            `;

      verifyInput.value = localStorage.getItem("tixcraft_verify_value") || "";
      verifyInput.addEventListener("input", () => {
        localStorage.setItem("tixcraft_verify_value", verifyInput.value);
        autoFillVerificationCodes();
      });

      verifySection.appendChild(verifyLabel);
      verifySection.appendChild(verifyInput);
      mainContent.appendChild(verifySection);

      // Seat input section
      const seatSection = document.createElement("div");
      seatSection.style.cssText = `
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e9ecef;
            `;

      // Seat checkbox and label container
      const seatHeaderContainer = document.createElement("div");
      seatHeaderContainer.style.cssText = `
                display: flex;
                align-items: center;
                margin-bottom: 4px;
            `;

      const seatCheckbox = document.createElement("input");
      seatCheckbox.type = "checkbox";
      seatCheckbox.id = "seat-auto-select-checkbox";
      seatCheckbox.style.cssText = `
                margin-right: 6px;
                cursor: pointer;
            `;

      const seatLabel = document.createElement("label");
      seatLabel.textContent = "Auto Seat:";
      seatLabel.htmlFor = "seat-auto-select-checkbox";
      seatLabel.style.cssText = `
                font-size: 12px;
                color: #495057;
                font-weight: 500;
                cursor: pointer;
            `;

      // Load checkbox state from localStorage
      const seatAutoSelectEnabled = localStorage.getItem("tixcraft_seat_auto_select") !== "false";
      seatCheckbox.checked = seatAutoSelectEnabled;

      seatCheckbox.addEventListener("change", () => {
        localStorage.setItem("tixcraft_seat_auto_select", seatCheckbox.checked.toString());
        
        if (!seatCheckbox.checked) {
          // seat monitoring disabled
        }
      });

      seatHeaderContainer.appendChild(seatCheckbox);
      seatHeaderContainer.appendChild(seatLabel);

      const seatInput = document.createElement("input");
      seatInput.type = "text";
      seatInput.placeholder = "e.g. C1 (empty = auto select)";
      seatInput.style.cssText = `
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 12px;
                box-sizing: border-box;
            `;

      seatInput.value = localStorage.getItem("tixcraft_seat_value") || "";
      seatInput.addEventListener("input", () => {
        const seatValue = seatInput.value.trim().toUpperCase();
        localStorage.setItem("tixcraft_seat_value", seatValue);
        
        if (seatCheckbox.checked && seatValue) {
          window.testSeatSearch(seatValue);
        }
      });

      seatSection.appendChild(seatHeaderContainer);
      seatSection.appendChild(seatInput);
      mainContent.appendChild(seatSection);

      // Ticket account selection section (for select element value configuration)
      const ticketAccountSection = document.createElement("div");
      ticketAccountSection.style.cssText = `
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #e9ecef;
            `;

      const ticketAccountLabel = document.createElement("label");
      ticketAccountLabel.textContent = "Ticket account:";
      ticketAccountLabel.style.cssText = `
                display: block;
                font-size: 12px;
                color: #495057;
                margin-bottom: 4px;
                font-weight: 500;
            `;

      const ticketAccountSelect = document.createElement("select");
      ticketAccountSelect.style.cssText = `
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 12px;
                box-sizing: border-box;
                background: white;
            `;

      // Add options 1, 2, 3, 4
      for (let i = 1; i <= 4; i++) {
        const option = document.createElement("option");
        option.value = i.toString();
        option.textContent = i.toString();
        ticketAccountSelect.appendChild(option);
      }

      ticketAccountSelect.value = localStorage.getItem("tixcraft_option_value") || "2";
      ticketAccountSelect.addEventListener("change", () => {
        const ticketAccountValue = ticketAccountSelect.value;
        localStorage.setItem("tixcraft_option_value", ticketAccountValue);
      });

      ticketAccountSection.appendChild(ticketAccountLabel);
      ticketAccountSection.appendChild(ticketAccountSelect);
      mainContent.appendChild(ticketAccountSection);

      container.appendChild(mainContent);
      document.body.appendChild(container);
    }
    return container;
  }

  // Combined function to create both panels with priority
  function createBookingControlPanels() {
    // Ensure persistent captcha viewer panel exists (may already exist from global init)
    createPersistentCaptchaViewerPanel();
    
    // Then create booking control panel
    const bookingPanel = createBookingControlPanel();
    
    return bookingPanel;
  }


  // =============================================================================
  // INITIALIZATION & EVENT HANDLERS
  // =============================================================================

  console.log('Tixcraft Assistant loaded');

  window.addEventListener("beforeunload", () => {
    stopAutoRefresh();
    stopAreaAutoRefresh();
    stopContinuousMonitoring();
  });

  // Initialize persistent captcha panel immediately (cross-page)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(createPersistentCaptchaViewerPanel, 100);
    });
  } else if (document.body) {
    // DOM已經載入且body存在
    setTimeout(createPersistentCaptchaViewerPanel, 100);
  } else {
    // DOM載入但body可能還不存在，等待一下
    setTimeout(() => {
      if (document.body) {
        createPersistentCaptchaViewerPanel();
      } else {
        setTimeout(createPersistentCaptchaViewerPanel, 200);
      }
    }, 100);
  }

   if (isTargetPage()) {
     executeScript();

     if (document.readyState === "loading") {
       document.addEventListener("DOMContentLoaded", executeScript);
     }

     window.testSeatSearch = window.testSeatSearch;
     
     // 啟動驗證碼圖片更新定時器（非area頁面每5秒更新一次）
     setInterval(() => {
       const pageType = getPageType();
       if (pageType !== "area" && document.getElementById("persistent-captcha-image")) {
         updatePersistentCaptchaImage();
       }
     }, 5000);
   }

   const elementObserver = new MutationObserver((mutations) => {
      let dynamicRemovedCount = 0;
      const currentPageType = getPageType();

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            try {
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
                 const headers = node.querySelectorAll('header');
                 const footers = node.querySelectorAll('footer');
                 const adFooters = node.querySelectorAll('#ad-footer');
                 const eventBanners = node.querySelectorAll('.event-banner, #event-banner, [class*="event-banner"]');

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
               // Handle error silently
             }
           }
         });
       });
     });

     elementObserver.observe(document.documentElement, {
       childList: true,
       subtree: true
     });

   window.checkRefreshStatus = function() {
     const pageType = getPageType();
     const now = Date.now();
     const lastSeatAttempt = parseInt(sessionStorage.getItem('last_seat_attempt') || '0');
     const currentActiveElement = document.activeElement;
     const hasUserInput = currentActiveElement && (
       currentActiveElement.tagName === 'INPUT' || 
       currentActiveElement.tagName === 'SELECT' ||
       currentActiveElement.tagName === 'TEXTAREA'
     );
     
     return {
       pageType,
       refreshRate: pageType === "area" ? window.TIXCRAFT_PERFORMANCE.areaRefreshRate : window.TIXCRAFT_PERFORMANCE.refreshRate,
       isActive: areaRefreshInterval !== null,
       intervalId: areaRefreshInterval,
       hasUserInput,
       activeElement: currentActiveElement?.tagName || 'none',
       lastSeatAttempt,
       timeSinceLastSeat: now - lastSeatAttempt,
       recentAttempt: now - lastSeatAttempt < 300
     };
   };
   
   window.forceStartAreaRefresh = function() {
     console.log('🔄 Force starting area refresh...');
     setupAreaAutoRefresh();
   };
   
   window.forceStopAreaRefresh = function() {
     console.log('⏹️ Force stopping area refresh...');
     stopAreaAutoRefresh();
   };

   // 新增：直接每秒刷新（無條件）- 現在與 setupAreaAutoRefresh 相同
   window.enableDirectRefresh = function() {
     console.log('🚀 Enabling direct refresh (same as setupAreaAutoRefresh now)');
     setupAreaAutoRefresh();
   };

   // 新增：檢查為什麼沒有刷新
   window.debugAreaRefresh = function() {
     const status = window.checkRefreshStatus();
     console.log('🔍 Area refresh debug info:', status);
     
     if (!status.isActive) {
       console.log('❌ Area refresh is NOT active');
       console.log('💡 Try: window.forceStartAreaRefresh()');
     } else {
       console.log('✅ Area refresh is active - should refresh every second with NO conditions');
       console.log('🔄 Direct refresh mode: Every', status.refreshRate, 'ms');
     }
     
     return status;
   };

   window.clearSeatAttempts = function() {
     sessionStorage.removeItem('last_seat_attempt');
   };

   // 新增：驗證碼相關調試功能
   window.refreshCaptcha = function() {
     console.log('🖼️ Manually refreshing captcha image...');
     updatePersistentCaptchaImage();
     getAndStoreCaptcha();
   };

   window.getCaptchaInfo = function() {
     const pageImg = document.querySelector("#TicketForm_verifyCode-image");
     const persistentImg = document.getElementById("persistent-captcha-image");
     
     return {
       pageImageSrc: pageImg?.src || 'Not found',
       persistentImageSrc: persistentImg?.src || 'Not found',
       storedUrl: storedCaptchaUrl,
       currentUrl: currentCaptchaUrl,
       timestamp: Date.now()
     };
   };

   window.startRefreshHeartbeat = function() {
     if (window.refreshHeartbeat) {
       clearInterval(window.refreshHeartbeat);
     }
     
     window.refreshHeartbeat = setInterval(() => {
       const pageType = getPageType();
       if (pageType === "area" && !areaRefreshInterval) {
         setupAreaAutoRefresh();
       }
     }, 5000);
   };

   window.checkUltraPreciseStatus = function() {
     return {
       isActive: false,
       stats: null,
       timers: {
         precision: false,
         driftCorrector: false,
         performanceMonitor: false
       }
     };
   };

   window.forceUltraPreciseRefresh = function() {
     window.location.reload();
   };

   window.restartUltraPrecise = function() {
     stopAutoRefresh();
     setTimeout(() => {
       setupAutoRefresh();
     }, 100);
   };

   window.getRefreshStats = function() {
     return { message: 'Stats not available in simplified version' };
   };

     window.enableMaxPerformanceMode = function() {
    stopAutoRefresh();
    
    setTimeout(() => {
      setupAutoRefresh();
    }, 100);
  };
  
  
  window.getGameCaptchaStatus = function() {
    const url = localStorage.getItem("tixcraft_game_captcha_url");
    const timestamp = localStorage.getItem("tixcraft_game_captcha_timestamp");
    
    if (url && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      const ageSeconds = Math.floor(age / 1000);
      
      return {
        url,
        timestamp: parseInt(timestamp),
        age: age,
        ageSeconds: ageSeconds,
        isFresh: age < 30000
      };
    } else {
      return null;
    }
  };

  if (getPageType() === "area") {
    setTimeout(() => {
      window.startRefreshHeartbeat();
    }, 2000);
  }

  console.log('✅ Tixcraft Assistant running');
})();
