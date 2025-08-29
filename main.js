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

  // =============================================================================
  // CONSTANTS & CONFIGURATION
  // =============================================================================

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
    CAPTCHA_IMAGE: '#TicketForm_verifyCode-image',
    // Fancybox related selectors
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

  // Maximum performance mode - optimized for speed
  window.TIXCRAFT_PERFORMANCE = {
    enabled: true,
    refreshRate: 10000,  // Area refresh minimum safe value (0.5 second)
    seatMonitorRate: 3,  // Seat check every 3ms (maximum speed)
    formMonitorRate: 8,  // Form check every 8ms (maximum speed)
    captchaMonitorRate: 15 // Captcha check every 15ms (maximum speed)
  };

  // =============================================================================
  // GLOBAL VARIABLES & STATE
  // =============================================================================

  // Preloading and caching system for maximum performance
  let PRELOADED_DATA = {
    seats: [],
    seatMap: new Map(),
    lastSeatScan: 0,
    captchaCache: new Map(),
    formElements: new Map()
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

  // Continuous aggressive monitoring system
  let MONITORING_SYSTEM = {
    seatMonitor: null,
    formMonitor: null,
    captchaMonitor: null,
    isActive: false
  };

  // Auto-fill verification code functionality with submit control
  let SUBMIT_STATE = {
    verifySubmitted: false,
    ticketSubmitted: false,
    lastSubmitTime: 0,
    lastVerifyValue: "",
    submitCount: 0,
    pageLoadTime: Date.now() // 添加頁面載入時間追蹤
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
        handleAreaPage();
      } else if (pageType === "game") {
        handleGamePage();
      } else if (pageType === "ticket") {
        handleTicketPage();
      }

      // Ultra-fast parallel focus and auto-fill operations  
      if (pageType === "ticket" || pageType === "verify") {
        executeInParallel(
          () => focusOnVerifyCodeInput(),
          () => autoFillVerificationCodes()
        );
      }

      // Create assistant panel immediately for faster UI response
      assistantPanel = createTixcraftAssistantPanel();
      
      // Immediate captcha handling - no delay for maximum speed
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
    } else if (/^https:\/\/tixcraft\.com\/ticket\/order\/.*/.test(currentUrl)) {
      return "order";
    }
    return "unknown";
  }

  // Page-specific handlers
  function handleAreaPage() {
    console.log('📍 Confirmed area page - setting up auto-refresh');
    setupAreaAutoRefresh();
    startContinuousMonitoring();
    preloadSeats();
    
    const savedSeat = localStorage.getItem("tixcraft_seat_value");
    if (savedSeat && savedSeat.trim()) {
      const seatValue = savedSeat.trim().toUpperCase();
      sessionStorage.setItem('last_seat_attempt', Date.now().toString());
      console.log(`🎯 Starting seat selection for: ${seatValue}`);
      
      executeInParallel(
        () => window.testSeatSearch(seatValue),
        () => {
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
            const savedSeat = localStorage.getItem("tixcraft_seat_value");
            if (savedSeat && savedSeat.trim()) {
              console.log(`Detected new seat loading, immediate retry: ${savedSeat}`);
              window.testSeatSearch(savedSeat.trim().toUpperCase());
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
        console.log('🔄 Re-enabling auto-refresh after seat monitoring');
        setupAreaAutoRefresh();
      }
    }, 3000);
  }

  function handleGamePage() {
    setupAutoRefresh();
    assistantPanel = createTixcraftAssistantPanel();
  }

  function handleTicketPage() {
    executeInParallel(
      () => {
        const selectElement = ultraFastFindTicketSelect();
        if (selectElement) {
          const option2 = selectElement.querySelector('option[value="2"]');
          if (option2) {
            selectElement.value = "2";
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

  // Ultra-fast seat preloading with smart caching
  function preloadSeats() {
    const now = Date.now();
    // Maximum speed cache invalidation
    if (now - PRELOADED_DATA.lastSeatScan < 20) {
      return PRELOADED_DATA.seats;
    }

    // Use more efficient querySelector strategy
    const seatElements = document.querySelectorAll(SELECTORS.SEAT_ELEMENTS);
    PRELOADED_DATA.seats = Array.from(seatElements);
    PRELOADED_DATA.seatMap.clear();
    
    // Batch DOM operations for better performance
    const fragment = document.createDocumentFragment();
    
    seatElements.forEach(element => {
      const textContent = element.textContent || element.innerText;
      // Use direct style access instead of getComputedStyle for speed
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
      sessionStorage.setItem('last_seat_attempt', Date.now().toString());
      preloadSeats();
      const upperSeatValue = seatValue.toUpperCase();
      
      if (PRELOADED_DATA.seatMap.has(upperSeatValue)) {
        const seatData = PRELOADED_DATA.seatMap.get(upperSeatValue);
        if (seatData.available) {
          console.log(`🎯 Found and clicking seat: ${upperSeatValue}`);
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

  // Ultra-fast element finder with aggressive caching and batch queries
  function getElement(key, forceRefresh = false) {
    if (!forceRefresh && CACHED_ELEMENTS[key]) {
      const cached = CACHED_ELEMENTS[key];
      // Quick check if element is still in DOM
      if (cached && cached.isConnected) {
        return cached;
      } else {
        CACHED_ELEMENTS[key] = null; // Clear invalid cache
      }
    }

    let element = null;
    switch(key) {
      case 'verifyInput':
        // Use optimized selector with ID first
        element = document.getElementById('TicketForm_verifyCode') || 
                 document.querySelector('input[name="checkCode"]');
        break;
      case 'submitButton':
        // Cache the first successful selector for future use
        for (let selector of SELECTORS.SUBMIT_BUTTONS) {
          element = document.querySelector(selector);
          if (element) {
            // Move successful selector to front for faster future queries
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
        // Use direct ID access first
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

  // Ultra-fast submit function with aggressive optimization
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

  // Ultra-fast ticket selection using cached elements
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

  // Monitoring and automation functions
  function startContinuousMonitoring() {
    if (MONITORING_SYSTEM.isActive) return;
    MONITORING_SYSTEM.isActive = true;

    MONITORING_SYSTEM.seatMonitor = setInterval(() => {
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
      }
    }, window.TIXCRAFT_PERFORMANCE.seatMonitorRate);

    MONITORING_SYSTEM.formMonitor = setInterval(() => {
      const currentUrl = window.location.href;
      const isVerifyPage = currentUrl.includes('/ticket/verify/');
      
      // Batch element updates less frequently for performance
      if (Math.random() < 0.3) { // Only refresh cache 30% of the time
        getElement('verifyInput', true);
        getElement('submitButton', true); 
        getElement('agreeCheckbox', true);
        getElement('ticketSelect', true);
      }
      
      if (isVerifyPage) {
        const lastFillTime = parseInt(sessionStorage.getItem('last_verify_fill_time') || '0');
        const now = Date.now();
        if (now - lastFillTime > 800) { // Maximum speed verification fill
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

  // Area page auto-refresh functionality with memory optimization
  function setupAreaAutoRefresh() {
    if (areaRefreshInterval) {
      clearInterval(areaRefreshInterval);
    }
    
    console.log(`🔄 Setting up area auto-refresh with ${window.TIXCRAFT_PERFORMANCE.refreshRate}ms interval`);
    
    // Cache DOM queries outside the interval for better performance
    let lastActiveElement = null;
    let consecutiveIdleCount = 0;
    
    areaRefreshInterval = setInterval(() => {
      const now = Date.now();
      
      // Minimize DOM queries by caching activeElement
      const currentActiveElement = document.activeElement;
      const hasUserInput = currentActiveElement && 
        currentActiveElement !== lastActiveElement && (
        currentActiveElement.tagName === 'INPUT' || 
        currentActiveElement.tagName === 'SELECT' ||
        currentActiveElement.tagName === 'TEXTAREA'
      );
      lastActiveElement = currentActiveElement;
      
      const lastSeatAttempt = parseInt(sessionStorage.getItem('last_seat_attempt') || '0');
      const recentAttempt = now - lastSeatAttempt < 300; // Maximum speed threshold
      
      if (!hasUserInput && !recentAttempt) {
        consecutiveIdleCount++;
        // Maximum speed: refresh after 1 idle check
        if (consecutiveIdleCount >= 1) {
          console.log('🔄 Area page auto-refresh - executing');
          window.location.reload();
        }
      } else {
        consecutiveIdleCount = 0; // Reset counter
        const reason = hasUserInput ? 'user input detected' : 'recent seat activity';
        console.log(`⏸️ Delaying refresh - ${reason}`);
      }
    }, window.TIXCRAFT_PERFORMANCE.refreshRate);
  }
  
  function stopAreaAutoRefresh() {
    if (areaRefreshInterval) {
      clearInterval(areaRefreshInterval);
      areaRefreshInterval = null;
      const currentPageType = getPageType();
      console.log(`⏹️ Stopped area page auto-refresh (current page: ${currentPageType})`);
    }
  }

  // Navigation and button handling
  function findAndNavigateToTicket() {
    const selectedButtonIndex = parseInt(localStorage.getItem("tixcraft_button_index") || "0");

    const gameListContainer = document.getElementById("gameList");
    if (gameListContainer) {
      const gameListButtons = gameListContainer.querySelectorAll(SELECTORS.TICKET_BUTTONS);
      
      if (gameListButtons.length > 0) {
        const selectedButton = gameListButtons[Math.min(selectedButtonIndex, gameListButtons.length - 1)];
        const targetUrl = selectedButton.getAttribute("data-href");

        console.log(`Selected button ${Math.min(selectedButtonIndex + 1, gameListButtons.length)} from gameList container, navigating to:`, targetUrl);
        window.location.href = targetUrl;
        return true;
      }
    }

    const fallbackButtons = document.querySelectorAll(SELECTORS.TICKET_BUTTONS);
    if (fallbackButtons.length > 0) {
      const selectedButton = fallbackButtons[Math.min(selectedButtonIndex, fallbackButtons.length - 1)];
      const targetUrl = selectedButton.getAttribute("data-href");

      console.log(`Selected button ${Math.min(selectedButtonIndex + 1, fallbackButtons.length)} via fallback method, navigating to:`, targetUrl);
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

  // Ultra-precise 10-second refresh with maximum hardware utilization
  function setupUltraPrecise10SecRefresh() {
    console.log('⚡ Setting up ULTRA-PRECISE 10-second refresh (maximum hardware utilization)');
    
    // Clear any existing timers
    if (window.refreshInterval) clearInterval(window.refreshInterval);
    if (window.precisionTimer) clearTimeout(window.precisionTimer);
    if (window.driftCorrector) clearInterval(window.driftCorrector);
    if (window.performanceMonitor) clearInterval(window.performanceMonitor);
    
    // Initialize timing statistics
    window.refreshStats = {
      refreshCount: 0,
      totalDrift: 0,
      maxDrift: 0,
      minDrift: Infinity,
      lastRefreshTime: Date.now(),
      targetInterval: 10000, // 10 seconds
      corrections: 0
    };
    
    // High-frequency timing correction (every 1ms for maximum precision)
    window.nextTargetTime = Date.now() + 10000;
    
    const executeRefresh = () => {
      const actualTime = Date.now();
      const actualDate = new Date(actualTime);
      const drift = actualTime - window.nextTargetTime;
      
      // Log current refresh time with detailed timestamp
      const timeString = actualDate.toLocaleString('zh-TW', {
        hour12: false,
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const milliseconds = actualDate.getMilliseconds().toString().padStart(3, '0');
      const fullTimeString = `${timeString}.${milliseconds}`;
      
      // Update statistics
      window.refreshStats.refreshCount++;
      window.refreshStats.totalDrift += Math.abs(drift);
      window.refreshStats.maxDrift = Math.max(window.refreshStats.maxDrift, Math.abs(drift));
      window.refreshStats.minDrift = Math.min(window.refreshStats.minDrift, Math.abs(drift));
      window.refreshStats.lastRefreshTime = actualTime;
      
      console.log(`🚀 ULTRA-PRECISE REFRESH #${window.refreshStats.refreshCount}`);
      console.log(`📅 刷新時間: ${fullTimeString} (秒數: ${actualDate.getSeconds()})`);
      console.log(`⏱️ Timing drift: ${drift}ms | Avg: ${(window.refreshStats.totalDrift / window.refreshStats.refreshCount).toFixed(2)}ms`);
      
      // Execute multiple refresh mechanisms simultaneously for maximum reliability
      window.location.reload();
      
      // Backup refresh mechanisms (aggressive hardware utilization)
      setTimeout(() => {
        if (document.readyState !== 'complete') {
          console.log('🔄 Backup refresh #1 executing');
          window.location.reload();
        }
      }, 50);
      
      setTimeout(() => {
        console.log('🔄 Backup refresh #2 executing');
        window.location.href = window.location.href;
      }, 100);
      
      // Calculate next target time with drift compensation
      window.nextTargetTime += 10000;
      const correctedDelay = window.nextTargetTime - Date.now();
      
      if (Math.abs(drift) > 50) {
        window.refreshStats.corrections++;
        console.log(`⚠️ Large drift detected (${drift}ms), applying correction`);
      }
      
      // Schedule next refresh with ultra-high precision
      window.precisionTimer = setTimeout(executeRefresh, Math.max(0, correctedDelay));
    };
    
    // Start first refresh at the next precise 10-second boundary (0,10,20,30,40,50 seconds)
    const now = Date.now();
    const currentDate = new Date(now);
    const currentSeconds = currentDate.getSeconds();
    const currentMs = currentDate.getMilliseconds();
    
    // Find next target second (0,10,20,30,40,50)
    const targetSeconds = [0, 10, 20, 30, 40, 50];
    let nextTargetSecond = targetSeconds.find(sec => sec > currentSeconds);
    
    // If no target found in current minute, use first target of next minute
    if (!nextTargetSecond) {
      nextTargetSecond = 60; // Will wrap to next minute's 0 second
    }
    
    // Calculate milliseconds until next target
    const secondsUntilTarget = nextTargetSecond - currentSeconds;
    const msUntilTarget = (secondsUntilTarget * 1000) - currentMs;
    
    console.log(`🎯 Current time: ${currentSeconds}.${currentMs}s, Next target: ${nextTargetSecond % 60}s, Delay: ${msUntilTarget}ms`);
    window.nextTargetTime = now + msUntilTarget;
    
    window.precisionTimer = setTimeout(executeRefresh, msUntilTarget);
    
    // Ultra-high frequency drift monitoring (every 1ms - maximum hardware utilization)
    window.driftCorrector = setInterval(() => {
      const currentTime = Date.now();
      const expectedNextRefresh = window.nextTargetTime;
      const timeUntilRefresh = expectedNextRefresh - currentTime;
      
      // Preemptive correction if we detect significant drift
      if (timeUntilRefresh < 0 && Math.abs(timeUntilRefresh) > 100) {
        console.log(`🔧 Emergency drift correction: ${timeUntilRefresh}ms`);
        clearTimeout(window.precisionTimer);
        executeRefresh();
      }
    }, 1);
    
    // Performance monitoring (every 100ms - aggressive monitoring)
    window.performanceMonitor = setInterval(() => {
      const stats = window.refreshStats;
      if (stats.refreshCount > 0) {
        const avgDrift = stats.totalDrift / stats.refreshCount;
        
        // Log detailed performance metrics
        if (stats.refreshCount % 6 === 0) { // Every minute
          console.log(`📊 Performance Report:`);
          console.log(`   Refreshes: ${stats.refreshCount}`);
          console.log(`   Avg Drift: ${avgDrift.toFixed(2)}ms`);
          console.log(`   Max Drift: ${stats.maxDrift.toFixed(2)}ms`);
          console.log(`   Min Drift: ${stats.minDrift.toFixed(2)}ms`);
          console.log(`   Corrections: ${stats.corrections}`);
          console.log(`   Precision: ${avgDrift < 10 ? '✅ EXCELLENT' : avgDrift < 50 ? '⚠️ GOOD' : '❌ POOR'}`);
        }
      }
    }, 100);
    
    // Store reference for external access
    window.ultraPreciseRefreshActive = true;
  }

  // Setup auto refresh with precision selection
  function setupAutoRefresh() {
    const currentUrl = window.location.href;
    if (
      /^https:\/\/tixcraft\.com\/activity\/game\/.*/.test(currentUrl) ||
      currentUrl === "https://tixcraft.com/activity/game"
    ) {
      console.log('🎮 Game page detected - initiating ultra-precise 10-second refresh');
      setupUltraPrecise10SecRefresh();
    }
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
    
    // Clear ultra-precise refresh timers
    if (window.precisionTimer) {
      clearTimeout(window.precisionTimer);
      window.precisionTimer = null;
    }
    if (window.driftCorrector) {
      clearInterval(window.driftCorrector);
      window.driftCorrector = null;
    }
    if (window.performanceMonitor) {
      clearInterval(window.performanceMonitor);
      window.performanceMonitor = null;
    }
    
    window.ultraPreciseRefreshActive = false;
    console.log('🛑 Ultra-precise refresh stopped');
  }

  // Remove unnecessary elements
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

  // Auto-refresh captcha for game page
  function refreshGamePageCaptcha() {
    console.log('🔄 Auto-refreshing game page captcha...');
    
    // Create a new Image object to refresh the captcha
    const captchaImg = new Image();
    captchaImg.crossOrigin = 'anonymous';
    
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const captchaUrl = `https://tixcraft.com/ticket/captcha?refresh=1&_=${timestamp}`;
    
    captchaImg.onload = function() {
      console.log('✅ Game page captcha refreshed successfully');
      
      // Store the refreshed captcha URL
      localStorage.setItem("tixcraft_game_captcha_url", captchaUrl);
      localStorage.setItem("tixcraft_game_captcha_timestamp", timestamp.toString());
      
      // Update assistant panel if available
      if (assistantPanel) {
        updateCaptchaDisplay(captchaUrl, "Game Page Captcha (Refreshed)");
      }
    };
    
    captchaImg.onerror = function() {
      console.log('❌ Failed to refresh game page captcha');
    };
    
    // Start loading the captcha
    captchaImg.src = captchaUrl;
    
    // Also try to find and refresh any existing captcha images on the page
    const existingCaptchas = document.querySelectorAll('img[src*="captcha"]');
    existingCaptchas.forEach((img, index) => {
      if (img.src.includes('captcha')) {
        console.log(`🔄 Refreshing existing captcha #${index + 1}`);
        img.src = captchaUrl;
      }
    });
  }

  // Add hidden confirmed input to verify page form
  function addConfirmedInputToVerifyForm() {
    // Check if input is already added to avoid duplicates
    if (window.confirmedInputAdded) {
      return;
    }
    
    const formSelector = '#form-ticket-verify';
    const form = document.querySelector(formSelector);
    
    if (form) {
      // Check if confirmed input already exists
      const existingInput = form.querySelector('input[name="confirmed"]');
      if (!existingInput) {
        // Create hidden input element
        const confirmedInput = document.createElement('input');
        confirmedInput.type = 'hidden';
        confirmedInput.name = 'confirmed';
        confirmedInput.value = 'true';
        
        // Add to form
        form.appendChild(confirmedInput);
        
        console.log('✅ Added hidden confirmed=true input to verify form');
        window.confirmedInputAdded = true;
      } else {
        console.log('ℹ️ Confirmed input already exists in form');
        window.confirmedInputAdded = true;
      }
    } else {
      console.log('⚠️ Verify form not found, will retry...');
      // Retry after a delay if form not found
      setTimeout(() => {
        addConfirmedInputToVerifyForm();
      }, 500);
    }
  }

  // Auto-fill verification code functionality
  function autoFillVerificationCodes() {
    const currentUrl = window.location.href;
    console.log('🔄 Auto-filling verification codes');
    if (/^https:\/\/tixcraft\.com\/ticket\/verify\/.*/.test(currentUrl)) {
      
      // Add hidden confirmed=true input to form
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
            
            console.log(`🚀 Auto-submitting verify form #${SUBMIT_STATE.submitCount} (enhanced loop prevention active)`);
            
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
            console.log('🔄 Verification code filled, manual submit required to prevent loop');
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
        console.log("🧹 Cleared captcha code from localStorage after auto-fill");
        
        if (assistantPanel) {
          const capturaInput = assistantPanel.querySelector('input[placeholder="Enter captura code"]');
          if (capturaInput) {
            capturaInput.value = "";
            console.log("🧹 Cleared captcha input field in assistant panel");
          }
        }
        
        console.log("🚀 Auto-submitting after filling captcha code:", savedCaptura);
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
      const fullUrl = existingImg.src.startsWith("/")
        ? `https://tixcraft.com${existingImg.src}`
        : existingImg.src;

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

  // Update captcha display
  function updateCaptchaDisplay(imageUrl, title = "Captcha") {
    if (!assistantPanel) {
      assistantPanel = createTixcraftAssistantPanel();
    }

    const contentDiv = assistantPanel.querySelector(".captcha-content");
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
      }
    } else if (isAreaPage) {
      const storedCaptcha = getStoredCaptcha();
      if (storedCaptcha) {
        updateCaptchaDisplay(storedCaptcha, "Stored captcha");
      } else {
        const existingCaptchaUrl = getAndStoreCaptcha();
        if (existingCaptchaUrl) {
          updateCaptchaDisplay(existingCaptchaUrl, "Existing page captcha");
        }
      }
    }
  }


  // =============================================================================
  // UI COMPONENTS & CSS STYLING
  // =============================================================================

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

      // Button selection area
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

       for (let i = 0; i < 5; i++) {
         const option = document.createElement("option");
         option.value = i.toString();
         option.textContent = `Show ${i + 1}`;
         buttonSelect.appendChild(option);
       }

      buttonSelect.value = localStorage.getItem("tixcraft_button_index") || "0";

      buttonSelect.addEventListener("change", () => {
        localStorage.setItem("tixcraft_button_index", buttonSelect.value);
        console.log(`Set to select button ${parseInt(buttonSelect.value) + 1} for instant purchase`);
      });

      buttonSection.appendChild(buttonLabel);
      buttonSection.appendChild(buttonSelect);
      container.appendChild(buttonSection);

      // Verify input area
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

      verifyInput.value = localStorage.getItem("tixcraft_verify_value") || "";

      verifyInput.addEventListener("input", () => {
        localStorage.setItem("tixcraft_verify_value", verifyInput.value);
        autoFillVerificationCodes();
      });

      verifySection.appendChild(verifyLabel);
      verifySection.appendChild(verifyInput);
      container.appendChild(verifySection);

      // Seat selection area
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

      seatInput.value = localStorage.getItem("tixcraft_seat_value") || "";

      seatInput.addEventListener("input", () => {
          const seatValue = seatInput.value.trim().toUpperCase();
          localStorage.setItem("tixcraft_seat_value", seatValue);

          if (seatValue) {
            window.testSeatSearch(seatValue);
          }
        });

      seatSection.appendChild(seatLabel);
      seatSection.appendChild(seatInput);
      container.appendChild(seatSection);

      // Captcha display area
      const captchaContent = document.createElement("div");
      captchaContent.className = "captcha-content";
      captchaContent.style.cssText = `
                text-align: center;
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e9ecef;
            `;
      container.appendChild(captchaContent);

      // Captura input area
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

      capturaInput.value = localStorage.getItem("tixcraft_captura_value") || "";

      capturaInput.addEventListener("input", () => {
        localStorage.setItem("tixcraft_captura_value", capturaInput.value);
        autoFillVerificationCodes();
      });

      verifyInput.addEventListener("input", () => {
        const currentValue = verifyInput.value;
        localStorage.setItem("tixcraft_verify_value", currentValue);
      });

      capturaSection.appendChild(capturaLabel);
      capturaSection.appendChild(capturaInput);
      container.appendChild(capturaSection);

      document.body.appendChild(container);
    }

    return container;
  }


  // =============================================================================
  // INITIALIZATION & EVENT HANDLERS
  // =============================================================================

  console.log('Test functions loaded to global scope: listAllSeats(), testSeatSearch()');
  console.log('Area refresh controls: checkRefreshStatus(), forceStartAreaRefresh(), forceStopAreaRefresh()');
  console.log('Ultra-precise 10s refresh controls: checkUltraPreciseStatus(), forceUltraPreciseRefresh(), restartUltraPrecise()');

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

     window.testSeatSearch = window.testSeatSearch;
     console.log('Test functions loaded: listAllSeats(), testSeatSearch()');
   }

   // Monitor DOM changes and remove dynamically loaded elements
   const elementObserver = new MutationObserver((mutations) => {
      let dynamicRemovedCount = 0;
      let foundNewIframes = false;
      const currentPageType = getPageType();

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            try {
              if (node.tagName && node.tagName.toLowerCase() === 'iframe') {
                foundNewIframes = true;
              }

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
                const iframes = node.querySelectorAll('iframe');
                if (iframes.length > 0) {
                  foundNewIframes = true;
                }
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

   // Define area refresh control functions
   window.checkRefreshStatus = function() {
     const pageType = getPageType();
     console.log(`Current page type: ${pageType}`);
     console.log(`Refresh rate: ${window.TIXCRAFT_PERFORMANCE.refreshRate}ms`);
     console.log(`Area refresh active: ${areaRefreshInterval !== null}`);
     if (areaRefreshInterval) {
       console.log('✅ Area auto-refresh is running');
     } else {
       console.log('❌ Area auto-refresh is NOT running');
     }
     return {
       pageType,
       refreshRate: window.TIXCRAFT_PERFORMANCE.refreshRate,
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

   window.enableDirectRefresh = function() {
     console.log('⚡ Enabling direct refresh mode (no checks)...');
     stopAreaAutoRefresh();
     areaRefreshInterval = setInterval(() => {
       console.log('🔄 Direct refresh - no conditions checked');
       window.location.reload();
     }, window.TIXCRAFT_PERFORMANCE.refreshRate);
   };

   window.clearSeatAttempts = function() {
     sessionStorage.removeItem('last_seat_attempt');
     console.log('🧹 Cleared seat attempt records');
   };

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

   // Ultra-precise 10-second refresh control functions
   window.checkUltraPreciseStatus = function() {
     const isActive = !!window.ultraPreciseRefreshActive;
     const stats = window.refreshStats;
     
     console.log('📊 Ultra-Precise 10-Second Refresh Status:');
     console.log(`   Active: ${isActive}`);
     console.log(`   Precision Timer: ${!!window.precisionTimer}`);
     console.log(`   Drift Corrector: ${!!window.driftCorrector}`);
     console.log(`   Performance Monitor: ${!!window.performanceMonitor}`);
     
     if (stats && stats.refreshCount > 0) {
       const avgDrift = stats.totalDrift / stats.refreshCount;
       console.log(`   Refresh Count: ${stats.refreshCount}`);
       console.log(`   Average Drift: ${avgDrift.toFixed(2)}ms`);
       console.log(`   Max Drift: ${stats.maxDrift.toFixed(2)}ms`);
       console.log(`   Min Drift: ${stats.minDrift.toFixed(2)}ms`);
       console.log(`   Corrections Applied: ${stats.corrections}`);
       console.log(`   Precision Rating: ${avgDrift < 10 ? '✅ EXCELLENT' : avgDrift < 50 ? '⚠️ GOOD' : '❌ POOR'}`);
       
       if (stats.refreshCount > 1) {
         const lastInterval = Date.now() - stats.lastRefreshTime;
         console.log(`   Time Since Last: ${lastInterval}ms`);
       }
     }
     
     return {
       isActive,
       stats: stats || null,
       timers: {
         precision: !!window.precisionTimer,
         driftCorrector: !!window.driftCorrector,
         performanceMonitor: !!window.performanceMonitor
       }
     };
   };

   window.forceUltraPreciseRefresh = function() {
     console.log('🚀 MANUALLY TRIGGERING ULTRA-PRECISE REFRESH!');
     window.location.reload();
   };

   window.restartUltraPrecise = function() {
     console.log('🔧 Restarting ultra-precise 10-second refresh...');
     stopAutoRefresh();
     setTimeout(() => {
       setupUltraPrecise10SecRefresh();
     }, 100);
   };

   window.getRefreshStats = function() {
     if (window.refreshStats && window.refreshStats.refreshCount > 0) {
       const stats = window.refreshStats;
       const avgDrift = stats.totalDrift / stats.refreshCount;
       
       return {
         refreshCount: stats.refreshCount,
         averageDrift: parseFloat(avgDrift.toFixed(2)),
         maxDrift: parseFloat(stats.maxDrift.toFixed(2)),
         minDrift: parseFloat(stats.minDrift.toFixed(2)),
         corrections: stats.corrections,
         precisionRating: avgDrift < 10 ? 'EXCELLENT' : avgDrift < 50 ? 'GOOD' : 'POOR',
         isActive: !!window.ultraPreciseRefreshActive
       };
     }
     return { message: 'No statistics available - refresh not running or no refreshes executed yet' };
   };

     window.enableMaxPerformanceMode = function() {
    console.log('💥 ENABLING MAXIMUM PERFORMANCE MODE - WARNING: HIGH CPU USAGE');
    
    // Stop current refresh
    stopAutoRefresh();
    
    // Start with even more aggressive monitoring (every 0.5ms)
    setTimeout(() => {
      setupUltraPrecise10SecRefresh();
      
      // Override with even more aggressive monitoring
      if (window.driftCorrector) clearInterval(window.driftCorrector);
      
      window.driftCorrector = setInterval(() => {
        const currentTime = Date.now();
        const expectedNextRefresh = window.nextTargetTime || 0;
        const timeUntilRefresh = expectedNextRefresh - currentTime;
        
        if (timeUntilRefresh < 0 && Math.abs(timeUntilRefresh) > 50) {
          console.log(`🔧 MAX PERFORMANCE: Emergency correction ${timeUntilRefresh}ms`);
          clearTimeout(window.precisionTimer);
          window.location.reload();
        }
      }, 0.5); // Every 0.5ms - extreme hardware utilization
      
      console.log('💥 Maximum performance mode activated - monitoring every 0.5ms');
    }, 100);
  };
  
  // Captcha refresh control functions
  window.refreshGameCaptcha = function() {
    console.log('🔄 Manually refreshing game page captcha...');
    refreshGamePageCaptcha();
  };
  
  window.getGameCaptchaStatus = function() {
    const url = localStorage.getItem("tixcraft_game_captcha_url");
    const timestamp = localStorage.getItem("tixcraft_game_captcha_timestamp");
    
    if (url && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      const ageSeconds = Math.floor(age / 1000);
      
      console.log('📊 Game Captcha Status:');
      console.log(`   URL: ${url}`);
      console.log(`   Age: ${ageSeconds} seconds ago`);
      console.log(`   Fresh: ${age < 30000 ? '✅ Yes' : '❌ No'}`);
      
      return {
        url,
        timestamp: parseInt(timestamp),
        age: age,
        ageSeconds: ageSeconds,
        isFresh: age < 30000
      };
    } else {
      console.log('❌ No game captcha data found');
      return null;
    }
  };

  if (getPageType() === "area") {
    setTimeout(() => {
      window.startRefreshHeartbeat();
    }, 2000);
  }

     console.log('✅ Tixcraft Assistant running at MAXIMUM SPEED');
   console.log('📊 Performance: Area refresh 0.5s | Seat monitor 3ms | Form monitor 8ms | Captcha 15ms');
   console.log('⚡ Ultra-Precise 10s Game Refresh: 1ms drift monitoring | Hardware-intensive precision mode');
   console.log('🔄 Captcha controls: refreshGameCaptcha(), getGameCaptchaStatus()');
})();
