import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

const BASE = '/';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const el = (tag, cls) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
};

let noiseURL = null;
function getNoiseURL() {
  if (noiseURL) return noiseURL;
  const c = el("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const img = x.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  noiseURL = c.toDataURL();
  return noiseURL;
}

const fixLayer = (node, z) => {
  Object.assign(node.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: String(z),
    display: "block",
    overflow: "hidden",
  });
  document.documentElement.appendChild(node);
  return node;
};

const BLUR_DURATION = 79245;

function Effect1Blur({ onComplete }) {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timers = new Set();
    let stopped = false;

    const later = (fn, ms) => {
      const t = setTimeout(() => {
        timers.delete(t);
        if (!stopped) fn();
      }, ms);
      timers.add(t);
      return t;
    };

    // фон из 5-го эффекта — лежит под слоями первого эффекта
    const bgRoot = fixLayer(el("div"), 1);
    bgRoot.style.background = "#050814";

    const bgImage = `url("${BASE}image/background.jpg")`;
    const bgBase = el("div");
    Object.assign(bgBase.style, {
      position: "absolute",
      inset: "-2%",
      backgroundImage: bgImage,
      backgroundPosition: "center",
      backgroundSize: "cover",
      filter: "saturate(2.2) contrast(1.35) brightness(1.08)",
      transform: "scale(1.04)",
    });
    bgRoot.appendChild(bgBase);

    const bgTint = el("div");
    Object.assign(bgTint.style, {
      position: "absolute",
      inset: 0,
      background:
        "linear-gradient(180deg,rgba(0,210,255,.3),rgba(18,0,110,.2) 48%,rgba(0,245,120,.36))",
      mixBlendMode: "color",
    });
    bgRoot.appendChild(bgTint);

    const bgBands = Array.from({ length: 16 }, () => {
      const band = el("div");
      Object.assign(band.style, {
        position: "absolute",
        inset: "0 -8%",
        zIndex: "3",
        backgroundImage: bgImage,
        backgroundPosition: "center",
        backgroundSize: "cover",
        pointerEvents: "none",
        willChange: "clip-path, transform, filter, opacity",
      });
      bgRoot.appendChild(band);
      return band;
    });

    const bgNoise = el("div");
    Object.assign(bgNoise.style, {
      position: "absolute",
      inset: 0,
      backgroundImage: `url("${getNoiseURL()}")`,
      backgroundSize: "128px 128px",
      mixBlendMode: "screen",
      opacity: ".18",
      pointerEvents: "none",
    });
    bgRoot.appendChild(bgNoise);

    const bgScan = el("div");
    Object.assign(bgScan.style, {
      position: "absolute",
      inset: 0,
      background:
        "repeating-linear-gradient(0deg,rgba(0,0,0,.24) 0 1px,transparent 1px 3px)",
      mixBlendMode: "multiply",
      pointerEvents: "none",
    });
    bgRoot.appendChild(bgScan);

    const bgFlare = el("div");
    Object.assign(bgFlare.style, {
      position: "absolute",
      inset: 0,
      background:
        "radial-gradient(ellipse at 48% 44%,rgba(255,255,255,.9),rgba(190,255,255,.3) 22%,transparent 54%)",
      opacity: "0",
      mixBlendMode: "screen",
      transition: "opacity 45ms steps(2,end)",
      pointerEvents: "none",
    });
    bgRoot.appendChild(bgFlare);

    let bgHue = 0;
    const updateBgBands = () => {
      const active = 5 + Math.floor(Math.random() * 10);
      bgBands.forEach((band, index) => {
        if (index >= active) {
          band.style.opacity = "0";
          return;
        }
        const top = Math.random() * 96;
        const height = 1.5 + Math.random() * 15;
        const shift = (Math.random() - 0.5) * 18;
        const hue = [165, 185, 205, 285, 330][Math.floor(Math.random() * 5)];
        band.style.clipPath = `inset(${top}% 0 ${Math.max(0, 100 - top - height)}% 0)`;
        band.style.transform = `translateX(${shift}vw) scaleY(${0.9 + Math.random() * 0.25})`;
        band.style.filter = `hue-rotate(${hue}deg) saturate(3.5) contrast(1.7) brightness(${1.2 + Math.random() * 1.5})`;
        band.style.opacity = String(0.18 + Math.random() * 0.42);
        band.style.mixBlendMode = Math.random() > 0.5 ? "screen" : "normal";
      });
      bgFlare.style.opacity =
        Math.random() > 0.9 ? String(0.18 + Math.random() * 0.45) : "0";
      bgTint.style.filter = `hue-rotate(${Math.random() * 36 - 18}deg)`;
      bgHue = (bgHue + 7) % 360;
      bgBase.style.filter = `hue-rotate(${bgHue}deg) saturate(2.2) contrast(1.35) brightness(1.08)`;
    };
    updateBgBands();
    const bgTimer = setInterval(updateBgBands, 90);
    const blurElement = fixLayer(el("div", "blur-effect"), 10);
    Object.assign(blurElement.style, { width: "200vw", height: "200vh" });

    const squaresContainer = fixLayer(el("div", ""), 15);

    const scan = fixLayer(el("div", ""), 30);
    scan.style.background =
      "repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0,rgba(0,0,0,.28) 1px,transparent 1px,transparent 3px)";

    const grain = fixLayer(el("div", ""), 31);
    Object.assign(grain.style, { opacity: ".12", mixBlendMode: "overlay" });
    grain.style.backgroundImage = `url(${getNoiseURL()})`;

    const invert = fixLayer(el("div", ""), 35);
    Object.assign(invert.style, {
      background: "#fff",
      mixBlendMode: "difference",
      opacity: "0",
    });

    const flicker = fixLayer(el("div", ""), 36);
    Object.assign(flicker.style, {
      background: "#fff",
      mixBlendMode: "overlay",
      opacity: "0",
      transition: "opacity 40ms linear",
    });

    document.body.classList.add("fx-melt");

    const createSquare = () => {
      const sq = el("div");
      const size = Math.random() * 250 + 200;
      Object.assign(sq.style, {
        position: "absolute",
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: `rgba(${(Math.random() * 255) | 0}, ${(Math.random() * 255) | 0}, ${(Math.random() * 255) | 0}, 0.5)`,
        top: `${Math.random() * Math.max(0, window.innerHeight - size)}px`,
        left: `${Math.random() * Math.max(0, window.innerWidth - size)}px`,
        mixBlendMode: pick([
          "normal",
          "screen",
          "difference",
          "exclusion",
          "overlay",
        ]),
      });
      squaresContainer.appendChild(sq);
      later(() => sq.remove(), Math.random() * 300 + 200);
    };

    let isDarkening = false;
    let ox = 0,
      oy = 0,
      rot = 0,
      zoom = 1,
      lastHit = 0;
    const T0 = performance.now();
    const shakeSpeed = 50;

    const hit = () => {
      zoom = 1.09;
      if (!REDUCED) {
        invert.style.opacity = "1";
        later(() => {
          invert.style.opacity = "0";
        }, 55);
      }
      for (let i = 0; i < 6; i++) createSquare();
    };

    const tick = setInterval(() => {
      if (stopped) return;
      const now = performance.now();
      const p = clamp((now - T0) / BLUR_DURATION, 0, 1);
      const maxShake = (REDUCED ? 6 : 45) * (1 + p * 1.4);

      const randomBlur = (Math.random() * 6 + 5) * (1 + p * 1.0);
      blurElement.style.filter = `blur(${randomBlur.toFixed(2)}px) saturate(${(1 + Math.random() * 0.8).toFixed(2)}) hue-rotate(${rand(-15, 15).toFixed(1)}deg)`;
      if (Math.random() < 0.15)
        blurElement.style.backgroundColor = `hsla(${rand(0, 360) | 0}, 100%, 50%, 0.45)`;

      if (!isDarkening && Math.random() < 0.2) {
        isDarkening = true;
        document.body.style.transition = "background-color 2s ease-in-out";
        document.body.style.backgroundColor = "rgba(0, 0, 0, 0.95)";
        later(() => {
          document.body.style.transition = "background-color 0.5s ease-in-out";
          document.body.style.backgroundColor = "";
          isDarkening = false;
        }, 4000);
      }

      const squareCount = 1 + Math.floor(p * 4);
      for (let i = 0; i < squareCount; i++) createSquare();

      if (!REDUCED && Math.random() < 0.12) {
        ox += rand(-80, 80);
        oy += rand(-80, 80);
      }
      ox = ox * 0.9 + (Math.random() * maxShake * 2 - maxShake) * 0.22;
      oy = oy * 0.9 + (Math.random() * maxShake * 2 - maxShake) * 0.22;
      rot = rot * 0.88 + (Math.random() - 0.5) * 0.5 * p;
      zoom = 1 + (zoom - 1) * 0.82;

      const tr = `translate(calc(-50% + ${ox.toFixed(1)}px), calc(-50% + ${oy.toFixed(1)}px))`;
      blurElement.style.transform = tr;
      squaresContainer.style.transform = tr;

      if (!REDUCED)
        document.body.style.transform = `translate(${(ox * 0.3).toFixed(1)}px, ${(oy * 0.3).toFixed(1)}px) scale(${zoom.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;

      scan.style.opacity = String(0.35 + Math.random() * 0.55);
      grain.style.backgroundPosition = `${(Math.random() * 128) | 0}px ${(Math.random() * 128) | 0}px`;

      if (!REDUCED && Math.random() < 0.1)
        flicker.style.opacity = String(rand(0.05, 0.35));
      else flicker.style.opacity = "0";

      if (!REDUCED && now - lastHit >= 400) {
        lastHit = now;
        hit();
      }
    }, shakeSpeed);

    document.documentElement.style.overflow = "hidden";
    later(() => {
      if (!stopped) onCompleteRef.current?.();
    }, BLUR_DURATION);

    return () => {
      stopped = true;
      clearInterval(tick);
      timers.forEach(clearTimeout);
      document.body.classList.remove("fx-melt");
      document.body.style.transform = "";
      document.body.style.backgroundColor = "";
      document.body.style.transition = "";
      document.documentElement.style.overflow = "";
      blurElement.remove();
      squaresContainer.remove();
      scan.remove();
      grain.remove();
      invert.remove();
      flicker.remove();
      clearInterval(bgTimer);
      bgRoot.remove();
    };
  }, []);

  return null;
}


const audioFiles = [
  `${BASE}audio/2.mp3`,
  `${BASE}audio/2a.mp3`,
  `${BASE}audio/2b.mp3`,
  `${BASE}audio/2c.mp3`,
  `${BASE}audio/2d.mp3`,
  `${BASE}audio/2e.mp3`,
  `${BASE}audio/2f.mp3`,
  `${BASE}audio/2g.mp3`,
];

const randomPhrases = [
  "Life is pain...",
  "I'm lost in the darkness.",
  "No one understands me.",
  "The world is meaningless.",
  "Escape is the only way out.",
  "Why bother trying?",
  "Alone in this world.",
  "There's no light at the end of the tunnel.",
  "Everything fades away.",
  "I don't belong here.",
  "Nothing really matters anymore.",
  "Silence is my only friend.",
  "I'm just a shadow.",
  "Every step feels heavier.",
  "No one would notice if I disappeared.",
  "The stars don't shine for me.",
  "Drowning in my own thoughts.",
  "Happiness is just an illusion.",
  "Everything I touch turns to dust.",
  "I'm screaming, but no one hears.",
  "My heart is as empty as my soul.",
  "The echoes of my past haunt me.",
  "Dreams crumble into nightmares.",
  "I wear a mask so no one sees the pain.",
  "Hope is a lie we tell ourselves.",
  "The cold embraces me like an old friend.",
  "I've forgotten how to feel anything.",
  "Every smile I force feels like a lie.",
  "I'm a ghost trapped in a body.",
  "Time drags on, but nothing changes.",
  "Love is just another way to suffer.",
  "I've given up on finding peace.",
  "I'm a stranger in my own life.",
  "All roads lead to the same emptiness.",
  "Memories hurt more than reality.",
  "Nothing I do ever matters.",
  "My thoughts are a prison I can't escape.",
  "I've lost myself somewhere along the way.",
  "Even my shadow leaves me in the dark.",
  "The weight of existence is unbearable.",
  "No one is coming to save me.",
  "The more I reach out, the further I fall.",
  "I'm nothing more than a passing whisper.",
  "The darkness is the only thing that's real.",
  "Even the sun feels cold to me.",
  "My reflection doesn't recognize me.",
  "I drift through life like a forgotten melody.",
  "I no longer believe in happy endings.",
  "All I see are broken dreams and empty promises.",
  "The wind carries my whispers into the void.",
  "Even silence feels too loud.",
  "My mind is a battlefield I can't win.",
  "No matter how much I sleep, I wake up exhausted.",
  "I wish I could just disappear forever.",
  "Every second feels like a lifetime of suffering.",
  "I don't even know who I am anymore.",
  "The pain never fades, it just changes shape.",
  "I fake a smile so no one asks questions.",
  "Some wounds never heal, they just stay hidden.",
  "I don't feel alive, just less dead.",
  "It's exhausting pretending I'm okay.",
  "The walls are closing in, and I don't care anymore.",
  "I keep waiting for something to change, but it never does.",
  "I'm just waiting for the day I finally let go.",
  "I'm tired of fighting a war I can't win.",
  "No one sees the storm inside me.",
  "I whisper for help, but the world is deaf.",
  "If I disappeared, how long would it take for anyone to notice?",
  "I don't belong anywhere, not even in my own skin.",
  "Every breath feels like a burden.",
  "I wake up hoping I won't.",
  "Nothing is ever enough to fill the void.",
  "Even my dreams are empty.",
  "I feel like a mistake that shouldn't exist.",
  "The deeper I go, the harder it is to climb back up.",
  "It's not that I want to die, I just don't want to be here.",
  "I feel like a ghost pretending to be human.",
  "My own thoughts are my worst enemy.",
  "The weight of the past crushes me every day.",
  "I wish I could restart, or just stop.",
  "No matter how much I scream inside, no one hears.",
  "The world keeps moving, but I'm stuck in place.",
  "Nothing feels real anymore, not even me.",
  "I laugh so people don't see me breaking inside.",
  "I'm just running out of reasons to keep going.",
  "I keep thinking 'what's the point?'",
  "The pain is the only thing that reminds me I'm still here.",
  "Some days I wonder if I was meant to exist at all.",
  "I don't cry anymore. Even that takes too much energy.",
  "People say it gets better, but they don't know how deep the hole is.",
  "I'm just an empty shell, waiting to crack.",
  "Every goodbye feels like it should be the last.",
  "I wish I could tell someone, but the words never come.",
  "I'm drowning in my own mind, and no one sees it.",
  "Even the things I once loved feel hollow now.",
  "I keep waiting for the pain to stop, but it never does.",
  "It feels like I'm screaming into an empty world.",
  "I've been strong for too long, and I have nothing left.",
  "It's not that I don't care anymore. It's that I don't feel anything at all.",
  "Made of rotten flesh, every part of me decays.",
  "Pills work... for a moment. But nothing lasts forever.",
];

function Effect2Flash({ onComplete }) {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const audio = new Audio(pick(audioFiles));
    audio.volume = 1;
    audio.play().catch(console.error);

    const interval = setInterval(() => {
      const flash = el("div", "flash");

      const size = 40;
      const rows = Math.ceil(window.innerHeight / size);
      const cols = Math.ceil(window.innerWidth / size);

      const canvasFlash = document.createElement("canvas");
      canvasFlash.width = window.innerWidth;
      canvasFlash.height = window.innerHeight;
      const ctxFlash = canvasFlash.getContext("2d");

      const colors = [
        "#00ff00",
        "#800080",
        "#ff00ff",
        "#ff0000",
        "#000000",
        "#00ffff",
        "#ffffff",
      ];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * size;
          const y = row * size;
          const color = colors[Math.floor(Math.random() * colors.length)];
          ctxFlash.fillStyle = color;
          ctxFlash.fillRect(x, y, size, size);
        }
      }

      flash.style.backgroundImage = `url(${canvasFlash.toDataURL()})`;
      flash.style.animation = "flashAnimation 0.2s linear";
      flash.style.transform = `translate(${Math.random() * 40 - 20}px, ${Math.random() * 40 - 20}px)`;

      document.body.appendChild(flash);

      const addText = () => {
        const txt = el("div", "flash-text");
        txt.textContent = pick(randomPhrases);
        Object.assign(txt.style, {
          position: "absolute",
          color: "white",
          fontFamily: "'Times New Roman', sans-serif",
          fontSize: `${30 + Math.random() * 40}px`,
          fontWeight: "bold",
          backgroundColor: `rgba(0, 0, 0, ${0.5 + Math.random() * 0.4})`,
          padding: "10px 20px",
          borderRadius: "5px",
          pointerEvents: "none",
          zIndex: "999",
          textShadow: `${Math.random() * 10 - 5}px 0 #ff0040, ${Math.random() * 10 - 5}px 0 #00ffff`,
          transform: `rotate(${Math.random() * 20 - 10}deg)`,
          top: `${Math.random() * (window.innerHeight - 100)}px`,
          left: `${Math.random() * (window.innerWidth - 400)}px`,
        });
        document.body.appendChild(txt);
        setTimeout(() => txt.remove(), 300);
      };

      addText();
      if (Math.random() < 0.5) addText();

      const cleanup = () => {
        if (flash.parentNode) flash.remove();
      };
      flash.addEventListener("animationend", cleanup);
      setTimeout(cleanup, 400);
    }, 75);

    const finish = () => {
      clearInterval(interval);
      onCompleteRef.current?.();
    };
    audio.addEventListener("ended", finish);
    audio.addEventListener("error", finish);

    return () => {
      clearInterval(interval);
      audio.removeEventListener("ended", finish);
      audio.removeEventListener("error", finish);
      audio.pause();
      document
        .querySelectorAll(".flash, .flash-text")
        .forEach((n) => n.remove());
    };
  }, []);

  return null;
}

