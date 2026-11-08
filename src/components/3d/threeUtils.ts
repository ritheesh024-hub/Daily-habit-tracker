import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Detects whether the current device is using a software WebGL renderer (SwiftShader, llvmpipe, etc.)
 */
export const isSoftwareGl = (() => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

/**
 * Checks if WebGL is supported and available in the browser.
 */
export const isWebGLAvailable = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const supported = !!(
      (gl && gl instanceof WebGLRenderingContext) ||
      (window.WebGL2RenderingContext && gl instanceof WebGL2RenderingContext)
    );
    if (gl) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    return supported;
  } catch {
    return false;
  }
};

/**
 * Creates and configures a production-grade WebGLRenderer tuned for cinematic photorealism.
 */
export const createStandardRenderer = (canvas: HTMLCanvasElement): THREE.WebGLRenderer => {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isSoftwareGl,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    stencil: false,
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  return renderer;
};

/**
 * Sets up cinematic studio lighting & environment map with emerald-accent luxury sports grading.
 */
export const setupStudioEnvironment = (scene: THREE.Scene, renderer: THREE.WebGLRenderer) => {
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  } catch (e) {
    console.warn('RoomEnvironment setup skipped:', e);
  }

  // 1. Key Light: Warm studio softbox (3800K, high intensity, soft shadows)
  const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.8);
  keyLight.position.set(4.5, 7.0, 5.5);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);

  // 2. Deep Slate / Emerald Ambient Fill (prevents black crushed shadows, adds luxury tone)
  const ambientHemi = new THREE.HemisphereLight(0x102820, 0x090b0e, 1.4);
  scene.add(ambientHemi);

  // 3. Signature Emerald Rim Light (razor-sharp edge reflections on brushed titanium & rubber)
  const emeraldRim = new THREE.DirectionalLight(0x10b981, 2.4);
  emeraldRim.position.set(-6, 3.5, -4.5);
  scene.add(emeraldRim);

  // 4. Subtle Warm Amber Counter-Rim (creates rich color separation)
  const warmRim = new THREE.DirectionalLight(0xf59e0b, 1.6);
  warmRim.position.set(5.5, -2, -4);
  scene.add(warmRim);

  // 5. Soft Overhead Studio Strip Light
  const topStrip = new THREE.DirectionalLight(0xffffff, 1.2);
  topStrip.position.set(0, 8, 1);
  scene.add(topStrip);
};

/**
 * Generates a seamless woven jacquard athletic knit normal/bump texture for running footwear.
 */
