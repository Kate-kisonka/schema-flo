import React, { useEffect, useRef } from "react";
import {
  LIQUID_ORB_BASE_SPEED,
  LIQUID_ORB_PAL,
  LIQUID_ORB_STATE_BOOST,
  LIQUID_ORB_STATE_SPEED,
  createLiquidOrbProgram,
  readLiquidOrbPalette,
} from "./liquidOrbGL.js";

export default function LiquidOrb({ state = "idle", style, onFailure }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(state);
  const failureRef = useRef(onFailure);
  const redrawStillRef = useRef(null);

  useEffect(() => {
    failureRef.current = onFailure;
  }, [onFailure]);

  useEffect(() => {
    stateRef.current = state;
    redrawStillRef.current?.();
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const fail = () => failureRef.current?.();
    let gl;
    try {
      gl = canvas.getContext("webgl", {
        premultipliedAlpha: false,
        antialias: true,
        alpha: true,
      });
    } catch {
      fail();
      return;
    }
    if (!gl) {
      fail();
      return;
    }

    let prog;
    try {
      prog = createLiquidOrbProgram(gl);
    } catch {
      fail();
      return;
    }
    if (!prog) {
      fail();
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    if (!buf) {
      gl.deleteProgram(prog);
      fail();
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    if (loc < 0) {
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      fail();
      return;
    }
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uPal = gl.getUniformLocation(prog, "u_pal");
    const uBoost = gl.getUniformLocation(prog, "u_boost");
    if (!uRes || !uTime || !uPal || !uBoost) {
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      fail();
      return;
    }

    let palette = readLiquidOrbPalette();
    let phase = Math.random() * 10;
    let last = performance.now();
    let rafId = null;

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round((canvas.clientWidth || 1) * dpr));
      const height = Math.max(1, Math.round((canvas.clientHeight || 1) * dpr));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };

    const drawFrame = (now, advance) => {
      resize();
      if (advance) {
        const dt = Math.min(0.05, (now - last) / 1000);
        const speed = LIQUID_ORB_STATE_SPEED[stateRef.current] || 1;
        phase += dt * LIQUID_ORB_BASE_SPEED[palette] * speed;
      }
      last = now;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, phase);
      gl.uniform1f(uPal, LIQUID_ORB_PAL[palette] ?? 1);
      gl.uniform1f(uBoost, LIQUID_ORB_STATE_BOOST[stateRef.current] || 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const stop = () => {
      if (rafId === null) return;
      cancelAnimationFrame(rafId);
      rafId = null;
    };

    const animate = (now) => {
      drawFrame(now, true);
      if (document.hidden || reduceQuery.matches) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(animate);
    };

    const drawStill = () => {
      stop();
      drawFrame(performance.now(), false);
    };

    const start = () => {
      if (document.hidden || rafId !== null) return;
      if (reduceQuery.matches) {
        drawStill();
        return;
      }
      last = performance.now();
      rafId = requestAnimationFrame(animate);
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    const onMotionChange = () => (reduceQuery.matches ? drawStill() : start());
    const onContextLost = (event) => {
      event.preventDefault();
      stop();
      fail();
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduceQuery.matches) drawStill();
    });
    resizeObserver.observe(canvas);

    const themeObserver = new MutationObserver(() => {
      palette = readLiquidOrbPalette();
      if (reduceQuery.matches) drawStill();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("webglcontextlost", onContextLost);
    if (reduceQuery.addEventListener) reduceQuery.addEventListener("change", onMotionChange);
    else reduceQuery.addListener(onMotionChange);

    redrawStillRef.current = () => {
      if (reduceQuery.matches) drawStill();
    };
    start();

    return () => {
      redrawStillRef.current = null;
      stop();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      if (reduceQuery.removeEventListener) reduceQuery.removeEventListener("change", onMotionChange);
      else reduceQuery.removeListener(onMotionChange);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: "100%", height: "100%", display: "block", ...style }}
    />
  );
}
