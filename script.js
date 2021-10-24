(function () {
    'use strict';
    init();

    function init() {
        let eyesGrid = new EyesGrid();
        let theBox = new TheBox();
        eyesGrid.init();
        theBox.init();
    }


    function TheBox() {
        let boxMan;
        let dragging = false;
        let startX;
        let flashPoint = -40;
        let shaker;

        return {init: init};

        function init() {
            document.addEventListener('DOMContentLoaded', () => {
                boxMan = document.querySelector('.boxman');
                startX = 40;
                window.addEventListener("pointerdown", throttled(handleDrag));
                window.addEventListener("pointermove", throttled(handleDrag));
                window.addEventListener("pointerup", throttled(handleDrag));
                window.addEventListener("touchmove", throttled(handleDrag));
                window.addEventListener("touchend", throttled(handleDrag));
                shaker = new Shaker(document.querySelector('#images'));
            });
        }

        function handleDrag(event) {
            let clientX;
            if (event.type === "pointerdown" && event.target === boxMan) {
                event.preventDefault();
                dragging = event.clientX;
                shaker.start();
            } else if (dragging && (event.type === "pointermove" || event.type === "touchmove")) {
                clientX = event.clientX || event.touches[0].clientX;
                let diff = dragging - clientX;
                let log = Math.log(diff);
                log = log > 0 ? log * -7 : 0;

                if (log < flashPoint) {
                    dragging = null;
                    boxMan.style.transform = null;
                    boxMan.classList.add('flash');
                    shaker.stop();
                } else {
                    boxMan.style.transform = `translateX(${log + startX}px)`;
                    shaker.setShakeAmount((diff ^ 2) / 1000);
                }

            } else if (dragging && (event.type === "pointerup" || event.type === "touchend")) {
                dragging = null;
                boxMan.style.transform = null;
                shaker.stop();
            }
        }

        function Shaker(el) {
            let running = true;
            let amount = 1;
            let prevTimeStamp;
            let index = 0;
            let incs = [
                [ 1,  1,  0],
                [-1, -2, -1],
                [-3,  0,  1],
                [ 3,  2,  0],
                [ 1, -1,  1],
                [-1,  2, -1],
                [-3,  1,  0],
                [ 3,  1, -1],
                [-1, -1,  1],
                [ 1,  2,  0],
                [ 1, -2, -1],
            ];

            return {setShakeAmount: setShakeAmount, stop: stop, start: start};

            function setShakeAmount(n) {
                amount = n;
            }
            function stop() {
                running = false;
                el.style.transform = null;
            }
            function start() {
                running = true;
                window.requestAnimationFrame(step);
            }

            function step(timestamp) {
                if (!running) return;
                if (prevTimeStamp === undefined) {
                    prevTimeStamp = timestamp;
                } else if (timestamp - prevTimeStamp < 10) {
                    return window.requestAnimationFrame(step);
                }

                let inc = incs[index];
                let str = `translate(${amount * inc[0]}px, ${amount * inc[1]}px) rotate(${amount * inc[2]}deg)`;
                el.style.transform = str;
                index = (index + 1 < incs.length) ? index + 1 : 0;
                return window.requestAnimationFrame(step);
            }
        }
    }

    function EyesGrid() {
        const baseObject = document.getElementById("base-eye");
        const grid = document.getElementById("eye-grid");
        let eyes, eyeCenters;
        let eyeDensity = 5;
        let numEyesX, numEyesY;
        const center = new THREE.Vector2();
        const mousePos = new THREE.Vector2();
        const PI = Math.PI;
        let maxDist;
        const maxEyeTravelX = 275;
        const maxEyeTravelY = 100;

        return {init: init};

        function init() {
            window.addEventListener("resize", throttled(handleResize));
            window.addEventListener("mousemove", throttled(handleMouseMove));
            window.addEventListener("touchstart", throttled(handleTouchEvent));
            window.addEventListener("touchmove", throttled(handleTouchEvent));
            handleResize();
        }

        function handleTouchEvent(event) {
            let touch = event.changedTouches[0];
            handleMouseMove(touch);
        }

        function handleMouseMove(event) {
            mousePos.set(event.clientX, event.clientY);
            eyes.forEach((eye, i) => {
                const vecToMouse = new THREE.Vector2().subVectors(mousePos, eyeCenters[i]);
                const angle = vecToMouse.angle();
                const dist = mousePos.distanceTo(eyeCenters[i]);
                const distPercent = map(dist, 0, maxDist, 0, 1);
                const clampedMouseX = clamp(vecToMouse.x, maxEyeTravelX * -1, maxEyeTravelX);
                const clampedMouseY = clamp(vecToMouse.y, maxEyeTravelY * -1, maxEyeTravelY);
                const pupilX = map(clampedMouseX, 0, maxEyeTravelX, 0, maxEyeTravelX);
                const pupilY = map(clampedMouseY, 0, maxEyeTravelY, 0, maxEyeTravelY);
                const scale = map(dist, 0, maxDist, 0.5, 1.25);
                
                eye.style.setProperty("--pupil-x", pupilX);
                eye.style.setProperty("--pupil-y", pupilY);
                eye.style.setProperty("--scale", scale);
            });
        }

        function handleResize() {
            
            // recreate the grid and elements 
            const largeSide = Math.max(innerWidth, innerHeight);
            const size = Math.round(largeSide / eyeDensity);
            numEyesX = Math.ceil(innerWidth / size);
            numEyesY = Math.ceil(innerHeight / size);
            grid.style.setProperty("--num-columns", numEyesX);
            grid.style.setProperty("--num-rows", numEyesY);
            grid.innerHTML = "";
            generateArrowGrid();
            
            center.set(innerWidth * 0.5, innerHeight * 0.5);
            maxDist = center.length() * 2;
            
            // send a fake mouse event to trigger the initial point
            handleMouseMove({clientX: center.x, clientY: center.y});
        }

        function generateArrowGrid() {
            eyes = [];  
            eyeCenters = [];
            for (let i = 0; i < numEyesX * numEyesY; i += 1) {
                
                // add the eye to the grid
                const newArrow = baseObject.cloneNode(true);
                newArrow.id = `eye-${i}`;
                newArrow.setAttribute("class", "eye");
                grid.appendChild(newArrow);
                eyes.push(newArrow);
                
                // save its center point for use later
                const eyeRect = newArrow.getBoundingClientRect();
                const eyeCenter = new THREE.Vector2(
                    eyeRect.left + (newArrow.clientWidth * 0.5),
                    eyeRect.top + (newArrow.clientHeight * 0.5),
                );
                eyeCenters.push(eyeCenter);
            }
        }
    }

    

    // USEFUL FUNCTIONS
    function throttled(fn) {
        let didRequest = false;
        return param => {
            if (!didRequest) {
                requestAnimationFrame(() => {
                    fn(param);
                    didRequest = false;
                });
                didRequest = true;
            }
        };
    }
    function map(value, min1, max1, min2, max2) {
        return (value - min1) * (max2 - min2) / (max1 - min1) + min2;
    }
    function clamp (value, min = 0, max = 1) {
        return value <= min ? min : value >= max ? max : value;
    }
})();