export const createKnitMeshTexture = (): THREE.CanvasTexture => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Neutral normal map base (RGB: 128, 128, 255)
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);

  // Weave cell pattern
  const step = 8;
  for (let x = 0; x < size; x += step) {
    for (let y = 0; y < size; y += step) {
      const isAlt = ((x + y) / step) % 2 === 0;
      ctx.fillStyle = isAlt ? 'rgba(160, 110, 255, 0.65)' : 'rgba(96, 146, 255, 0.65)';
      ctx.beginPath();
      ctx.ellipse(x + step / 2, y + step / 2, step * 0.45, step * 0.28, isAlt ? Math.PI / 4 : -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // Micro pores
      ctx.fillStyle = 'rgba(70, 70, 220, 0.4)';
      ctx.fillRect(x + 2, y + 2, 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.generateMipmaps = true;
  return texture;
};

/**
 * Generates a high-traction technical carbon rubber tread normal map for shoe soles.
 */
export const createTreadNormalMap = (): THREE.CanvasTexture => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);

  // Chevron lug patterns
  ctx.strokeStyle = '#a090ff';
  ctx.lineWidth = 10;
  for (let y = 0; y < size; y += 32) {
    ctx.beginPath();
    for (let x = 0; x < size; x += 48) {
      ctx.moveTo(x, y + 16);
      ctx.lineTo(x + 24, y);
      ctx.lineTo(x + 48, y + 16);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 8);
  texture.generateMipmaps = true;
  return texture;
};

/**
 * Generates an anisotropic brushed metal micro-texture for aerospace titanium.
 */
export const createBrushedTitaniumTexture = (): THREE.CanvasTexture => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Fine linear micro-scratches
  for (let i = 0; i < 1800; i++) {
    const y = Math.random() * size;
    const len = 40 + Math.random() * 120;
    const x = Math.random() * size;
    const brightness = 110 + Math.random() * 40;
    ctx.strokeStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${0.15 + Math.random() * 0.25})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  return texture;
};

/**
 * Generates a photorealistic OLED smartwatch display dial with live biometrics.
 */
export const createSmartwatchDialTexture = (): THREE.CanvasTexture => {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep AMOLED true black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  // Outer subtle bezel tick marks
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const isMajor = i % 5 === 0;
    const r1 = size / 2 - 28;
    const r2 = size / 2 - (isMajor ? 48 : 36);
    ctx.strokeStyle = isMajor ? '#10b981' : '#27272a';
    ctx.lineWidth = isMajor ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(size / 2 + Math.cos(angle) * r1, size / 2 + Math.sin(angle) * r1);
    ctx.lineTo(size / 2 + Math.cos(angle) * r2, size / 2 + Math.sin(angle) * r2);
    ctx.stroke();
  }

  // Activity Progress Arc (Emerald)
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 410, -Math.PI / 2, Math.PI * 0.85);
  ctx.stroke();

  // Running Distance Arc (Athletic Orange)
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 375, -Math.PI / 2, Math.PI * 0.65);
  ctx.stroke();

  // Active Time / Big Digital Clock
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 150px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('09:41', size / 2, size / 2 - 80);

  // "RUNNING WORKOUT" Eyebrow
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('OUTDOOR 5K RUN', size / 2, size / 2 - 240);

  // Heart Rate Biometric Box (Left)
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('♥ 148 BPM', size / 2 - 190, size / 2 + 30);
  ctx.fillStyle = '#71717a';
  ctx.font = '28px sans-serif';
  ctx.fillText('ZONE 3 AEROBIC', size / 2 - 190, size / 2 + 75);

  // Pace Box (Right)
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 38px monospace';
  ctx.fillText('5:12 /km', size / 2 + 190, size / 2 + 30);
  ctx.fillStyle = '#71717a';
  ctx.font = '28px sans-serif';
  ctx.fillText('AVG PACE', size / 2 + 190, size / 2 + 75);

  // Big Distance Stat
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 96px monospace';
  ctx.fillText('5.24 KM', size / 2, size / 2 + 210);

  // GPS Locked status tag
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(size / 2 - 100, size / 2 + 310, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a1a1aa';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('GPS HIGH ACCURACY', size / 2 + 25, size / 2 + 322);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  return texture;
};

/**
 * Creates an ultra-crisp, dark cinematic OLED screen texture for the smartphone mockup.
 */
