// ==UserScript==
// @name         APPLE Fact-Check
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Adds floating fact check and info buttons
// @author       m-borg
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      i.imgur.com
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    window.addEventListener('load', function () {
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

        function loadImageAsBase64(url, callback) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                onload: function (response) {
                    const reader = new FileReader();
                    reader.onloadend = function () {
                        callback(reader.result);
                    };
                    reader.readAsDataURL(response.response);
                }
            });
        }

        const imageCache = {};
        let isLastResultTrue = false;

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
            @keyframes hoverGlow {
                0% { box-shadow: 0 0 0 rgba(0, 0, 0, 0.2); }
                100% { box-shadow: 0 0 15px var(--glow-color); }
            }

            :root {
                --glow-color: rgba(255, 69, 58, 0.6); /* Default Red Glow */
            }

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
                transition: transform 0.3s ease, box-shadow 0.3s ease !important;
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
                transition: opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease !important;
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
                position: relative !important;
                display: block !important;
                background: transparent !important;
            }

            .fact-check-container:hover, .info-container:hover {
                transform: scale(1.05) !important;
                animation: hoverGlow 0.3s forwards !important;
            }

            .true-state {
                --glow-color: rgba(50, 205, 50, 0.6); /* Green */
            }

            .false-state {
                --glow-color: rgba(255, 69, 58, 0.6); /* Red */
            }

            .loading-state {
                --glow-color: rgba(255, 255, 255, 0.6); /* White */
            }
        `;
        document.head.appendChild(style);

        const floatingContainer = document.createElement('div');
        floatingContainer.className = 'floating-button-container';

        const infoContainer = document.createElement('div');
        infoContainer.className = 'info-container false-state';
        const infoImage = document.createElement('img');
        infoImage.className = 'button-image';

        const factCheckContainer = document.createElement('div');
        factCheckContainer.className = 'fact-check-container false-state';
        const factCheckImage = document.createElement('img');
        factCheckImage.className = 'button-image';

        let isProcessing = false;
        let isClicked = false;
        let isInfoClicked = false;

        infoContainer.addEventListener('click', function () {
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

        factCheckContainer.addEventListener('click', async function () {
            if (isProcessing) return;

            if (!isClicked) {
                isProcessing = true;
                factCheckImage.src = imageCache['LOADING'];
                factCheckContainer.className = 'fact-check-container loading-state';

                await new Promise(resolve => setTimeout(resolve, LOADING_DURATION));

                const isTrue = Math.random() < 0.5;
                isLastResultTrue = isTrue;
                factCheckImage.src = imageCache[isTrue ? 'TRUE' : 'FALSE'];
                factCheckContainer.className = `fact-check-container ${isTrue ? 'true-state' : 'false-state'}`;

                isClicked = true;
                isProcessing = false;

                setTimeout(() => {
                    infoContainer.classList.add('visible');
                    infoImage.src = imageCache[isTrue ? 'INFO_TRUE' : 'INFO'];
                    infoContainer.className = `info-container visible ${isTrue ? 'true-state' : 'false-state'}`;
                }, 300);
            } else {
                factCheckImage.src = imageCache['DEFAULT'];
                factCheckContainer.className = 'fact-check-container false-state';
                isClicked = false;

                infoContainer.className = 'info-container false-state';
                infoContainer.classList.remove('visible', 'source-mode');
            }
        });

        infoContainer.appendChild(infoImage);
        factCheckContainer.appendChild(factCheckImage);
        floatingContainer.appendChild(infoContainer);
        floatingContainer.appendChild(factCheckContainer);
        document.body.appendChild(floatingContainer);
    });
})();
