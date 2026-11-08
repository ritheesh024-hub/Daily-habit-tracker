import * as THREE from 'three';
import {
  createKnitMeshTexture,
  createTreadNormalMap,
  createBrushedTitaniumTexture,
  createSmartwatchDialTexture,
} from './threeUtils';

/**
 * Creates a photorealistic aerospace-grade titanium smartphone mockup with true OLED display,
 * 2.5D sapphire cover glass, and precision triple-camera optical module.
 */
export const createPhoneModel = (screenTexture: THREE.Texture): THREE.Group => {
  const phone = new THREE.Group();
  phone.name = 'CinematicSmartphone';

  const w = 2.45;
  const h = 5.1;
  const d = 0.22;
  const r = 0.36;

  // 1. Aerospace Titanium Chassis Body (CNC-machined with chamfers)
  const chassisShape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  chassisShape.moveTo(-hw + r, -hh);
  chassisShape.lineTo(hw - r, -hh);
  chassisShape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  chassisShape.lineTo(hw, hh - r);
  chassisShape.quadraticCurveTo(hw, hh, hw - r, hh);
  chassisShape.lineTo(-hw + r, hh);
  chassisShape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  chassisShape.lineTo(-hw, -hh + r);
  chassisShape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  const chassisGeo = new THREE.ExtrudeGeometry(chassisShape, {
    depth: d,
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 1,
    bevelSize: 0.045,
    bevelThickness: 0.045,
  });
  chassisGeo.center();

  const brushedTex = createBrushedTitaniumTexture();
  const chassisMat = new THREE.MeshPhysicalMaterial({
    color: 0x1c2228,
    metalness: 0.95,
    roughness: 0.22,
    roughnessMap: brushedTex,
    clearcoat: 0.35,
    clearcoatRoughness: 0.15,
  });
  const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  phone.add(chassisMesh);

  // 2. Front OLED Display Screen
  const screenW = w - 0.14;
  const screenH = h - 0.16;
  const screenGeo = new THREE.PlaneGeometry(screenW, screenH);
  const screenMat = new THREE.MeshBasicMaterial({
    map: screenTexture,
    toneMapped: false,
  });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, 0, d / 2 + 0.048);
  phone.add(screenMesh);

  // 3. 2.5D Curved Sapphire Glass Protective Cover
  const glassGeo = new THREE.PlaneGeometry(screenW + 0.04, screenH + 0.04);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,
    roughness: 0.02,
    metalness: 0.1,
    transmission: 0.88,
    ior: 1.54,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    depthWrite: false,
  });
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set(0, 0, d / 2 + 0.054);
  phone.add(glassMesh);

  // 4. Dynamic Island Camera Pill
  const pillGeo = new THREE.CapsuleGeometry(0.065, 0.26, 12, 24);
  pillGeo.rotateZ(Math.PI / 2);
  const pillMat = new THREE.MeshBasicMaterial({ color: 0x020304 });
  const pillMesh = new THREE.Mesh(pillGeo, pillMat);
  pillMesh.position.set(0, hh - 0.28, d / 2 + 0.058);
  phone.add(pillMesh);

  // 5. Triple Camera Optical Module (Rear Island)
  const camBaseGeo = new THREE.BoxGeometry(0.95, 1.05, 0.09);
  const camBaseMat = new THREE.MeshPhysicalMaterial({
    color: 0x14181d,
    metalness: 0.9,
    roughness: 0.3,
    clearcoat: 0.6,
  });
  const camBase = new THREE.Mesh(camBaseGeo, camBaseMat);
  camBase.position.set(-hw + 0.65, hh - 0.72, -d / 2 - 0.045);
  phone.add(camBase);

  // Precision 3 Lenses with Sapphire Bevels
  const lensPositions = [
    [-hw + 0.48, hh - 0.48],
    [-hw + 0.48, hh - 0.94],
    [-hw + 0.84, hh - 0.71],
  ];

  lensPositions.forEach(([lx, ly]) => {
    // Metal Bezel Ring
    const ringGeo = new THREE.CylinderGeometry(0.165, 0.165, 0.05, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38414e,
      metalness: 0.95,
      roughness: 0.15,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(lx, ly, -d / 2 - 0.09);
    phone.add(ring);

    // Sapphire Lens Element (anti-reflective deep indigo/emerald coating)
    const lensGeo = new THREE.SphereGeometry(0.14, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    lensGeo.rotateX(-Math.PI / 2);
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0x061e20,
      emissive: 0x064e3b,
      emissiveIntensity: 0.2,
      metalness: 0.2,
      roughness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(lx, ly, -d / 2 - 0.115);
    phone.add(lens);
  });

  // 6. Machined Side Buttons & Ports
  const buttonMat = new THREE.MeshStandardMaterial({
    color: 0x2e3642,
    metalness: 0.95,
    roughness: 0.25,
  });

  // Power Lock Button
  const powerGeo = new THREE.BoxGeometry(0.045, 0.52, 0.08);
  const power = new THREE.Mesh(powerGeo, buttonMat);
  power.position.set(hw + 0.025, 0.7, 0);
  phone.add(power);

  // Volume Rocker
  const volGeo = new THREE.BoxGeometry(0.045, 0.75, 0.08);
  const vol = new THREE.Mesh(volGeo, buttonMat);
  vol.position.set(-hw - 0.025, 0.7, 0);
  phone.add(vol);

  // Bottom USB-C Port & Acoustic Grilles
  const portGeo = new THREE.CapsuleGeometry(0.035, 0.25, 8, 16);
  portGeo.rotateZ(Math.PI / 2);
  const portMat = new THREE.MeshBasicMaterial({ color: 0x050709 });
  const port = new THREE.Mesh(portGeo, portMat);
  port.position.set(0, -hh - 0.01, 0);
  phone.add(port);

  return phone;
};

/**
 * Creates a photorealistic, high-performance athletic running sneaker with engineered knit mesh,
 * nitrogen-infused supercritical foam midsole, carbon rubber lugs, and dynamic woven laces.
 */
export const createRunningShoeModel = (): THREE.Group => {
  const shoe = new THREE.Group();
  shoe.name = 'PhotorealisticRunningShoe';

  const knitTexture = createKnitMeshTexture();
  const treadTexture = createTreadNormalMap();

  // 1. Carbon Rubber Outsole with Lugged Traction Tread
  const outsoleGeo = new THREE.BoxGeometry(1.85, 0.14, 0.78);
  const outsoleMat = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.85,
    metalness: 0.1,
    normalMap: treadTexture,
    normalScale: new THREE.Vector2(0.8, 0.8),
  });
  const outsole = new THREE.Mesh(outsoleGeo, outsoleMat);
  outsole.position.set(0, -0.38, 0);
  outsole.castShadow = true;
  shoe.add(outsole);

  // 2. Sculpted Supercritical Nitrogen Foam Midsole (Rocker Geometry)
  const midsolePoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.38, 0.02),
    new THREE.Vector2(0.42, 0.32),
    new THREE.Vector2(0.36, 0.38),
    new THREE.Vector2(-0.36, 0.38),
    new THREE.Vector2(-0.42, 0.28),
    new THREE.Vector2(-0.38, 0.02),
  ];
  const midsoleShape = new THREE.Shape(midsolePoints);
  const midsoleGeo = new THREE.ExtrudeGeometry(midsoleShape, {
    depth: 1.82,
    bevelEnabled: true,
    bevelSegments: 6,
    steps: 1,
    bevelSize: 0.06,
    bevelThickness: 0.06,
  });
  midsoleGeo.center();
  midsoleGeo.rotateY(Math.PI / 2);

  const midsoleMat = new THREE.MeshPhysicalMaterial({
    color: 0x181e24,
    roughness: 0.45,
    metalness: 0.1,
    clearcoat: 0.25,
    clearcoatRoughness: 0.3,
  });
  const midsole = new THREE.Mesh(midsoleGeo, midsoleMat);
  midsole.position.set(0, -0.16, 0);
  midsole.castShadow = true;
  shoe.add(midsole);

  // 3. Engineered Jacquard Knit Mesh Upper Body
  const upperGeo = new THREE.CylinderGeometry(0.38, 0.42, 1.55, 32);
  upperGeo.rotateZ(Math.PI / 2);
  upperGeo.scale(1.0, 0.75, 0.92);

  const upperMat = new THREE.MeshStandardMaterial({
    color: 0x222a35,
    roughness: 0.75,
    metalness: 0.15,
    bumpMap: knitTexture,
    bumpScale: 0.05,
    normalMap: knitTexture,
    normalScale: new THREE.Vector2(0.5, 0.5),
  });
  const upper = new THREE.Mesh(upperGeo, upperMat);
  upper.position.set(-0.06, 0.16, 0);
  upper.castShadow = true;
  shoe.add(upper);

  // 4. Molded TPU Heel Counter (Stability Clip with gunmetal brushed finish)
  const heelGeo = new THREE.TorusGeometry(0.32, 0.1, 16, 32, Math.PI);
  heelGeo.rotateX(Math.PI / 2);
  const heelMat = new THREE.MeshPhysicalMaterial({
    color: 0x334155,
    metalness: 0.85,
    roughness: 0.25,
    clearcoat: 0.6,
  });
  const heelClip = new THREE.Mesh(heelGeo, heelMat);
  heelClip.position.set(-0.52, 0.38, 0);
  shoe.add(heelClip);

  // 5. Padded Ergonomic Tongue & Collar Notch
  const tongueGeo = new THREE.BoxGeometry(0.55, 0.09, 0.32);
  tongueGeo.rotateZ(Math.PI / 5.5);
  const tongueMat = new THREE.MeshStandardMaterial({
    color: 0x1e242d,
    roughness: 0.65,
    bumpMap: knitTexture,
    bumpScale: 0.03,
  });
  const tongue = new THREE.Mesh(tongueGeo, tongueMat);
  tongue.position.set(0.08, 0.44, 0);
  shoe.add(tongue);

  // 6. Seamless Welded Athletic Orange Racing Stripe
  const stripePoints = [
    new THREE.Vector3(-0.55, 0.12, 0.42),
    new THREE.Vector3(-0.15, 0.26, 0.43),
    new THREE.Vector3(0.3, 0.08, 0.41),
    new THREE.Vector3(0.62, 0.18, 0.38),
  ];
  const stripeCurve = new THREE.CatmullRomCurve3(stripePoints, false);
  const stripeGeo = new THREE.TubeGeometry(stripeCurve, 32, 0.045, 12, false);
  const stripeMat = new THREE.MeshPhysicalMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.3,
    clearcoat: 0.7,
  });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  shoe.add(stripe);

  const stripeMirrored = stripe.clone();
  stripeMirrored.scale.set(1, 1, -1);
  shoe.add(stripeMirrored);

  // 7. Dynamic Braided Woven Laces with Tension Bridges
  const laceMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.5,
    metalness: 0.05,
  });
  for (let i = 0; i < 5; i++) {
    const lx = -0.2 + i * 0.14;
    const ly = 0.34 + i * 0.04;
    const laceGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.34, 12);
    laceGeo.rotateX(Math.PI / 2);
    const lace = new THREE.Mesh(laceGeo, laceMat);
    lace.position.set(lx, ly, 0);
    shoe.add(lace);
  }

  shoe.scale.setScalar(0.85);
  return shoe;
};

