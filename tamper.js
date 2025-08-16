// ==UserScript==
// @name         Keep Replit Alive (Run Only)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Auto-clicks "Run" only when project is stopped (ignores "Stop")
// @match        https://replit.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Helper to get element by XPath
    function getElementByXpath(path) {
        return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    function autoRun() {
        const runTextEl = getElementByXpath('/html/body/div[1]/div[1]/div[1]/div/div/header/div[2]/span/div/button/span');

        if (runTextEl && runTextEl.innerText.trim() === "Run") {
            runTextEl.click(); // click the span inside the button
            console.log("▶️ Auto-run triggered (button said 'Run').");
        }
    }

    // Keep checking every 5s
    setInterval(autoRun, 5000);

    // Also react when UI changes
    const observer = new MutationObserver(autoRun);
    observer.observe(document.body, { childList: true, subtree: true });
})();
