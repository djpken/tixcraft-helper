// ==UserScript==
// @name         Tixcraft Assistant - Time Test Version
// @namespace    http://tampermonkey.net/
// @version      3.0-timetest
// @description  Time-optimized version with detailed performance monitoring for testing automation flow from game page to order page
// @author       You
// @match        https://tixcraft.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  // =============================================================================
  // TIME TEST CONFIGURATION & MONITORING SYSTEM
  // =============================================================================

  // Time measurement system for performance testing based on TEST.md requirements
  window.TIXCRAFT_TIME_TEST = {
    enabled: true,
    startTime: null,
    checkpoints: {},
    phases: {
      T0_GAME_START: 'Game page button click - Start',
      T1_TICKET_PAGE: 'Ticket page loaded and processed',
      T2_AREA_PAGE: 'Area page loaded',
      T3_SEAT_SELECTED: 'Seat selection completed', 
      T4_VERIFY_PAGE: 'Verify page loaded',
      T5_ORDER_PAGE: 'Order page reached - TEST COMPLETE'
    },
    logs: [],
    targetTime: 5000, // 5 seconds target as per TEST.md
    testStarted: false,
    seatSelectionAttempts: 0,
    maxSeatAttempts: 10
  };

  // Start timing measurement
  function startTimeTest(phase) {
    if (!window.TIXCRAFT_TIME_TEST.enabled) return;
    
    const now = Date.now();
    if (!window.TIXCRAFT_TIME_TEST.startTime) {
      window.TIXCRAFT_TIME_TEST.startTime = now;
      window.TIXCRAFT_TIME_TEST.testStarted = true;
      console.log('🚀 TIME TEST STARTED - Target: Complete in under 5 seconds');
    }
    
    window.TIXCRAFT_TIME_TEST.checkpoints[phase] = now;
    const elapsed = now - window.TIXCRAFT_TIME_TEST.startTime;
    const message = `⏱️ ${phase}: ${elapsed}ms - ${window.TIXCRAFT_TIME_TEST.phases[phase]}`;
    
    console.log(message);
    window.TIXCRAFT_TIME_TEST.logs.push({
      phase,
      timestamp: now,
      elapsed,
      description: window.TIXCRAFT_TIME_TEST.phases[phase]
    });

    // Check if we reached the final phase
    if (phase === 'T5_ORDER_PAGE') {
      completeTimeTest();
    }
  }

  // Complete the time test and show results
  function completeTimeTest() {
    const totalTime = Date.now() - window.TIXCRAFT_TIME_TEST.startTime;
    const target = window.TIXCRAFT_TIME_TEST.targetTime;
    const success = totalTime <= target;
    
    console.log('🏁 ============ TIME TEST COMPLETED ============');
    console.log(`⏱️ Total Time: ${totalTime}ms`);
    console.log(`🎯 Target Time: ${target}ms`);
    console.log(`${success ? '✅ SUCCESS' : '❌ FAILED'} - ${success ? 'Performance target met!' : 'Exceeded target time'}`);
    console.log(`📊 Seat Selection Attempts: ${window.TIXCRAFT_TIME_TEST.seatSelectionAttempts}`);
    
    // Show detailed phase breakdown
    console.log('📋 Phase Breakdown:');
    let lastTime = window.TIXCRAFT_TIME_TEST.startTime;
    window.TIXCRAFT_TIME_TEST.logs.forEach(log => {
      const phaseTime = log.timestamp - lastTime;
      console.log(`   ${log.phase}: ${phaseTime}ms (${log.description})`);
      lastTime = log.timestamp;
    });

    // Store results for analysis
    window.TIXCRAFT_TIME_TEST.results = {
      totalTime,
      target,
      success,
      phases: window.TIXCRAFT_TIME_TEST.logs,
      seatAttempts: window.TIXCRAFT_TIME_TEST.seatSelectionAttempts
    };

    // Calculate and display success rate
    let successRate;
    if (window.TIXCRAFT_TIME_TEST.seatSelectionAttempts <= 3) {
      successRate = 100;
    } else if (window.TIXCRAFT_TIME_TEST.seatSelectionAttempts <= 5) {
      successRate = 80;
    } else {
      successRate = 60;
    }
    console.log(`🎯 Seat Selection Success Rate: ${successRate}% (Target: >90%)`);

    // Force update the time test panel to show completion
    setTimeout(() => {
      updateTimeTestPanel();
    }, 100);
  }

  // Get current test status (for console debugging)
  window.getTimeTestStatus = function() {
    if (!window.TIXCRAFT_TIME_TEST.testStarted) {
      return { 
        status: 'Not started', 
        message: 'Navigate to a game page to start the automation test',
        phases: window.TIXCRAFT_TIME_TEST.phases
      };
    }
    
    const elapsed = Date.now() - window.TIXCRAFT_TIME_TEST.startTime;
    const currentPhase = Object.keys(window.TIXCRAFT_TIME_TEST.checkpoints).pop();
    
    return {
      status: 'Running',
      elapsed,
      currentPhase,
      phases: window.TIXCRAFT_TIME_TEST.logs,
      target: window.TIXCRAFT_TIME_TEST.targetTime,
      seatAttempts: window.TIXCRAFT_TIME_TEST.seatSelectionAttempts
    };
  };

  // Reset time test (for console debugging)
  window.resetTimeTest = function() {
    window.TIXCRAFT_TIME_TEST.startTime = null;
    window.TIXCRAFT_TIME_TEST.checkpoints = {};
    window.TIXCRAFT_TIME_TEST.logs = [];
    window.TIXCRAFT_TIME_TEST.testStarted = false;
    window.TIXCRAFT_TIME_TEST.seatSelectionAttempts = 0;
    console.log('🔄 Time test reset - Ready for new test run');
  };

  // Export time test results (for analysis)
  window.getTimeTestResults = function() {
    return window.TIXCRAFT_TIME_TEST.results || { message: 'No completed test results available' };
  };

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

      // TIME TEST: Record page load timestamps based on TEST.md flow
      if (pageType === "game") {
        // Game page - starting point for automation test
        console.log('🎮 Game page detected - Ready to start automation test');
      } else if (pageType === "ticket") {
        startTimeTest('T1_TICKET_PAGE');
      } else if (pageType === "area") {
        startTimeTest('T2_AREA_PAGE');
      } else if (pageType === "verify") {
        startTimeTest('T4_VERIFY_PAGE');
      } else if (pageType === "order") {
        startTimeTest('T5_ORDER_PAGE');
      }

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
      console.log('Error in executeScript:', error);
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
      // TIME TEST: Increment seat selection attempts
      window.TIXCRAFT_TIME_TEST.seatSelectionAttempts++;
      
      preloadSeats();
      
      const availableSeats = document.querySelectorAll(SELECTORS.SEAT_ELEMENTS_AVAILABLE);
      
      if (availableSeats.length > 0) {
        const firstSeat = availableSeats[0];
        sessionStorage.setItem('last_seat_attempt', Date.now().toString());
        firstSeat.click();
        
        // TIME TEST: Record successful seat selection
        setTimeout(() => startTimeTest('T3_SEAT_SELECTED'), 100);
        return true;
      } else {
        const allSeats = document.querySelectorAll(SELECTORS.SEAT_ELEMENTS);
        for (let seat of allSeats) {
          const style = window.getComputedStyle(seat);
          if (style.opacity === '1' || seat.style.opacity === '1') {
            sessionStorage.setItem('last_seat_attempt', Date.now().toString());
            seat.click();
            
            // TIME TEST: Record successful seat selection
            setTimeout(() => startTimeTest('T3_SEAT_SELECTED'), 100);
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
      } else {
        createPersistentCaptchaViewerPanel();
        setTimeout(() => {
          const newCaptchaInput = document.querySelector("#persistent-captura-input");
          if (newCaptchaInput) {
            newCaptchaInput.focus();
          }
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
      // TIME TEST: Increment seat selection attempts
      window.TIXCRAFT_TIME_TEST.seatSelectionAttempts++;
      
      sessionStorage.setItem('last_seat_attempt', Date.now().toString());
      preloadSeats();
      const upperSeatValue = seatValue.toUpperCase();
      
      if (PRELOADED_DATA.seatMap.has(upperSeatValue)) {
        const seatData = PRELOADED_DATA.seatMap.get(upperSeatValue);
        if (seatData.available) {
          seatData.element.click();
          
          // TIME TEST: Record successful seat selection
          setTimeout(() => startTimeTest('T3_SEAT_SELECTED'), 100);
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
            
            // TIME TEST: Record successful seat selection
            setTimeout(() => startTimeTest('T3_SEAT_SELECTED'), 100);
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
            
            // TIME TEST: Record successful seat selection
            setTimeout(() => startTimeTest('T3_SEAT_SELECTED'), 100);
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
    
    let consecutiveIdleCount = 0;
    
    areaRefreshInterval = setInterval(() => {
      const now = Date.now();
      
      const currentActiveElement = document.activeElement;
      const hasUserInput = currentActiveElement && (
        currentActiveElement.tagName === 'INPUT' || 
        currentActiveElement.tagName === 'SELECT' ||
        currentActiveElement.tagName === 'TEXTAREA'
      );
      
      const lastSeatAttempt = parseInt(sessionStorage.getItem('last_seat_attempt') || '0');
      const recentAttempt = now - lastSeatAttempt < 300;
      
      if (!hasUserInput && !recentAttempt) {
        consecutiveIdleCount++;
        if (consecutiveIdleCount >= 1) {
          window.location.reload();
        }
      } else {
        consecutiveIdleCount = 0;
      }
    }, window.TIXCRAFT_PERFORMANCE.refreshRate);
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

        // TIME TEST: Start the automation test when clicking game button
        startTimeTest('T0_GAME_START');
        console.log(`🎯 TIME TEST: Selected showtime ${Math.min(selectedShowtimeIndex + 1, gameListButtons.length)} from gameList container, navigating to:`, targetUrl);
        window.location.href = targetUrl;
        return true;
      }
    }

    const fallbackButtons = document.querySelectorAll(SELECTORS.TICKET_BUTTONS);
    if (fallbackButtons.length > 0) {
      const selectedButton = fallbackButtons[Math.min(selectedShowtimeIndex, fallbackButtons.length - 1)];
      const targetUrl = selectedButton.getAttribute("data-href");

      // TIME TEST: Start the automation test when clicking game button
      startTimeTest('T0_GAME_START');
      console.log(`🎯 TIME TEST: Selected showtime ${Math.min(selectedShowtimeIndex + 1, fallbackButtons.length)} via fallback method, navigating to:`, targetUrl);
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
      refreshInterval = setInterval(() => {
        window.location.reload();
      }, 10000);
    }
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
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

  function createPersistentCaptchaViewerPanel() {
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
        
        document.querySelectorAll('input[name*="captcha"], input[id*="captcha"], input[placeholder*="驗證"]').forEach(input => {
          if (input !== capturaInput) {
            input.value = value;
          }
        });
        
        if (typeof autoFillVerificationCodes === 'function') {
          autoFillVerificationCodes();
        }
      });

      captchaViewerPanel.appendChild(captchaContent);
      captchaViewerPanel.appendChild(capturaInput);
      
      document.body.appendChild(captchaViewerPanel);
      
      protectPersistentPanel(captchaViewerPanel);
    } else {
      captchaViewerPanel.style.display = "block";
      captchaViewerPanel.style.visibility = "visible";
      captchaViewerPanel.style.opacity = "1";
      
      const capturaInput = captchaViewerPanel.querySelector("#persistent-captura-input");
      if (capturaInput) {
        capturaInput.value = localStorage.getItem("tixcraft_captura_value") || "";
      }
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
      createPersistentCaptchaViewerPanel();
    });
  } else {
    createPersistentCaptchaViewerPanel();
  }

   if (isTargetPage()) {
     executeScript();

     if (document.readyState === "loading") {
       document.addEventListener("DOMContentLoaded", executeScript);
     }

     window.testSeatSearch = window.testSeatSearch;
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
     return {
       pageType,
       refreshRate: window.TIXCRAFT_PERFORMANCE.refreshRate,
       isActive: areaRefreshInterval !== null
     };
   };
   
   window.forceStartAreaRefresh = function() {
     setupAreaAutoRefresh();
   };
   
   window.forceStopAreaRefresh = function() {
     stopAreaAutoRefresh();
   };

   window.enableDirectRefresh = function() {
     stopAreaAutoRefresh();
     areaRefreshInterval = setInterval(() => {
       window.location.reload();
     }, window.TIXCRAFT_PERFORMANCE.refreshRate);
   };

   window.clearSeatAttempts = function() {
     sessionStorage.removeItem('last_seat_attempt');
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

  // =============================================================================
  // TIME TEST MONITORING PANEL
  // =============================================================================

  function createTimeTestPanel() {
    let panel = document.getElementById("tixcraft-time-test-panel");
    
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "tixcraft-time-test-panel";
      panel.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 280px;
        padding: 15px;
        background: linear-gradient(135deg, #2c3e50, #34495e);
        color: white;
        border-radius: 10px;
        box-shadow: 0 6px 25px rgba(0,0,0,0.4);
        z-index: 10001;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 11px;
        line-height: 1.4;
        border: 2px solid #3498db;
      `;

      const title = document.createElement("div");
      title.innerHTML = "⏱️ TIXCRAFT TIME TEST<br><small>Target: Complete in < 5 seconds</small>";
      title.style.cssText = `
        font-weight: bold;
        margin-bottom: 12px;
        color: #ecf0f1;
        text-align: center;
        border-bottom: 1px solid #4a6574;
        padding-bottom: 8px;
      `;

      const status = document.createElement("div");
      status.id = "time-test-status";
      status.style.cssText = "margin-bottom: 12px;";

      const phases = document.createElement("div");
      phases.id = "time-test-phases";
      phases.style.cssText = "font-size: 10px; max-height: 150px; overflow-y: auto;";

      const controls = document.createElement("div");
      controls.style.cssText = "margin-top: 12px; text-align: center;";

      const resetBtn = document.createElement("button");
      resetBtn.textContent = "Reset Test";
      resetBtn.style.cssText = `
        background: #e74c3c;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 10px;
        margin: 0 3px;
        transition: background 0.3s;
      `;
      resetBtn.onmouseover = () => resetBtn.style.background = '#c0392b';
      resetBtn.onmouseout = () => resetBtn.style.background = '#e74c3c';
      resetBtn.onclick = () => {
        window.resetTimeTest();
        updateTimeTestPanel();
      };

      const statusBtn = document.createElement("button");
      statusBtn.textContent = "Show Status";
      statusBtn.style.cssText = `
        background: #3498db;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 10px;
        margin: 0 3px;
        transition: background 0.3s;
      `;
      statusBtn.onmouseover = () => statusBtn.style.background = '#2980b9';
      statusBtn.onmouseout = () => statusBtn.style.background = '#3498db';
      statusBtn.onclick = () => {
        console.log('⏱️ Current Test Status:', window.getTimeTestStatus());
        if (window.TIXCRAFT_TIME_TEST.results) {
          console.log('📊 Last Test Results:', window.getTimeTestResults());
        }
      };

      controls.appendChild(resetBtn);
      controls.appendChild(statusBtn);

      panel.appendChild(title);
      panel.appendChild(status);
      panel.appendChild(phases);
      panel.appendChild(controls);
      
      document.body.appendChild(panel);
    }

    return panel;
  }

  // Make updateTimeTestPanel globally accessible
  window.updateTimeTestPanel = updateTimeTestPanel;

  function updateTimeTestPanel() {
    const panel = document.getElementById("tixcraft-time-test-panel");
    if (!panel) return;

    const status = panel.querySelector("#time-test-status");
    const phases = panel.querySelector("#time-test-phases");

    // Check if test is completed (reached T5_ORDER_PAGE)
    const isCompleted = window.TIXCRAFT_TIME_TEST.results || 
                       window.TIXCRAFT_TIME_TEST.checkpoints['T5_ORDER_PAGE'];

    if (isCompleted && window.TIXCRAFT_TIME_TEST.testStarted) {
      // Test completed - show final results
      const results = window.TIXCRAFT_TIME_TEST.results;
      const totalTime = results ? results.totalTime : 
                       (Date.now() - window.TIXCRAFT_TIME_TEST.startTime);
      const target = window.TIXCRAFT_TIME_TEST.targetTime;
      const success = totalTime <= target;
      const successRate = window.TIXCRAFT_TIME_TEST.seatSelectionAttempts <= 3 ? 100 : 
                         (window.TIXCRAFT_TIME_TEST.seatSelectionAttempts <= 5 ? 80 : 60);
      
      status.innerHTML = `
        <div style="text-align: center; margin-bottom: 8px;">
          <div style="font-size: 14px; color: ${success ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
            ${success ? '🏆 TEST COMPLETED' : '⚠️ TEST COMPLETED'}
          </div>
          <div style="font-size: 10px; color: #bdc3c7;">Phase 5: Order Page Reached</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <span>Total Time:</span><span style="color: ${success ? '#27ae60' : '#e74c3c'}; font-weight: bold;">${totalTime}ms</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <span>Target:</span><span style="color: #3498db">${target}ms</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <span>Result:</span><span style="color: ${success ? '#27ae60' : '#e74c3c'}; font-weight: bold;">${success ? 'SUCCESS' : 'FAILED'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <span>Seat Attempts:</span><span style="color: #9b59b6">${window.TIXCRAFT_TIME_TEST.seatSelectionAttempts}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <span>Success Rate:</span><span style="color: ${successRate >= 90 ? '#27ae60' : '#f39c12'}">${successRate}%</span>
        </div>
      `;

      phases.innerHTML = `
        <div style="color: #bdc3c7; margin-bottom: 6px; font-weight: bold;">✅ Test Flow Completed:</div>
        ${window.TIXCRAFT_TIME_TEST.logs.map((log, index) => {
          const phaseTime = index > 0 ? 
            log.timestamp - window.TIXCRAFT_TIME_TEST.logs[index - 1].timestamp : 
            log.elapsed;
          return `
            <div style="margin-bottom: 3px; padding: 3px; background: rgba(39, 174, 96, 0.2); border-radius: 3px; border-left: 3px solid #27ae60;">
              <div style="color: #27ae60; font-weight: bold;">${log.phase} ✓</div>
              <div style="color: #ecf0f1; font-size: 9px;">+${phaseTime}ms (Total: ${log.elapsed}ms)</div>
              <div style="color: #95a5a6; font-size: 8px;">${log.description}</div>
            </div>
          `;
        }).join('')}
        <div style="text-align: center; margin-top: 8px; padding: 5px; background: rgba(52, 152, 219, 0.2); border-radius: 3px;">
          <div style="color: #3498db; font-size: 10px; font-weight: bold;">🎯 Test Analysis</div>
          <div style="color: #bdc3c7; font-size: 8px;">Performance: ${success ? 'Target Met' : 'Target Exceeded'}</div>
          <div style="color: #bdc3c7; font-size: 8px;">Efficiency: ${successRate >= 90 ? 'Excellent' : successRate >= 70 ? 'Good' : 'Needs Improvement'}</div>
        </div>
      `;
    } else if (window.TIXCRAFT_TIME_TEST.testStarted) {
      // Test running - show current progress
      const elapsed = Date.now() - window.TIXCRAFT_TIME_TEST.startTime;
      const target = window.TIXCRAFT_TIME_TEST.targetTime;
      const progress = Math.min((elapsed / target) * 100, 100);
      const isOverTime = elapsed > target;
      
      status.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
          <span>Status:</span><span style="color: #f39c12">🚀 Running</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Elapsed:</span><span style="color: ${isOverTime ? '#e74c3c' : '#f39c12'}">${elapsed}ms</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Target:</span><span style="color: #3498db">${target}ms</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Attempts:</span><span style="color: #9b59b6">${window.TIXCRAFT_TIME_TEST.seatSelectionAttempts}</span>
        </div>
        <div style="background: #34495e; height: 6px; margin: 8px 0; border-radius: 3px; overflow: hidden;">
          <div style="background: ${isOverTime ? '#e74c3c' : '#27ae60'}; height: 100%; width: ${progress}%; transition: width 0.3s;"></div>
        </div>
      `;

      phases.innerHTML = `
        <div style="color: #bdc3c7; margin-bottom: 6px; font-weight: bold;">📊 Phase Progress:</div>
        ${window.TIXCRAFT_TIME_TEST.logs.map((log, index) => {
          const phaseTime = index > 0 ? 
            log.timestamp - window.TIXCRAFT_TIME_TEST.logs[index - 1].timestamp : 
            log.elapsed;
          return `
            <div style="margin-bottom: 3px; padding: 3px; background: rgba(52, 73, 94, 0.5); border-radius: 3px;">
              <div style="color: #3498db; font-weight: bold;">${log.phase} ✓</div>
              <div style="color: #ecf0f1; font-size: 9px;">+${phaseTime}ms (Total: ${log.elapsed}ms)</div>
              <div style="color: #95a5a6; font-size: 8px;">${log.description}</div>
            </div>
          `;
        }).join('')}
      `;
    } else {
      // Test not started - show ready state
      status.innerHTML = `
        <div style="text-align: center; color: #f39c12;">
          <div style="font-size: 12px; margin-bottom: 5px;">⚡ Ready to Test</div>
          <div style="color: #bdc3c7; font-size: 9px;">Navigate to game page and click a ticket button to start the automation test</div>
        </div>
      `;
      phases.innerHTML = `
        <div style="color: #bdc3c7; text-align: center; margin: 10px 0;">
          <div style="margin-bottom: 5px;">Test Phases (T0 → T5):</div>
          <div style="font-size: 9px; color: #95a5a6;">
            T0: Game Start → T1: Ticket Page → T2: Area Page → T3: Seat Selected → T4: Verify Page → T5: Order Complete
          </div>
        </div>
      `;
    }
  }

  // =============================================================================
  // INITIALIZATION & STARTUP
  // =============================================================================

  console.log('⏱️ Tixcraft Time Test Version loaded');
  console.log('🎯 Performance Target: Complete automation flow in under 5 seconds');
  console.log('📊 Console Commands:');
  console.log('  - getTimeTestStatus() : Get current test status');
  console.log('  - resetTimeTest() : Reset test timer');
  console.log('  - getTimeTestResults() : Get last test results');

  // Initialize time test panel when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        createTimeTestPanel();
        setInterval(updateTimeTestPanel, 200);
      }, 500);
    });
  } else {
    setTimeout(() => {
      createTimeTestPanel();
      setInterval(updateTimeTestPanel, 200);
    }, 500);
  }

  if (getPageType() === "area") {
    setTimeout(() => {
      window.startRefreshHeartbeat();
    }, 2000);
  }

  console.log('✅ Tixcraft Time Test Assistant ready - Check the monitoring panel in top-right corner');
})();