/**
 * Creates a photorealistic, luxury titanium smartwatch with live biometric OLED dial,
 * knurled digital crown, and fluoropolymer athletic band.
 */
export const createSmartwatchModel = (): THREE.Group => {
  const watch = new THREE.Group();
  watch.name = 'PhotorealisticSmartwatch';

  const dialTex = createSmartwatchDialTexture();
  const brushedTex = createBrushedTitaniumTexture();

  // 1. Aerospace Titanium Watch Case (Cushion-shaped bevel)
  const caseGeo = new THREE.CylinderGeometry(0.82, 0.82, 0.24, 48);
  const caseMat = new THREE.MeshPhysicalMaterial({
    color: 0x232a33,
    metalness: 0.94,
    roughness: 0.22,
    roughnessMap: brushedTex,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
  });
  const watchCase = new THREE.Mesh(caseGeo, caseMat);
  watchCase.rotateX(Math.PI / 2);
  watchCase.castShadow = true;
  watch.add(watchCase);

  // 2. Beveled Bezel Ring
  const bezelGeo = new THREE.TorusGeometry(0.82, 0.05, 16, 48);
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0x3d4754,
    metalness: 0.98,
    roughness: 0.15,
  });
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  bezel.position.z = 0.12;
  watch.add(bezel);

  // 3. OLED Display Dial (High-density telemetry display)
  const dialGeo = new THREE.CircleGeometry(0.78, 48);
  const dialMat = new THREE.MeshBasicMaterial({
    map: dialTex,
    toneMapped: false,
  });
  const dial = new THREE.Mesh(dialGeo, dialMat);
  dial.position.z = 0.13;
  watch.add(dial);

  // 4. Curved Sapphire Crystal Cover Glass
  const glassGeo = new THREE.CircleGeometry(0.8, 48);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22,
    roughness: 0.02,
    transmission: 0.9,
    ior: 1.77,
    clearcoat: 1.0,
    depthWrite: false,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.z = 0.145;
  watch.add(glass);

  // 5. Knurled Digital Crown (Machined titanium ridges)
  const crownGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 32);
  crownGeo.rotateZ(Math.PI / 2);
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.95,
    roughness: 0.2,
  });
  const crown = new THREE.Mesh(crownGeo, crownMat);
  crown.position.set(0.88, 0.22, 0);
  watch.add(crown);

  // Tactical Push Button (Bottom Right)
  const btnGeo = new THREE.BoxGeometry(0.08, 0.26, 0.08);
  const btn = new THREE.Mesh(btnGeo, crownMat);
  btn.position.set(0.86, -0.28, 0);
  watch.add(btn);

  // 6. Fluoropolymer Athletic Strap (Curved ergonomic band)
  const strapMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.7,
    metalness: 0.05,
    clearcoat: 0.15,
  });

  // Top Strap
  const topStrapGeo = new THREE.BoxGeometry(0.68, 0.9, 0.1);
  const topStrap = new THREE.Mesh(topStrapGeo, strapMat);
  topStrap.position.set(0, 1.25, -0.04);
  topStrap.rotation.x = -0.15;
  watch.add(topStrap);

  // Bottom Strap
  const btmStrapGeo = new THREE.BoxGeometry(0.68, 0.9, 0.1);
  const btmStrap = new THREE.Mesh(btmStrapGeo, strapMat);
  btmStrap.position.set(0, -1.25, -0.04);
  btmStrap.rotation.x = 0.15;
  watch.add(btmStrap);

  watch.scale.setScalar(0.88);
  return watch;
};

