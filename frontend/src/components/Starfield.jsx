import { useEffect, useRef } from "react";

function Starfield() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return undefined;
        }

        const ctx = canvas.getContext("2d");

        if (!ctx) {
            return undefined;
        }

        let width = 0;
        let height = 0;
        let animationFrame = 0;

        const mouse = {
            x: -1000,
            y: -1000,
            active: false
        };

        let stars = [];

        function random(min, max) {
            return (
                Math.random() *
                (max - min) +
                min
            );
        }

        function createStar() {
            return {
                x: random(0, width),
                y: random(0, height),
                radius: random(0.35, 1.3),
                vx: random(-0.07, 0.07),
                vy: random(-0.03, 0.03),
                depth: random(0.4, 1),
                opacity: random(0.25, 0.8),
                phase: random(0, Math.PI * 2),
                speed: random(0.003, 0.015)
            };
        }

        function resize() {
            const dpr =
                window.devicePixelRatio || 1;

            width = window.innerWidth;
            height = window.innerHeight;

            canvas.width =
                width * dpr;

            canvas.height =
                height * dpr;

            canvas.style.width =
                `${width}px`;

            canvas.style.height =
                `${height}px`;

            ctx.setTransform(
                dpr,
                0,
                0,
                dpr,
                0,
                0
            );

            const count =
                Math.min(
                    240,
                    Math.max(
                        90,
                        Math.floor(
                            (width * height) /
                            9000
                        )
                    )
                );

            stars = Array.from(
                { length: count },
                createStar
            );
        }

        function pointerMove(event) {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
            mouse.active = true;
        }

        function pointerLeave() {
            mouse.active = false;
        }

        function animate() {
            ctx.clearRect(
                0,
                0,
                width,
                height
            );

            for (const star of stars) {
                star.phase += star.speed;

                star.x +=
                    star.vx * star.depth;

                star.y +=
                    star.vy * star.depth;

                if (
                    star.x < -3 ||
                    star.x > width + 3
                ) {
                    star.vx *= -1;
                }

                if (
                    star.y < -3 ||
                    star.y > height + 3
                ) {
                    star.vy *= -1;
                }

                const dx =
                    star.x - mouse.x;

                const dy =
                    star.y - mouse.y;

                const distance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );

                if (
                    mouse.active &&
                    distance < 120 &&
                    distance > 0
                ) {
                    const force =
                        Math.pow(
                            (120 - distance) /
                            120,
                            2
                        );

                    star.x +=
                        (dx / distance) *
                        force *
                        2.5;

                    star.y +=
                        (dy / distance) *
                        force *
                        2.5;
                }

                const pulse =
                    (
                        Math.sin(
                            star.phase
                        ) + 1
                    ) / 2;

                const alpha =
                    Math.max(
                        0.12,
                        Math.min(
                            0.9,
                            star.opacity *
                            (
                                0.65 +
                                pulse * 0.4
                            )
                        )
                    );

                ctx.beginPath();

                ctx.arc(
                    star.x,
                    star.y,
                    star.radius,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    `rgba(170, 198, 255, ${alpha})`;

                ctx.fill();

                if (
                    mouse.active &&
                    distance < 55
                ) {
                    ctx.beginPath();

                    ctx.arc(
                        star.x,
                        star.y,
                        star.radius * 2.6,
                        0,
                        Math.PI * 2
                    );

                    ctx.fillStyle =
                        `rgba(120, 145, 255, ${
                            alpha * 0.15
                        })`;

                    ctx.fill();
                }
            }

            if (mouse.active) {
                const glow =
                    ctx.createRadialGradient(
                        mouse.x,
                        mouse.y,
                        0,
                        mouse.x,
                        mouse.y,
                        150
                    );

                glow.addColorStop(
                    0,
                    "rgba(105, 125, 255, 0.045)"
                );

                glow.addColorStop(
                    1,
                    "rgba(105, 125, 255, 0)"
                );

                ctx.fillStyle = glow;

                ctx.beginPath();

                ctx.arc(
                    mouse.x,
                    mouse.y,
                    150,
                    0,
                    Math.PI * 2
                );

                ctx.fill();
            }

            animationFrame =
                requestAnimationFrame(
                    animate
                );
        }

        window.addEventListener(
            "resize",
            resize
        );

        window.addEventListener(
            "pointermove",
            pointerMove,
            { passive: true }
        );

        window.addEventListener(
            "pointerleave",
            pointerLeave
        );

        resize();
        animate();

        return () => {
            cancelAnimationFrame(
                animationFrame
            );

            window.removeEventListener(
                "resize",
                resize
            );

            window.removeEventListener(
                "pointermove",
                pointerMove
            );

            window.removeEventListener(
                "pointerleave",
                pointerLeave
            );
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="starfield-canvas"
            aria-hidden="true"
        />
    );
}

export default Starfield;
