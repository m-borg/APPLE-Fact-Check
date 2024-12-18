// ==UserScript==
// @name         APPLE Fact-Check
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Adds floating fact check and info buttons
// @author       m-borg
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      i.imgur.com
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    window.addEventListener('load', function() {
        const fcOriginalWidth = 649;
        const fcOriginalHeight = 175;
        const fcDesiredWidth = 200;
        const fcScaledHeight = Math.round((fcDesiredWidth * fcOriginalHeight) / fcOriginalWidth);

        const infoDesiredWidth = fcDesiredWidth * 0.4;
        const infoScaledHeight = infoDesiredWidth; 

        const sourceOriginalWidth = 651;
        const sourceOriginalHeight = 759;
        const sourceDesiredWidth = fcDesiredWidth;
        const sourceScaledHeight = Math.round((sourceDesiredWidth * sourceOriginalHeight) / sourceOriginalWidth);

        // Store image URLs
        const IMAGES = {
            DEFAULT: 'https://i.imgur.com/FbUE3Mi.png',
            TRUE: 'https://i.imgur.com/jKQ08BD.png',
            FALSE: 'https://i.imgur.com/BuzVaY3.png',
            LOADING: 'https://i.imgur.com/aJsEYaO.png',
            INFO: 'https://i.imgur.com/levb96n.png',
            INFO_TRUE: 'https://i.imgur.com/6GkGDbO.png',
            SOURCE: 'https://i.imgur.com/NlGOwq9.png',
            SOURCE_TRUE: 'https://i.imgur.com/GKlZ8XE.png'
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
        let isLastResultTrue = false;

        // Preload all images
        Object.entries(IMAGES).forEach(([key, url]) => {
            loadImageAsBase64(url, (base64Data) => {
                imageCache[key] = base64Data;
                if (key === 'DEFAULT') {
                    factCheckImage.src = base64Data;
                }
            });
        });

        const style = document.createElement('style');
        style.textContent = `
            .floating-button-container {
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                z-index: 2147483647 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 10px !important;
                align-items: flex-end !important;
            }

            .fact-check-container, .info-container {
                cursor: pointer !important;
                position: relative !important;
                overflow: hidden !important;
                background: transparent !important;
                transition: all 0.3s ease !important;
                transform-origin: center !important;
            }

            .fact-check-container {
                width: ${fcDesiredWidth}px !important;
                height: ${fcScaledHeight}px !important;
                border-radius: 15px !important;
            }

            .info-container {
                width: ${infoDesiredWidth}px !important;
                height: ${infoScaledHeight}px !important;
                border-radius: 50% !important;
                opacity: 0 !important;
                transform: translateY(20px) !important;
            }

            .info-container.visible {
                opacity: 1 !important;
                transform: translateY(0) !important;
            }

            .info-container.source-mode {
                width: ${sourceDesiredWidth}px !important;
                height: ${sourceScaledHeight}px !important;
                border-radius: 15px !important;
            }

            .button-image {
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

        // Create main container
        const floatingContainer = document.createElement('div');
        floatingContainer.className = 'floating-button-container';

        // Create INFO button
        const infoContainer = document.createElement('div');
        infoContainer.className = 'info-container';
        const infoImage = document.createElement('img');
        infoImage.className = 'button-image';

        // Create FACT CHECK button
        const factCheckContainer = document.createElement('div');
        factCheckContainer.className = 'fact-check-container';
        const factCheckImage = document.createElement('img');
        factCheckImage.className = 'button-image';

        let isProcessing = false;
        let isClicked = false;
        let isInfoClicked = false;

        // INFO button click handler
        infoContainer.addEventListener('click', function() {
            isInfoClicked = !isInfoClicked;
            infoContainer.classList.toggle('source-mode');

            requestAnimationFrame(() => {
                if (isInfoClicked) {
                    infoImage.src = imageCache[isLastResultTrue ? 'SOURCE_TRUE' : 'SOURCE'];
                } else {
                    infoImage.src = imageCache[isLastResultTrue ? 'INFO_TRUE' : 'INFO'];
                }
            });
        });

        // FACT CHECK button click handler
        factCheckContainer.addEventListener('click', async function() {
            if (isProcessing) return;

            if (!isClicked) {
                isProcessing = true;
                factCheckImage.src = imageCache['LOADING'];

                await new Promise(resolve => setTimeout(resolve, LOADING_DURATION));

                const isTrue = Math.random() < 0.5;
                isLastResultTrue = isTrue;
                factCheckImage.src = imageCache[isTrue ? 'TRUE' : 'FALSE'];

                isClicked = true;
                isProcessing = false;

                setTimeout(() => {
                    infoContainer.classList.add('visible');
                    infoImage.src = imageCache[isTrue ? 'INFO_TRUE' : 'INFO'];
                }, 300);
            } else {
                factCheckImage.src = imageCache['DEFAULT'];
                isClicked = false;

                infoContainer.classList.remove('visible');
                if (isInfoClicked) {
                    isInfoClicked = false;
                    infoContainer.classList.remove('source-mode');
                }
            }

            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 100);
        });

         // Scale animation on hover
        [infoContainer, factCheckContainer].forEach(container => {
            container.addEventListener('mouseenter', function() {
                if (!isProcessing) {
                    this.style.transform = 'scale(1.05)';
                }
            });

            container.addEventListener('mouseleave', function() {
                if (!isProcessing) {
                    this.style.transform = 'scale(1)';
                }
            });
        });

        // Append elements
        infoContainer.appendChild(infoImage);
        factCheckContainer.appendChild(factCheckImage);
        floatingContainer.appendChild(infoContainer);
        floatingContainer.appendChild(factCheckContainer);
        document.body.appendChild(floatingContainer);
    });
})();