/**
 * Creates a photorealistic, double-wall vacuum insulated sports hydration flask
 * with interior refractive water, rubberized matte grip, and brushed gunmetal cap.
 */
export const createWaterBottleModel = (): THREE.Group => {
  const bottle = new THREE.Group();
  bottle.name = 'PhotorealisticWaterBottle';

  // 1. Powder-Coated Double-Wall Body (Slate Charcoal)
  const bodyGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.35, 36);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x17202a,
    roughness: 0.6,
    metalness: 0.2,
    clearcoat: 0.3,
    clearcoatRoughness: 0.25,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  bottle.add(body);

  // 2. Translucent Hydro Inspection Window (Optical Glass + Liquid)
  const windowGeo = new THREE.CylinderGeometry(0.384, 0.384, 0.55, 36, 1, true, -Math.PI / 3, (Math.PI * 2) / 3);
  const windowMat = new THREE.MeshPhysicalMaterial({
    color: 0xdff4fc,
    transmission: 0.94,
    transparent: true,
    opacity: 0.4,
    ior: 1.333,
    roughness: 0.04,
    clearcoat: 1.0,
  });
  const windowMesh = new THREE.Mesh(windowGeo, windowMat);
  windowMesh.position.set(0, -0.1, 0);
  bottle.add(windowMesh);

  // Interior Water Column with Meniscus
  const waterGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.75, 32);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.25,
    transmission: 0.92,
    transparent: true,
    opacity: 0.75,
    ior: 1.333,
    roughness: 0.02,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(0, -0.22, 0);
  bottle.add(water);

  // 3. Molded Rubberized Grip Waist Band
  const gripGeo = new THREE.CylinderGeometry(0.395, 0.395, 0.42, 36);
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x0b0e14,
    roughness: 0.9,
    metalness: 0.05,
  });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.set(0, 0.28, 0);
  bottle.add(grip);

  // 4. Machined Titanium Cap & Sport Straw Spout
  const capGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.26, 32);
  const capMat = new THREE.MeshPhysicalMaterial({
    color: 0x334155,
    metalness: 0.92,
    roughness: 0.18,
    clearcoat: 0.5,
  });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.set(0, 0.88, 0);
  bottle.add(cap);

  // Tactical Carry Carabiner Loop
  const loopGeo = new THREE.TorusGeometry(0.14, 0.035, 12, 24);
  const loopMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.95,
    roughness: 0.2,
  });
  const loop = new THREE.Mesh(loopGeo, loopMat);
  loop.position.set(0.2, 0.96, 0);
  bottle.add(loop);

  bottle.scale.setScalar(0.78);
  return bottle;
};

