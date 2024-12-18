// ==UserScript==
// @name         APPLE Fact-Check
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a floating fact check button.
// @author       m-borg
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      i.imgur.com
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    window.addEventListener('load', function() {
        const originalWidth = 649;
        const originalHeight = 175;
        const desiredWidth = 200;
        const scaledHeight = Math.round((desiredWidth * originalHeight) / originalWidth);

        // Store image URLs
        const IMAGES = {
            DEFAULT: 'https://i.imgur.com/FbUE3Mi.png',
            TRUE: 'https://i.imgur.com/jKQ08BD.png',
            FALSE: 'https://i.imgur.com/BuzVaY3.png',
            LOADING: 'https://i.imgur.com/aJsEYaO.png'
        };

        const LOADING_DURATION = 1500;

        // Function to convert image URL to base64
        function loadImageAsBase64(url, callback) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                onload: function(response) {
                    const reader = new FileReader();
                    reader.onloadend = function() {
                        callback(reader.result);
                    };
                    reader.readAsDataURL(response.response);
                }
            });
        }

        // Create image cache
        const imageCache = {};

        // Preload all images
        Object.entries(IMAGES).forEach(([key, url]) => {
            loadImageAsBase64(url, (base64Data) => {
                imageCache[key] = base64Data;
                if (key === 'DEFAULT') {
                    buttonImage.src = base64Data;
                }
            });
        });

        const style = document.createElement('style');
        style.textContent = `
            .fact-check-button-container {
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                z-index: 2147483647 !important;
                cursor: pointer !important;
                width: ${desiredWidth}px !important;
                height: ${scaledHeight}px !important;
                transition: all 0.3s ease !important;
                transform-origin: center !important;
                overflow: hidden !important;
                background: transparent !important;
                border-radius: 15px !important;
            }

            .fact-check-button-container::before {
                content: '' !important;
                position: absolute !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(255, 255, 255, 0.3),
                    transparent
                ) !important;
                transform: translateX(-100%) !important;
                transition: none !important;
                pointer-events: none !important;
                z-index: 1 !important;
                border-radius: 15px !important;
            }

            .fact-check-button-container:hover::before {
                transform: translateX(100%) !important;
                transition: transform 0.7s ease !important;
            }

            .fact-check-button-image {
                width: 100% !important;
                height: 100% !important;
                object-fit: contain !important;
                transition: all 0.3s ease !important;
                position: relative !important;
                z-index: 0 !important;
                display: block !important;
                background: transparent !important;
            }
        `;
        document.head.appendChild(style);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'fact-check-button-container';

        const buttonImage = document.createElement('img');
        buttonImage.className = 'fact-check-button-image';

        let isProcessing = false;
        let isClicked = false;

        buttonContainer.addEventListener('click', async function() {
            if (isProcessing) return;

            if (!isClicked) {
                isProcessing = true;
                buttonImage.src = imageCache['LOADING'];

                await new Promise(resolve => setTimeout(resolve, LOADING_DURATION));

                const isTrue = Math.random() < 0.5;
                buttonImage.src = imageCache[isTrue ? 'TRUE' : 'FALSE'];

                isClicked = true;
                isProcessing = false;
            } else {
                buttonImage.src = imageCache['DEFAULT'];
                isClicked = false;
            }

            buttonContainer.style.transform = 'scale(0.95)';
            setTimeout(() => {
                buttonContainer.style.transform = 'scale(1)';
            }, 100);
        });

        buttonContainer.addEventListener('mouseenter', function() {
            if (!isProcessing) {
                buttonContainer.style.transform = 'scale(1.05)';
            }
        });

        buttonContainer.addEventListener('mouseleave', function() {
            if (!isProcessing) {
                buttonContainer.style.transform = 'scale(1)';
            }
        });

        buttonContainer.appendChild(buttonImage);
        document.body.appendChild(buttonContainer);
    });
})();