function Effect3Shapes({ onComplete, audio3Ref }) {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    fixLayer(canvas, 3);
    const ctx = canvas.getContext("2d");
    const fit = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    fit();
    window.addEventListener("resize", fit);

    const rainbow = fixLayer(document.createElement("div"), 2);
    const flashOverlay = fixLayer(document.createElement("div"), 4);
    Object.assign(flashOverlay.style, {
      background: "#fff",
      mixBlendMode: "overlay",
      opacity: "0",
      transition: "opacity 40ms linear",
    });

    let stopped = false;
    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => {
        timers.delete(t);
        if (!stopped) fn();
      }, ms);
      timers.add(t);
    };

    const flashTick = setInterval(() => {
      if (REDUCED || stopped) return;
      if (Math.random() < 0.18) {
        flashOverlay.style.opacity = String(rand(0.1, 0.5).toFixed(2));
        later(
          () => {
            flashOverlay.style.opacity = "0";
          },
          rand(40, 120),
        );
      }
    }, 200);

    const jitter = () => {
      if (REDUCED || stopped) return;
      canvas.style.transform = `translate(calc(-50% + ${rand(-8, 8) | 0}px), calc(-50% + ${rand(-8, 8) | 0}px))`;
      later(
        () => {
          canvas.style.transform = "translate(-50%, -50%)";
        },
        rand(50, 200),
      );
      later(jitter, rand(400, 1800));
    };
    later(jitter, rand(400, 1200));

    const changeBg = () => {
      const t = audio3Ref.current ? audio3Ref.current.currentTime : 0;
      const changeTime =
        t < 25 ? Math.random() * 1000 + 1500 : Math.random() * 400 + 500;
      later(() => {
        rainbow.style.backgroundColor = `hsla(${rand(0, 360) | 0}, 100%, 50%, 1)`;
        later(() => {
          rainbow.style.backgroundColor = "";
        }, 150);
        changeBg();
      }, changeTime);
    };
    changeBg();

    let rafId = 0;
    let last = 0;
    const loop = (now) => {
      if (stopped) return;
      rafId = requestAnimationFrame(loop);

      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";

      const t = audio3Ref.current ? audio3Ref.current.currentTime : 0;
      let period = t < 16 ? 200 : t < 25 ? 120 : 95;
      if (REDUCED) period *= 2;
      if (now - last >= period) {
        last = now;
        const count = t < 16 ? 4 : t < 25 ? 6 : 9;
        const types =
          t < 16
            ? ["square", "circle", "triangle"]
            : t < 25
              ? ["square", "circle", "triangle", "star", "ring"]
              : ["square", "circle", "triangle", "star", "ring", "line"];
        ctx.globalCompositeOperation = t >= 25 ? "lighter" : "source-over";
        for (let i = 0; i < count; i++) {
          const size = 150 + Math.random() * 500;
          const x = Math.random() * Math.max(1, canvas.width - size);
          const y = Math.random() * Math.max(1, canvas.height - size);
          const angle = Math.random() * 360;
          const color = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`;
          const type = pick(types);

          ctx.save();
          ctx.translate(x + size / 2, y + size / 2);
          ctx.rotate((angle * Math.PI) / 180);
          ctx.fillStyle = color;
          ctx.strokeStyle = color;
          ctx.beginPath();
          if (type === "square") {
            ctx.rect(-size / 2, -size / 2, size, size);
            ctx.fill();
          } else if (type === "circle") {
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (type === "triangle") {
            ctx.moveTo(-size / 2, size / 2);
            ctx.lineTo(0, -size / 2);
            ctx.lineTo(size / 2, size / 2);
            ctx.closePath();
            ctx.fill();
          } else if (type === "star") {
            for (let j = 0; j < 10; j++) {
              const r = j % 2 ? size * 0.22 : size * 0.5;
              const a = (j * Math.PI) / 5 - Math.PI / 2;
              ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
          } else if (type === "ring") {
            ctx.lineWidth = size * 0.08;
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            ctx.stroke();
          } else if (type === "line") {
            ctx.lineWidth = Math.max(4, size * 0.03);
            ctx.moveTo(-size * 1.2, 0);
            ctx.lineTo(size * 1.2, 0);
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.globalCompositeOperation = "source-over";
      }
    };
    rafId = requestAnimationFrame(loop);

    const finish = () => {
      if (stopped) return;
      stopped = true;
      onCompleteRef.current?.();
    };
    if (audio3Ref.current) {
      audio3Ref.current.currentTime = 0;
      audio3Ref.current.addEventListener("ended", finish);
      audio3Ref.current.addEventListener("error", finish);
      audio3Ref.current.play().catch((err) => {
        console.error(err);
        finish();
      });
    }

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      clearInterval(flashTick);
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", fit);
      if (audio3Ref.current) {
        audio3Ref.current.pause();
        audio3Ref.current.removeEventListener("ended", finish);
        audio3Ref.current.removeEventListener("error", finish);
      }
      canvas.remove();
      rainbow.remove();
      flashOverlay.remove();
    };
  }, [audio3Ref]);

  return null;
}

function makeCrack(x, y) {
  const segs = [];
  const rays = rand(6, 10) | 0;
  for (let r = 0; r < rays; r++) {
    let px = x,
      py = y,
      ang = rand(0, Math.PI * 2);
    const steps = rand(6, 12) | 0;
    for (let k = 0; k < steps; k++) {
      const len = rand(20, 70);
      ang += rand(-0.5, 0.5);
      const nx = px + Math.cos(ang) * len;
      const ny = py + Math.sin(ang) * len;
      segs.push([px, py, nx, ny]);
      if (Math.random() < 0.25) {
        const a2 = ang + rand(-1, 1);
        segs.push([
          nx,
          ny,
          nx + Math.cos(a2) * len * 0.8,
          ny + Math.sin(a2) * len * 0.8,
        ]);
      }
      px = nx;
      py = ny;
    }
  }
  segs.sort(
    (a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y),
  );
  return segs;
}

function tracePoly(c, cx, cy, r, sides, rot) {
  c.beginPath();
  for (let k = 0; k < sides; k++) {
    const a = rot + (k / sides) * Math.PI * 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (k === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
}

function Effect4Vortex({ onComplete }) {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const cv = document.createElement("canvas");
    fixLayer(cv, 40);
    cv.style.background = "#000";
    const c = cv.getContext("2d");
    const fit = () => {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
    };
    fit();
    window.addEventListener("resize", fit);

    const flashOverlay = fixLayer(document.createElement("div"), 45);
    Object.assign(flashOverlay.style, {
      background: "#fff",
      mixBlendMode: "overlay",
      opacity: "0",
    });

    let stopped = false;
    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => {
        timers.delete(t);
        if (!stopped) fn();
      }, ms);
      timers.add(t);
    };

    const flickerTick = setInterval(() => {
      if (REDUCED || stopped) return;
      if (Math.random() < 0.4) {
        flashOverlay.style.opacity = String(rand(0.05, 0.4).toFixed(2));
        later(
          () => {
            flashOverlay.style.opacity = "0";
          },
          rand(30, 100),
        );
      }
    }, 180);

    const audio = new Audio(`${BASE}audio/4.mp3`);
    audio.volume = 1;
    const t0 = performance.now();
    const progress = () => {
      const d = audio.duration;
      return isFinite(d) && d > 0
        ? clamp(audio.currentTime / d, 0, 1)
        : clamp((performance.now() - t0) / 20000, 0, 1);
    };

    const RINGS = 28;
    const depth = Array.from({ length: RINGS }, (_, i) => i / RINGS);
    const streaks = Array.from({ length: 70 }, () => ({
      a: rand(0, Math.PI * 2),
      d: Math.random(),
      v: rand(0.6, 1.6),
    }));
    const waves = [];
    const cracks = [];
    let shake = 0,
      last = null,
      time = 0,
      nextWave = 0;

    const spawnWave = (now) => {
      if (waves.length >= 3) return;
      const x = rand(0.15, 0.85) * cv.width;
      const y = rand(0.15, 0.85) * cv.height;
      waves.push({ x, y, t0: now });
      cracks.push({ t0: now, segs: makeCrack(x, y) });
      shake = 1;
    };

    let rafId = 0;
    const loop = (now) => {
      if (stopped) return;
      rafId = requestAnimationFrame(loop);
      if (last === null) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;

      const p = progress();
      const w = cv.width,
        h = cv.height;
      const maxR = Math.hypot(w, h) * 0.62;

      if (now >= nextWave) {
        spawnWave(now);
        nextWave = now + (1000 - p * 550);
      }

      c.globalCompositeOperation = "source-over";
      c.fillStyle = `rgba(0, 0, 0, ${(0.28 - p * 0.12).toFixed(2)})`;
      c.fillRect(0, 0, w, h);

      c.globalCompositeOperation = "lighter";
      const cx = w / 2 + Math.sin(time * 1.7) * w * 0.04 * (0.4 + p);
      const cy = h / 2 + Math.cos(time * 1.3) * h * 0.04 * (0.4 + p);
      const speed = 0.28 + p * 0.9;
      const split = (REDUCED ? 2 : 4) + p * 14 + shake * 10;
      const twist = 1.2 + p * 3.2;
      const sides = p < 0.35 ? 6 : p < 0.7 ? 4 : 3;

      c.lineCap = "round";
      for (const l of streaks) {
        l.d += dt * l.v * (0.3 + p * 1.3);
        if (l.d > 1) {
          l.d = 0;
          l.a = rand(0, Math.PI * 2);
        }
        const r1 = maxR * l.d * l.d;
        const r2 =
          maxR * Math.pow(Math.min(1, l.d + 0.07 * l.v * (0.5 + p)), 2);
        c.strokeStyle = `hsla(${120 + l.d * 40}, 100%, 70%, ${(0.15 + l.d * 0.5).toFixed(2)})`;
        c.lineWidth = 1 + l.d * 2;
        c.beginPath();
        c.moveTo(cx + Math.cos(l.a) * r1, cy + Math.sin(l.a) * r1);
        c.lineTo(cx + Math.cos(l.a) * r2, cy + Math.sin(l.a) * r2);
        c.stroke();
      }

      for (let i = 0; i < RINGS; i++) {
        depth[i] = (depth[i] + dt * speed) % 1;
        const d = depth[i];
        const r = maxR * Math.pow(d, 2.2) + 2;
        const rot = time * (i % 2 ? 0.6 : -0.6) * (1 + p) + d * twist * Math.PI;
        const a = Math.min(1, d * 6) * (d > 0.92 ? (1 - d) / 0.08 : 1);
        const hue = 120 + d * 165 + p * 30;
        c.lineWidth = (3 + d * 10) * 3;
        c.strokeStyle = `hsla(${hue}, 100%, 50%, ${(a * 0.12).toFixed(3)})`;
        tracePoly(c, cx, cy, r, sides, rot);
        c.stroke();
        c.lineWidth = 2 + d * 6;
        c.strokeStyle = `hsla(${hue}, 100%, 60%, ${(a * 0.9).toFixed(3)})`;
        tracePoly(c, cx + split * d, cy, r, sides, rot);
        c.stroke();
        c.strokeStyle = `hsla(${hue + 150}, 100%, 60%, ${(a * 0.7).toFixed(3)})`;
        tracePoly(c, cx - split * d, cy, r, sides, rot);
        c.stroke();
      }

      for (let i = waves.length - 1; i >= 0; i--) {
        const wv = waves[i];
        const q = (now - wv.t0) / 1500;
        if (q >= 1) {
          waves.splice(i, 1);
          continue;
        }
        const e = 1 - Math.pow(1 - q, 2);
        const rad = (150 + 600 * e) / 2;
        c.shadowColor = "rgba(0, 255, 0, 0.8)";
        c.shadowBlur = 30;
        c.lineWidth = 10 * (1 - q * 0.5);
        c.strokeStyle = `rgba(0, 255, 0, ${(0.9 * (1 - q * q)).toFixed(3)})`;
        c.beginPath();
        c.arc(wv.x, wv.y, rad, 0, Math.PI * 2);
        c.stroke();
        c.shadowColor = "rgba(160, 0, 255, 0.8)";
        c.lineWidth = 6 * (1 - q * 0.5);
        c.strokeStyle = `rgba(160, 0, 255, ${(0.8 * (1 - q * q)).toFixed(3)})`;
        c.beginPath();
        c.arc(wv.x, wv.y, rad * 0.62, 0, Math.PI * 2);
        c.stroke();
      }
      c.shadowBlur = 0;

      c.globalCompositeOperation = "source-over";
      for (let i = cracks.length - 1; i >= 0; i--) {
        const cr = cracks[i];
        const age = now - cr.t0;
        if (age > 800) {
          cracks.splice(i, 1);
          continue;
        }
        const shown = Math.ceil(cr.segs.length * Math.min(1, age / 120));
        c.strokeStyle = `rgba(255, 255, 255, ${(1 - age / 800).toFixed(3)})`;
        c.lineWidth = 1.5;
        c.beginPath();
        for (let k = 0; k < shown; k++) {
          const sg = cr.segs[k];
          c.moveTo(sg[0], sg[1]);
          c.lineTo(sg[2], sg[3]);
        }
        c.stroke();
      }

      const slices = REDUCED ? 0 : Math.floor(p * 4 + shake * 3);
      for (let i = 0; i < slices; i++) {
        const y = rand(0, Math.max(1, h - 60));
        const sh = rand(6, 60);
        const dx = rand(-1, 1) * (40 + p * 160);
        c.drawImage(cv, 0, y, w, sh, dx, y, w, sh);
      }

      shake = Math.max(0, shake - dt * 2.5);
      cv.style.transform =
        REDUCED || shake === 0
          ? "translate(-50%, -50%)"
          : `translate(calc(-50% + ${rand(-1, 1) * shake * 18}px), calc(-50% + ${rand(-1, 1) * shake * 18}px))`;
    };
    rafId = requestAnimationFrame(loop);

    const finish = () => {
      if (stopped) return;
      stopped = true;
      onCompleteRef.current?.();
    };
    audio.addEventListener("ended", finish);
    audio.addEventListener("error", finish);
    audio.play().catch((err) => {
      console.error(err);
      finish();
    });

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      clearInterval(flickerTick);
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", fit);
      audio.removeEventListener("ended", finish);
      audio.removeEventListener("error", finish);
      audio.pause();
      cv.remove();
      flashOverlay.remove();
    };
  }, []);

  return null;
}

function Effect5Three({ onComplete }) {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const root = fixLayer(document.createElement("div"), 999);
    root.style.background = "#050814";

    // --- фон Codex: фото + тонировка + глитч-полосы + шум + скан-линии ---
    const image = `url("${BASE}image/background.jpg")`;
    const base = el("div");
    Object.assign(base.style, {
      position: "absolute",
      inset: "-2%",
      backgroundImage: image,
      backgroundPosition: "center",
      backgroundSize: "cover",
      filter: "saturate(2.2) contrast(1.35) brightness(1.08)",
      transform: "scale(1.04)",
    });
    root.appendChild(base);

    const tint = el("div");
    Object.assign(tint.style, {
      position: "absolute",
      inset: 0,
      background:
        "linear-gradient(180deg,rgba(0,210,255,.3),rgba(18,0,110,.2) 48%,rgba(0,245,120,.36))",
      mixBlendMode: "color",
    });
    root.appendChild(tint);

    const bands = Array.from({ length: 16 }, () => {
      const band = el("div");
      Object.assign(band.style, {
        position: "absolute",
        inset: "0 -8%",
        zIndex: "3",
        backgroundImage: image,
        backgroundPosition: "center",
        backgroundSize: "cover",
        pointerEvents: "none",
        willChange: "clip-path, transform, filter, opacity",
      });
      root.appendChild(band);
      return band;
    });

    const noise = el("div");
    Object.assign(noise.style, {
      position: "absolute",
      inset: 0,
      backgroundImage: `url("${getNoiseURL()}")`,
      backgroundSize: "128px 128px",
      mixBlendMode: "screen",
      opacity: ".18",
      pointerEvents: "none",
    });
    root.appendChild(noise);

    const scanlines = el("div");
    Object.assign(scanlines.style, {
      position: "absolute",
      inset: 0,
      background:
        "repeating-linear-gradient(0deg,rgba(0,0,0,.24) 0 1px,transparent 1px 3px)",
      mixBlendMode: "multiply",
      pointerEvents: "none",
    });
    root.appendChild(scanlines);

    const flare = el("div");
    Object.assign(flare.style, {
      position: "absolute",
      inset: 0,
      background:
        "radial-gradient(ellipse at 48% 44%,rgba(255,255,255,.9),rgba(190,255,255,.3) 22%,transparent 54%)",
      opacity: "0",
      mixBlendMode: "screen",
      transition: "opacity 45ms steps(2,end)",
      pointerEvents: "none",
    });
    root.appendChild(flare);

    // --- твой исходный 3D-шар ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    Object.assign(renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      zIndex: "2",
      pointerEvents: "none",
    });
    root.appendChild(renderer.domElement);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    const spheres = [];
    const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const borderGeometry = new THREE.SphereGeometry(0.055, 16, 16);
    const borderMaterial = new THREE.MeshBasicMaterial({
      color: 0x808080,
      opacity: 0.5,
      transparent: true,
    });

    const group = new THREE.Group();
    scene.add(group);

    for (let i = 0; i < 1000; i++) {
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial.clone());
      const border = new THREE.Mesh(borderGeometry, borderMaterial.clone());
      group.add(sphere);
      group.add(border);
      spheres.push({ sphere, border });
    }

    camera.position.z = 7;

    let colorShift = 0,
      pulseTime = 0;
    const pulseSpeed = (50 / 60) * Math.PI * 2;
    const bgColors = [
      new THREE.Color(0x550000),
      new THREE.Color(0x000000),
      new THREE.Color(0x333333),
      new THREE.Color(0x990000),
    ];

    const backgroundSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        opacity: 0.9,
        transparent: true,
        side: THREE.BackSide,
      }),
    );
    group.add(backgroundSphere);

    const rainbowColors = [
      new THREE.Color(0xff0000),
      new THREE.Color(0xff7f00),
      new THREE.Color(0xffff00),
      new THREE.Color(0x00ff00),
      new THREE.Color(0x0000ff),
      new THREE.Color(0x4b0082),
      new THREE.Color(0x8b00ff),
    ];
    let currentColorIndex = 0,
      colorChangeTime = 0;
    let directionX = -1,
      directionY = 1;
    group.position.x = 5;
    group.position.y = -3;

    let stopped = false,
      rafId = 0;

    const audio = new Audio(`${BASE}audio/5.mp3`);
    audio.volume = 1;

    const updateBands = () => {
      const active = 5 + Math.floor(Math.random() * 10);
      bands.forEach((band, index) => {
        if (index >= active) {
          band.style.opacity = "0";
          return;
        }
        const top = Math.random() * 96;
        const height = 1.5 + Math.random() * 15;
        const shift = (Math.random() - 0.5) * 18;
        const hue = [165, 185, 205, 285, 330][Math.floor(Math.random() * 5)];
        band.style.clipPath = `inset(${top}% 0 ${Math.max(0, 100 - top - height)}% 0)`;
        band.style.transform = `translateX(${shift}vw) scaleY(${0.9 + Math.random() * 0.25})`;
        band.style.filter = `hue-rotate(${hue}deg) saturate(3.5) contrast(1.7) brightness(${1.2 + Math.random() * 1.5})`;
        band.style.opacity = String(0.18 + Math.random() * 0.42);
        band.style.mixBlendMode = Math.random() > 0.5 ? "screen" : "normal";
      });
      flare.style.opacity =
        Math.random() > 0.9 ? String(0.18 + Math.random() * 0.45) : "0";
      tint.style.filter = `hue-rotate(${Math.random() * 36 - 18}deg)`;
    };
    updateBands();
    const bandTimer = setInterval(updateBands, 90);

    const loop = () => {
      if (stopped) return;
      rafId = requestAnimationFrame(loop);

      const seconds = audio.currentTime || 0;
      base.style.filter = `hue-rotate(${(seconds * 32) % 360}deg) saturate(2.2) contrast(1.35) brightness(1.08)`;

      colorShift += 0.01;
      pulseTime += pulseSpeed;
      colorChangeTime += 0.05;
      renderer.setClearColor(pick(bgColors), 0.35);
      group.position.x += directionX * 0.01;
      group.position.y += directionY * 0.01;
      if (group.position.x < -5 || group.position.x > 5) directionX *= -1;
      if (group.position.y < -3 || group.position.y > 3) directionY *= -1;
      group.rotation.x += 0.01;
      group.rotation.y += 0.01;

      spheres.forEach(({ sphere, border }, index) => {
        const phi = Math.acos(-1 + (2 * index) / spheres.length);
        const theta = Math.sqrt(spheres.length * Math.PI) * phi;
        sphere.position.x = 1.5 * Math.sin(phi) * Math.cos(theta);
        sphere.position.y = 1.5 * Math.sin(phi) * Math.sin(theta);
        sphere.position.z = 1.5 * Math.cos(phi);
        border.position.copy(sphere.position);
        const hue = (index / spheres.length + colorShift) % 1;
        sphere.material.color.setHSL(hue, 1, 0.5);
        const scale = 1 + 0.3 * Math.sin(pulseTime);
        sphere.scale.setScalar(scale);
        border.scale.setScalar(scale + 0.005);
        border.material.color.set(0x808080);
      });

      if (colorChangeTime > 0.8) {
        currentColorIndex = (currentColorIndex + 1) % rainbowColors.length;
        backgroundSphere.material.color.copy(rainbowColors[currentColorIndex]);
        colorChangeTime = 0;
      }
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(loop);

    const finish = () => {
      if (stopped) return;
      stopped = true;
      onCompleteRef.current?.();
    };
    audio.addEventListener("ended", finish);
    audio.addEventListener("error", finish);
    audio.play().catch((err) => {
      console.error(err);
      finish();
    });

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      clearInterval(bandTimer);
      window.removeEventListener("resize", onResize);
      audio.removeEventListener("ended", finish);
      audio.removeEventListener("error", finish);
      audio.pause();
      spheres.forEach(({ sphere, border }) => {
        sphere.material.dispose();
        border.material.dispose();
      });
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      borderGeometry.dispose();
      borderMaterial.dispose();
      backgroundSphere.geometry.dispose();
      backgroundSphere.material.dispose();
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
      root.remove();
    };
  }, []);

  return null;
}
export default function App() {
  const [stage, setStage] = useState("idle");
  const [accepted, setAccepted] = useState(false);

  const audio1Ref = useRef(null);
  const audio2Ref = useRef(null);
  const audio3Ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && stage !== "idle" && stage !== "done") {
        try {
          audio1Ref.current?.pause();
          audio3Ref.current?.pause();
        } catch { /* ignore */ }
        setStage("idle");
        setAccepted(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [stage]);

  const startSequence = useCallback(() => {
    if (!audio1Ref.current) return;
    audio1Ref.current.currentTime = 0;
    audio1Ref.current
      .play()
      .then(() => setStage("effect1"))
      .catch((err) => {
        console.error("audio1 error", err);
        setStage("idle");
        setAccepted(false);
      });
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (e.target.closest && e.target.closest(".fx-warning")) return;
      if (stage !== "idle") return;

      if (!accepted) {
        setStage("warning");
      } else {
        startSequence();
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [stage, accepted, startSequence]);

  const handleAccept = () => {
    setAccepted(true);
    startSequence();
  };

  const handleCancel = () => {
    setStage("idle");
  };

  const next2 = useCallback(() => setStage("effect2"), []);
  const next3 = useCallback(() => setStage("effect3"), []);
  const next4 = useCallback(() => setStage("effect4"), []);
  const next5 = useCallback(() => setStage("effect5"), []);
  const finish = useCallback(() => {
    try {
      audio1Ref.current?.pause();
    } catch { /* ignore */ }
    setStage("done");
  }, []);

  return (
    <>
      <audio
        ref={audio1Ref}
        id="audio1"
        src={`${BASE}audio/1.mp3`}
        preload="auto"
        style={{ display: "none" }}
      />
      <audio
        ref={audio2Ref}
        id="audio2"
        src={`${BASE}audio/2.mp3`}
        preload="auto"
        style={{ display: "none" }}
      />
      <audio
        ref={audio3Ref}
        id="audio3"
        src={`${BASE}audio/3.mp3`}
        preload="none"
        style={{ display: "none" }}
      />

      {stage === "idle" && (
        <div
          style={{ position: "fixed", inset: 0, cursor: "pointer", zIndex: 1 }}
        />
      )}

      {stage === "warning" && (
        <div className="fx-warning">
          <div>
            <h2>⚠ WARNING</h2>
            <p>
              This experience contains rapid flashing lights, strobe effects,
              and loud audio. It may trigger seizures in people with
              photosensitive epilepsy.
              <br />
              <br />
              Press <b>Esc</b> at any time for an emergency stop.
            </p>
            <button className="fx-go" onClick={handleAccept}>
              Start
            </button>
            <button className="fx-no" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {stage === "effect1" && <Effect1Blur onComplete={next2} />}
      {stage === "effect2" && <Effect2Flash onComplete={next3} />}
      {stage === "effect3" && (
        <Effect3Shapes onComplete={next4} audio3Ref={audio3Ref} />
      )}
      {stage === "effect4" && <Effect4Vortex onComplete={next5} />}
      {stage === "effect5" && <Effect5Three onComplete={finish} />}
    </>
  );
}