/**
 * Creates a photorealistic, high-performance athletic meal prep fuel bowl
 * with textured grains, seared wild salmon, fresh avocado segments, and crisp greens.
 */
export const createFoodBowlModel = (): THREE.Group => {
  const meal = new THREE.Group();
  meal.name = 'PhotorealisticAthleticFuel';

  // 1. Ceramic Matte Charcoal Bowl
  const points: THREE.Vector2[] = [];
  points.push(new THREE.Vector2(0, 0));
  points.push(new THREE.Vector2(0.42, 0.03));
  points.push(new THREE.Vector2(0.74, 0.22));
  points.push(new THREE.Vector2(0.92, 0.52));
  points.push(new THREE.Vector2(0.88, 0.52));
  points.push(new THREE.Vector2(0.7, 0.25));
  points.push(new THREE.Vector2(0.38, 0.07));
  points.push(new THREE.Vector2(0, 0.06));

  const bowlGeo = new THREE.LatheGeometry(points, 48);
  const bowlMat = new THREE.MeshPhysicalMaterial({
    color: 0x181c22,
    roughness: 0.35,
    metalness: 0.15,
    clearcoat: 0.4,
  });
  const bowl = new THREE.Mesh(bowlGeo, bowlMat);
  bowl.castShadow = true;
  meal.add(bowl);

  // 2. Steamed Golden Quinoa & Ancient Grains Bed
  const grainGeo = new THREE.CylinderGeometry(0.82, 0.42, 0.32, 32);
  const grainMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.92,
    metalness: 0.05,
  });
  const grainBed = new THREE.Mesh(grainGeo, grainMat);
  grainBed.position.set(0, 0.28, 0);
  meal.add(grainBed);

  // 3. Seared Atlantic Salmon Fillet with Glaze
  const salmonGeo = new THREE.BoxGeometry(0.55, 0.18, 0.32);
  const salmonMat = new THREE.MeshPhysicalMaterial({
    color: 0xf97316,
    roughness: 0.3,
    metalness: 0.1,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15,
  });
  const salmon = new THREE.Mesh(salmonGeo, salmonMat);
  salmon.position.set(-0.25, 0.44, -0.1);
  salmon.rotation.set(0.1, 0.4, 0.05);
  meal.add(salmon);

  // 4. Fresh Hass Avocado Segments (Smooth satin texture)
  const avoMat = new THREE.MeshPhysicalMaterial({
    color: 0x65a30d,
    roughness: 0.35,
    clearcoat: 0.3,
  });
  for (let i = 0; i < 4; i++) {
    const avoGeo = new THREE.TorusGeometry(0.2, 0.055, 12, 20, Math.PI * 0.9);
    const avo = new THREE.Mesh(avoGeo, avoMat);
    avo.position.set(0.18 + i * 0.09, 0.46, -0.15 + i * 0.12);
    avo.rotation.set(Math.PI / 2.2, 0, Math.PI / 3);
    meal.add(avo);
  }

  // 5. Crisp Baby Spinach / Kale Foliage
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.5,
  });
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const leafGeo = new THREE.SphereGeometry(0.18, 12, 12);
    leafGeo.scale(1.3, 0.15, 0.85);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(Math.cos(angle) * 0.48, 0.42, Math.sin(angle) * 0.48);
    leaf.rotation.set(0.25, angle, 0.15);
    meal.add(leaf);
  }

  meal.scale.setScalar(0.8);
  return meal;
};