export const createPhoneScreenTexture = (isDark = true): THREE.CanvasTexture => {
  const width = 1170;
  const height = 2532;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Deep obsidian OLED base
  ctx.fillStyle = '#060809';
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient glow gradient from top
  const topGlow = ctx.createRadialGradient(width / 2, 200, 50, width / 2, 200, 800);
  topGlow.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
  topGlow.addColorStop(0.5, 'rgba(249, 115, 22, 0.04)');
  topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, 1000);

  // Status Bar
  ctx.fillStyle = '#f4f4f5';
  ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('9:41', 80, 105);

  // Cellular / Wifi / Battery
  ctx.fillStyle = '#f4f4f5';
  ctx.fillRect(width - 160, 75, 65, 32);
  ctx.fillRect(width - 90, 85, 8, 12);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(width - 164, 71, 73, 40);

  // App Bar
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Daily Habits', 80, 225);

  // Pro Athlete Badge
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(width - 120, 205, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✓', width - 120, 219);
  ctx.textAlign = 'left';

  // 1. Streak & Status Banner
  const bannerGrad = ctx.createLinearGradient(80, 280, width - 80, 520);
  bannerGrad.addColorStop(0, '#10b981');
  bannerGrad.addColorStop(1, '#059669');
  ctx.fillStyle = bannerGrad;
  roundRect(ctx, 80, 280, width - 160, 240, 40);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('🔥 7-Day Running & Habit Streak', 135, 375);
  ctx.font = '500 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText('Top 5% consistency · Personal best unlocked', 135, 445);

  // 2. Daily Run Live Telemetry Card
  ctx.fillStyle = '#0f1418';
  roundRect(ctx, 80, 570, width - 160, 500, 40);
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Live Workout Header
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(130, 635, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Daily Run · Active Outdoor Session', 165, 648);

  const metrics = [
    { label: 'DISTANCE', val: '5.24', unit: 'km', color: '#ffffff' },
    { label: 'DURATION', val: '27:18', unit: 'min', color: '#ffffff' },
    { label: 'AVG PACE', val: '5:12', unit: '/km', color: '#f97316' },
    { label: 'CALORIES', val: '364', unit: 'kcal', color: '#10b981' },
  ];

  metrics.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 130 + col * 490;
    const y = 740 + row * 190;

    ctx.fillStyle = '#71717a';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(m.label, x, y);

    ctx.fillStyle = m.color;
    ctx.font = 'bold 72px monospace';
    ctx.fillText(m.val, x, y + 74);

    ctx.fillStyle = '#71717a';
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(m.unit, x + (m.val.length > 4 ? 220 : 175), y + 70);
  });

  // 3. Today's Habits Section
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText("Today's Habits (4/5 Completed)", 80, 1140);

  const habits = [
    { title: 'Morning 5K Outdoor Run', sub: 'Completed at 06:45 AM · 5.24 km', checked: true },
    { title: '2.5L Hydration Goal', sub: '2,600 ml reached · Tracked', checked: true },
    { title: 'AI Meal Scan & Macros', sub: '1,850 kcal logged · 140g Protein', checked: true },
    { title: 'Mindfulness & Mobility', sub: '15 min hip and hamstring recovery', checked: true },
    { title: 'Evening Loop Discovery', sub: 'Queen’s Park 5K route scheduled', checked: false },
  ];

  habits.forEach((h, idx) => {
    const cardY = 1195 + idx * 180;
    ctx.fillStyle = '#0f1418';
    roundRect(ctx, 80, cardY, width - 160, 145, 32);
    ctx.fill();
    ctx.strokeStyle = h.checked ? 'rgba(16, 185, 129, 0.3)' : '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Checkbox Circle
    ctx.fillStyle = h.checked ? '#10b981' : '#182026';
    ctx.beginPath();
    ctx.arc(155, cardY + 72, 38, 0, Math.PI * 2);
    ctx.fill();

    if (h.checked) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓', 155, cardY + 86);
      ctx.textAlign = 'left';
    } else {
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(155, cardY + 72, 38, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = h.checked ? '#f4f4f5' : '#a1a1aa';
    ctx.font = 'bold 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(h.title, 230, cardY + 62);

    ctx.fillStyle = '#71717a';
    ctx.font = '500 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(h.sub, 230, cardY + 110);
  });

  // 4. Bottom Dock
  const navY = height - 210;
  ctx.fillStyle = '#080b0e';
  ctx.fillRect(0, navY, width, 210);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, navY);
  ctx.lineTo(width, navY);
  ctx.stroke();

  const navTabs = ['Habits', 'Daily Run', 'Routes', 'Stats'];
  navTabs.forEach((tab, i) => {
    const tx = 145 + i * 290;
    const isActive = i === 1;
    ctx.fillStyle = isActive ? '#10b981' : '#52525b';
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tab, tx, navY + 120);
    if (isActive) {
      ctx.beginPath();
      ctx.arc(tx, navY + 155, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
};

// Helper to draw rounded rectangle on 2D canvas
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
