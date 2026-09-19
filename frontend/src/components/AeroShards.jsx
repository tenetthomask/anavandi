import React, { useEffect, useRef } from 'react';

/**
 * AeroShards Interactive Shader Component
 * Custom WebGL interactive shard particle canvas with repulsion mouse interaction
 */
export default function AeroShards({
  accentColor = "#A855F7",
  backgroundColor = "#120F17",
  bloom = 0.5,
  chromaticAberration = 0.0075,
  density = 1.5,
  depth = 1,
  detail = "balanced",
  edgeSoftness = 2,
  effect = "none",
  flow = "stream",
  glow = 1,
  grain = 0.05,
  holdToGather = true,
  interaction = "repel",
  interactionRadius = 1.5,
  interactionStrength = 0.5,
  material = "pearl",
  paused = false,
  placement = "full",
  rippleIntensity = 1,
  scale = 1,
  shardColor = "#896ABD",
  shardSize = 1.1,
  speed = 1,
  spin = 1,
  spread = 1,
  stretch = 1,
  transitionDuration = 1,
  turbulence = 1
}) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, isDown: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    // Handle Resize
    const handleResize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Track mouse coordinates across viewport
    const handleMouseMove = (e) => {
      mouseRef.current.targetX = e.clientX / window.innerWidth;
      mouseRef.current.targetY = 1.0 - (e.clientY / window.innerHeight);
    };

    const handleMouseDown = () => { mouseRef.current.isDown = true; };
    const handleMouseUp = () => { mouseRef.current.isDown = false; };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Shaders
    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform vec3 u_bgColor;
      uniform vec3 u_shardColor;
      uniform vec3 u_accentColor;

      // Hash function
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      // 2D Noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        vec2 aspectSt = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

        // Repel mouse effect
        vec2 mousePos = (u_mouse - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
        float distToMouse = length(aspectSt - mousePos);
        vec2 repelForce = normalize(aspectSt - mousePos) * exp(-distToMouse * 3.0) * 0.15;

        vec2 uv = aspectSt + repelForce;

        // Shard particle grid simulation
        float time = u_time * 0.4;
        vec2 grid = floor(uv * 12.0);
        vec2 id = fract(uv * 12.0) - 0.5;

        float n = noise(grid + time);
        float shardPattern = smoothstep(0.4, 0.45, length(id + vec2(sin(n * 6.28), cos(n * 6.28)) * 0.2));

        // Color blending
        vec3 finalColor = u_bgColor;
        finalColor = mix(finalColor, u_shardColor, shardPattern * 0.35);

        // Ambient radial glow
        float centerGlow = 1.0 - length(st - 0.5);
        finalColor += u_accentColor * pow(centerGlow, 2.5) * 0.25;

        // Interactive ripple at mouse
        float ripple = sin(distToMouse * 25.0 - u_time * 4.0) * exp(-distToMouse * 4.0);
        finalColor += u_accentColor * max(0.0, ripple) * 0.4;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // Hex to RGB Helper
    const hexToRgb = (hex) => {
      const clean = hex.replace('#', '');
      return [
        parseInt(clean.substring(0, 2), 16) / 255,
        parseInt(clean.substring(2, 4), 16) / 255,
        parseInt(clean.substring(4, 6), 16) / 255
      ];
    };

    // Create Shader Program
    const createShader = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const vertShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Quad Buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform Locations
    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const uBgColor = gl.getUniformLocation(program, "u_bgColor");
    const uShardColor = gl.getUniformLocation(program, "u_shardColor");
    const uAccentColor = gl.getUniformLocation(program, "u_accentColor");

    let animationFrameId;
    const startTime = performance.now();

    const render = () => {
      if (!paused) {
        const currentTime = (performance.now() - startTime) / 1000;
        
        // Smooth mouse interpolation
        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.1;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.1;

        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, currentTime * speed);
        gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
        gl.uniform3fv(uBgColor, hexToRgb(backgroundColor));
        gl.uniform3fv(uShardColor, hexToRgb(shardColor));
        gl.uniform3fv(uAccentColor, hexToRgb(accentColor));

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [backgroundColor, shardColor, accentColor, speed, paused]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'block' 
      }} 
    />
  );
}