/**
 * Creates an architectural topographic terrain pedestal with embedded fiber-optic
 * GPS route tube and CNC-machined titanium waypoint monument.
 */
export const createRouteMapDiscModel = (): THREE.Group => {
  const mapDisc = new THREE.Group();
  mapDisc.name = 'CinematicTopographicRoute';

  // 1. Dark Slate Architectural Podium (Beveled steps)
  const baseGeo = new THREE.CylinderGeometry(1.05, 1.1, 0.16, 48);
  const baseMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f141a,
    roughness: 0.7,
    metalness: 0.2,
    clearcoat: 0.3,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.castShadow = true;
  mapDisc.add(base);

  // Topographic Step Layer 1
  const step1Geo = new THREE.CylinderGeometry(0.98, 1.0, 0.08, 48);
  const stepMat = new THREE.MeshStandardMaterial({
    color: 0x19212c,
    roughness: 0.55,
    metalness: 0.3,
  });
  const step1 = new THREE.Mesh(step1Geo, stepMat);
  step1.position.set(0, 0.1, 0);
  mapDisc.add(step1);

  // 2. Glowing Fiber-Optic 3D GPS Route (Luminous athletic green-orange)
  const routePoints = [
    new THREE.Vector3(-0.62, 0.16, -0.25),
    new THREE.Vector3(-0.42, 0.18, 0.45),
    new THREE.Vector3(0.2, 0.16, 0.55),
    new THREE.Vector3(0.58, 0.19, 0.18),
    new THREE.Vector3(0.35, 0.17, -0.5),
    new THREE.Vector3(-0.25, 0.16, -0.55),
    new THREE.Vector3(-0.62, 0.16, -0.25),
  ];
  const routeCurve = new THREE.CatmullRomCurve3(routePoints, true);
  const routeGeo = new THREE.TubeGeometry(routeCurve, 48, 0.04, 12, true);
  const routeMat = new THREE.MeshPhysicalMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.95,
    roughness: 0.1,
    metalness: 0.2,
    clearcoat: 1.0,
  });
  const routeMesh = new THREE.Mesh(routeGeo, routeMat);
  mapDisc.add(routeMesh);

  // 3. Titanium Waypoint Marker Pin
  const pin = new THREE.Group();
  pin.position.set(-0.62, 0.16, -0.25);

  const headGeo = new THREE.SphereGeometry(0.12, 24, 24);
  const headMat = new THREE.MeshPhysicalMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 0.5,
    metalness: 0.6,
    roughness: 0.15,
    clearcoat: 0.9,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 0.35;
  pin.add(head);

  const needleGeo = new THREE.ConeGeometry(0.09, 0.26, 24);
  needleGeo.rotateX(Math.PI);
  const needleMat = new THREE.MeshStandardMaterial({
    color: 0x059669,
    metalness: 0.9,
    roughness: 0.2,
  });
  const needle = new THREE.Mesh(needleGeo, needleMat);
  needle.position.y = 0.16;
  pin.add(needle);

  mapDisc.add(pin);
  mapDisc.scale.setScalar(0.85);
  return mapDisc;
};

/**
 * Creates a precision-milled brushed titanium milestone medal / badge.
 */
export const createCheckmarkBadgeModel = (): THREE.Group => {
  const badge = new THREE.Group();
  badge.name = 'PrecisionTitaniumBadge';

  // 1. Milled Titanium Coin with Chamfered Rim
  const coinGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.12, 48);
  const coinMat = new THREE.MeshPhysicalMaterial({
    color: 0x182420,
    metalness: 0.92,
    roughness: 0.2,
    clearcoat: 0.6,
  });
  const coin = new THREE.Mesh(coinGeo, coinMat);
  coin.rotateX(Math.PI / 2);
  badge.add(coin);

  // Emerald Gem Rim Accent
  const rimGeo = new THREE.TorusGeometry(0.52, 0.04, 16, 48);
  const rimMat = new THREE.MeshPhysicalMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.7,
    metalness: 0.5,
    roughness: 0.15,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  badge.add(rim);

  // 2. High-Relief Laser-Cut Checkmark
  const checkGroup = new THREE.Group();
  const shortGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.26, 16);
  shortGeo.rotateZ(Math.PI / 4);
  const checkMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.3,
    roughness: 0.1,
    clearcoat: 1.0,
  });
  const shortBar = new THREE.Mesh(shortGeo, checkMat);
  shortBar.position.set(-0.11, -0.05, 0.07);
  checkGroup.add(shortBar);

  const longGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.5, 16);
  longGeo.rotateZ(-Math.PI / 3.4);
  const longBar = new THREE.Mesh(longGeo, checkMat);
  longBar.position.set(0.13, 0.05, 0.07);
  checkGroup.add(longBar);

  badge.add(checkGroup);
  badge.scale.setScalar(0.85);
  return badge;
};
