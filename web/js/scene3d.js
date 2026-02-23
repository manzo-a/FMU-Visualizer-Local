// ===================================================================
// scene3d.js — Three.js 3D Scene for the Mass-Spring-Damper System
// Realistic educational visualization with spring + damper in parallel
// ===================================================================

const Scene3D = (() => {
    let scene, camera, renderer, controls;
    let massBlock, ceilingGroup, springGroup, damperGroup;
    let rulerGroup, initialPosIndicator;
    let labelSprites = [];

    // Layout constants
    const CEILING_Y = 6;
    const CEILING_WIDTH = 6;
    const CEILING_DEPTH = 3;
    const CEILING_THICKNESS = 0.5;

    // Spring/Damper horizontal offset from center
    const SPRING_X = -0.8;
    const DAMPER_X = 0.8;

    // Spring params
    const SPRING_COILS = 14;
    const SPRING_SEGMENTS = 140;
    const SPRING_RADIUS = 0.35;
    const SPRING_WIRE_RADIUS = 0.055;

    // Damper params
    const DAMPER_OUTER_RADIUS = 0.28;
    const DAMPER_INNER_RADIUS = 0.08;
    const DAMPER_CYLINDER_LENGTH = 0.45;  // fraction of total height

    // Mass params
    const MASS_WIDTH = 3.2;
    const MASS_HEIGHT = 1.0;
    const MASS_DEPTH = 1.8;

    // State
    let currentMassScale = 1.0;
    let currentMassY = -2;

    // ─── Color Palette ──────────────────────────────────────────
    const COLORS = {
        bg: 0x0c1018,
        ceiling: 0x6b6b6b,
        ceilingAccent: 0x505050,
        spring: 0xb0b0b0,
        damperOuter: 0x4a5568,
        damperPiston: 0xa0aec0,
        damperRod: 0xc0c0c0,
        mass: 0x3182ce,
        massEdge: 0x2b6cb0,
        label: '#e2e8f0',
        ruler: 0x4a5568,
        rulerTick: 0x718096,
        indicator: 0xff6b6b,
        gridMain: 0x1a202c,
        gridSub: 0x141a24,
    };

    // ═══════════════════════════════════════════════════════════════
    //  INIT
    // ═══════════════════════════════════════════════════════════════
    function init(containerId) {
        const container = document.getElementById(containerId);
        const w = container.clientWidth;
        const h = container.clientHeight;

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(COLORS.bg);
        scene.fog = new THREE.FogExp2(COLORS.bg, 0.008);

        // Camera
        camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
        camera.position.set(10, 3, 10);
        camera.lookAt(0, 1, 0);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        container.appendChild(renderer.domElement);

        // Controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.target.set(0, 1, 0);
        controls.minDistance = 5;
        controls.maxDistance = 35;

        // Lighting
        _setupLights();

        // Ground
        _createGround();

        // Scene objects
        _createCeiling();
        _createMass();
        _createSpring();
        _createDamper();
        _createRuler();

        // Resize
        window.addEventListener('resize', () => {
            const w2 = container.clientWidth;
            const h2 = container.clientHeight;
            camera.aspect = w2 / h2;
            camera.updateProjectionMatrix();
            renderer.setSize(w2, h2);
        });

        // Render loop
        _animate();
    }

    // ─── Lights ─────────────────────────────────────────────────
    function _setupLights() {
        // Soft ambient
        scene.add(new THREE.AmbientLight(0x4a5568, 0.5));

        // Key directional light
        const key = new THREE.DirectionalLight(0xffffff, 0.9);
        key.position.set(8, 12, 8);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -10;
        key.shadow.camera.right = 10;
        key.shadow.camera.top = 10;
        key.shadow.camera.bottom = -10;
        scene.add(key);

        // Cool fill
        const fill = new THREE.DirectionalLight(0x63b3ed, 0.3);
        fill.position.set(-6, 4, -4);
        scene.add(fill);

        // Warm rim
        const rim = new THREE.DirectionalLight(0xfbd38d, 0.15);
        rim.position.set(0, -2, -8);
        scene.add(rim);

        // Point light near mass for subtle glow
        const point = new THREE.PointLight(0x63b3ed, 0.3, 15);
        point.position.set(2, -1, 3);
        scene.add(point);
    }

    // ─── Ground ─────────────────────────────────────────────────
    function _createGround() {
        // Grid helper
        const grid = new THREE.GridHelper(30, 30, COLORS.gridMain, COLORS.gridSub);
        grid.position.y = -10;
        grid.material.transparent = true;
        grid.material.opacity = 0.4;
        scene.add(grid);
    }

    // ─── Ceiling / Support ──────────────────────────────────────
    function _createCeiling() {
        ceilingGroup = new THREE.Group();

        // Main beam
        const beamGeom = new THREE.BoxGeometry(CEILING_WIDTH, CEILING_THICKNESS, CEILING_DEPTH);
        const beamMat = new THREE.MeshStandardMaterial({
            color: COLORS.ceiling,
            roughness: 0.6,
            metalness: 0.4,
        });
        const beam = new THREE.Mesh(beamGeom, beamMat);
        beam.castShadow = true;
        beam.receiveShadow = true;
        ceilingGroup.add(beam);

        // Bottom accent stripe (dark)
        const stripeGeom = new THREE.BoxGeometry(CEILING_WIDTH + 0.05, 0.06, CEILING_DEPTH + 0.05);
        const stripeMat = new THREE.MeshStandardMaterial({
            color: COLORS.ceilingAccent,
            roughness: 0.5,
            metalness: 0.5,
        });
        const stripe = new THREE.Mesh(stripeGeom, stripeMat);
        stripe.position.y = -CEILING_THICKNESS / 2;
        ceilingGroup.add(stripe);

        // Hatching pattern (diagonal lines) to show it's a fixed wall (engineering convention)
        for (let i = -5; i <= 5; i++) {
            const lineGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-CEILING_WIDTH / 2 + i * 0.5, CEILING_THICKNESS / 2 + 0.01, -CEILING_DEPTH / 2),
                new THREE.Vector3(-CEILING_WIDTH / 2 + i * 0.5 + 0.8, CEILING_THICKNESS / 2 + 0.01, CEILING_DEPTH / 2)
            ]);
            const lineMat = new THREE.LineBasicMaterial({
                color: 0x444444,
                transparent: true,
                opacity: 0.4
            });
            ceilingGroup.add(new THREE.Line(lineGeom, lineMat));
        }

        // Mounting points (small cylinders where spring and damper attach)
        [SPRING_X, DAMPER_X].forEach(xPos => {
            const mountGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16);
            const mountMat = new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.3,
                metalness: 0.6,
            });
            const mount = new THREE.Mesh(mountGeom, mountMat);
            mount.position.set(xPos, -CEILING_THICKNESS / 2 - 0.1, 0);
            ceilingGroup.add(mount);
        });

        ceilingGroup.position.y = CEILING_Y;
        scene.add(ceilingGroup);
    }

    // ─── Mass Block ─────────────────────────────────────────────
    function _createMass() {
        const group = new THREE.Group();

        // Main block
        const blockGeom = new THREE.BoxGeometry(MASS_WIDTH, MASS_HEIGHT, MASS_DEPTH);
        const blockMat = new THREE.MeshStandardMaterial({
            color: COLORS.mass,
            roughness: 0.35,
            metalness: 0.3,
            emissive: 0x1a365d,
            emissiveIntensity: 0.15,
        });
        const block = new THREE.Mesh(blockGeom, blockMat);
        block.castShadow = true;
        block.receiveShadow = true;
        group.add(block);

        // Edge highlight (slightly larger wireframe-ish box for depth)
        const edgeGeom = new THREE.BoxGeometry(MASS_WIDTH + 0.02, MASS_HEIGHT + 0.02, MASS_DEPTH + 0.02);
        const edgeMat = new THREE.MeshStandardMaterial({
            color: COLORS.massEdge,
            roughness: 0.5,
            metalness: 0.4,
            transparent: true,
            opacity: 0.3,
        });
        const edgeBox = new THREE.Mesh(edgeGeom, edgeMat);
        group.add(edgeBox);

        // Top mounting points
        [SPRING_X, DAMPER_X].forEach(xPos => {
            const mountGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 16);
            const mountMat = new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.3,
                metalness: 0.6,
            });
            const mount = new THREE.Mesh(mountGeom, mountMat);
            mount.position.set(xPos, MASS_HEIGHT / 2 + 0.075, 0);
            group.add(mount);
        });

        // "m" label on front face using canvas texture
        const labelTexture = _makeTextTexture('m', 120, '#ffffff', 'transparent');
        const labelGeom = new THREE.PlaneGeometry(1.0, 0.6);
        const labelMat = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            depthWrite: false,
        });
        const labelMesh = new THREE.Mesh(labelGeom, labelMat);
        labelMesh.position.set(0, 0, MASS_DEPTH / 2 + 0.01);
        group.add(labelMesh);

        group.position.y = currentMassY;
        massBlock = group;
        scene.add(massBlock);
    }

    // ─── Spring (helix) ─────────────────────────────────────────
    function _createSpring() {
        springGroup = new THREE.Group();
        springGroup.position.x = SPRING_X;
        _rebuildSpring();
        scene.add(springGroup);
    }

    function _rebuildSpring() {
        // Clear previous
        while (springGroup.children.length > 0) {
            const c = springGroup.children[0];
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
            springGroup.remove(c);
        }

        const topY = CEILING_Y - CEILING_THICKNESS / 2 - 0.2;
        const bottomY = currentMassY + MASS_HEIGHT / 2 + 0.15;
        const height = topY - bottomY;
        if (height < 0.3) return; // too compressed

        const points = [];
        for (let i = 0; i <= SPRING_SEGMENTS; i++) {
            const t = i / SPRING_SEGMENTS;
            const angle = t * SPRING_COILS * Math.PI * 2;
            const r = SPRING_RADIUS;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            const y = bottomY + t * height;
            points.push(new THREE.Vector3(x, y, z));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeom = new THREE.TubeGeometry(curve, SPRING_SEGMENTS * 2, SPRING_WIRE_RADIUS, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: COLORS.spring,
            roughness: 0.35,
            metalness: 0.7,
        });
        const mesh = new THREE.Mesh(tubeGeom, tubeMat);
        mesh.castShadow = true;
        springGroup.add(mesh);

        // Top & bottom end caps (small disks to show attachment)
        [topY, bottomY].forEach(yPos => {
            const capGeom = new THREE.CylinderGeometry(SPRING_RADIUS * 0.6, SPRING_RADIUS * 0.6, 0.08, 16);
            const capMat = new THREE.MeshStandardMaterial({
                color: 0x999999,
                roughness: 0.4,
                metalness: 0.5,
            });
            const cap = new THREE.Mesh(capGeom, capMat);
            cap.position.y = yPos;
            springGroup.add(cap);
        });
    }

    // ─── Damper (dashpot) ───────────────────────────────────────
    function _createDamper() {
        damperGroup = new THREE.Group();
        damperGroup.position.x = DAMPER_X;
        _rebuildDamper();
        scene.add(damperGroup);
    }

    function _rebuildDamper() {
        // Clear previous
        while (damperGroup.children.length > 0) {
            const c = damperGroup.children[0];
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
            damperGroup.remove(c);
        }

        const topY = CEILING_Y - CEILING_THICKNESS / 2 - 0.2;
        const bottomY = currentMassY + MASS_HEIGHT / 2 + 0.15;
        const totalHeight = topY - bottomY;
        if (totalHeight < 0.5) return;

        const outerMat = new THREE.MeshStandardMaterial({
            color: COLORS.damperOuter,
            roughness: 0.4,
            metalness: 0.5,
        });
        const pistonMat = new THREE.MeshStandardMaterial({
            color: COLORS.damperPiston,
            roughness: 0.3,
            metalness: 0.6,
        });
        const rodMat = new THREE.MeshStandardMaterial({
            color: COLORS.damperRod,
            roughness: 0.2,
            metalness: 0.8,
        });

        // Outer cylinder (body) — fixed to ceiling, top portion
        const cylinderLen = totalHeight * DAMPER_CYLINDER_LENGTH;
        const cylinderGeom = new THREE.CylinderGeometry(
            DAMPER_OUTER_RADIUS, DAMPER_OUTER_RADIUS, cylinderLen, 20
        );
        const cylinder = new THREE.Mesh(cylinderGeom, outerMat);
        cylinder.position.y = topY - cylinderLen / 2;
        cylinder.castShadow = true;
        damperGroup.add(cylinder);

        // Top cap
        const topCapGeom = new THREE.CylinderGeometry(
            DAMPER_OUTER_RADIUS + 0.04, DAMPER_OUTER_RADIUS + 0.04, 0.08, 20
        );
        const topCap = new THREE.Mesh(topCapGeom, pistonMat);
        topCap.position.y = topY;
        damperGroup.add(topCap);

        // Bottom cap of outer cylinder
        const botCapGeom = new THREE.CylinderGeometry(
            DAMPER_OUTER_RADIUS + 0.02, DAMPER_OUTER_RADIUS + 0.02, 0.06, 20
        );
        const botCap = new THREE.Mesh(botCapGeom, pistonMat);
        botCap.position.y = topY - cylinderLen;
        damperGroup.add(botCap);

        // Piston rod — extends from bottom of outer cylinder down to mass
        const rodLen = totalHeight - cylinderLen + 0.1;
        const rodGeom = new THREE.CylinderGeometry(
            DAMPER_INNER_RADIUS, DAMPER_INNER_RADIUS, rodLen, 12
        );
        const rod = new THREE.Mesh(rodGeom, rodMat);
        rod.position.y = topY - cylinderLen - rodLen / 2 + 0.05;
        rod.castShadow = true;
        damperGroup.add(rod);

        // Piston head (inside cylinder — visible at bottom opening)
        const pistonGeom = new THREE.CylinderGeometry(
            DAMPER_OUTER_RADIUS - 0.04, DAMPER_OUTER_RADIUS - 0.04, 0.12, 20
        );
        const piston = new THREE.Mesh(pistonGeom, pistonMat);
        piston.position.y = topY - cylinderLen + 0.06;
        damperGroup.add(piston);

        // Bottom attachment plate (connects rod to mass)
        const plateGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.06, 16);
        const plate = new THREE.Mesh(plateGeom, pistonMat);
        plate.position.y = bottomY;
        damperGroup.add(plate);

        // Top rod connecting to ceiling
        const topRodGeom = new THREE.CylinderGeometry(
            DAMPER_INNER_RADIUS, DAMPER_INNER_RADIUS, 0.2, 12
        );
        const topRod = new THREE.Mesh(topRodGeom, rodMat);
        topRod.position.y = topY + 0.1;
        damperGroup.add(topRod);
    }

    // ─── Ruler ──────────────────────────────────────────────────
    function _createRuler() {
        rulerGroup = new THREE.Group();
        rulerGroup.position.x = -CEILING_WIDTH / 2 - 1.5;
        rulerGroup.position.z = 0;

        // Vertical line
        const lineGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -10, 0),
            new THREE.Vector3(0, CEILING_Y + 1, 0)
        ]);
        const lineMat = new THREE.LineBasicMaterial({
            color: COLORS.ruler,
            transparent: true,
            opacity: 0.6,
        });
        rulerGroup.add(new THREE.Line(lineGeom, lineMat));

        // Tick marks and labels
        for (let y = -10; y <= CEILING_Y; y += 1) {
            const isMajor = y % 2 === 0;
            const tickLen = isMajor ? 0.3 : 0.15;

            const tickGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-tickLen / 2, y, 0),
                new THREE.Vector3(tickLen / 2, y, 0)
            ]);
            const tickMat = new THREE.LineBasicMaterial({
                color: COLORS.rulerTick,
                transparent: true,
                opacity: isMajor ? 0.6 : 0.3,
            });
            rulerGroup.add(new THREE.Line(tickGeom, tickMat));

            // Number label on major ticks
            if (isMajor) {
                const sprite = _makeTextSprite(y.toString(), 0.3, '#718096');
                sprite.position.set(0.45, y, 0);
                rulerGroup.add(sprite);
            }
        }

        // Y-axis label
        const yLabel = _makeTextSprite('Y (m)', 0.4, '#a0aec0');
        yLabel.position.set(0, CEILING_Y + 1.5, 0);
        rulerGroup.add(yLabel);

        // Initial position indicator (red arrow pointing right → toward ruler)
        const coneGeom = new THREE.ConeGeometry(0.2, 0.45, 8);
        const coneMat = new THREE.MeshStandardMaterial({
            color: COLORS.indicator,
            emissive: COLORS.indicator,
            emissiveIntensity: 0.35,
        });
        initialPosIndicator = new THREE.Mesh(coneGeom, coneMat);
        initialPosIndicator.rotation.z = -Math.PI / 2;   // tip points right (+X)
        initialPosIndicator.position.set(-0.55, currentMassY, 0); // left of ruler line, pointing toward it
        rulerGroup.add(initialPosIndicator);

        scene.add(rulerGroup);
    }

    // (Floating labels removed for cleaner look)

    // ─── Text Utilities ─────────────────────────────────────────
    function _makeTextTexture(text, fontSize, color, bgColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        if (bgColor && bgColor !== 'transparent') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, 256, 128);
        }

        ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(text, 128, 64);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    function _makeTextSprite(text, scale, color) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const fontSize = 48;
        canvas.width = 512;
        canvas.height = 64;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = `600 ${fontSize}px Inter, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color || '#ffffff';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(scale * (canvas.width / canvas.height) * 2, scale * 2, 1);
        return sprite;
    }

    // ─── Render Loop ────────────────────────────────────────────
    function _animate() {
        requestAnimationFrame(_animate);
        controls.update();
        renderer.render(scene, camera);
    }

    // ═══════════════════════════════════════════════════════════════
    //  PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    function setMassPosition(y) {
        currentMassY = y;
        if (massBlock) massBlock.position.y = y;
        _rebuildSpring();
        _rebuildDamper();
    }

    function setMassScale(massValue) {
        // Map mass (0.1–10) to visual scale (0.6–1.4)
        const s = 0.6 + (massValue / 10) * 0.8;
        currentMassScale = s;
        if (massBlock) {
            massBlock.scale.set(s, s, s);
        }
        _rebuildSpring();
        _rebuildDamper();
    }

    function setInitialPositionIndicator(y) {
        if (initialPosIndicator) {
            initialPosIndicator.position.y = y;
        }
    }

    function getMassPosition() {
        return massBlock ? massBlock.position.y : 0;
    }

    return {
        init,
        setMassPosition,
        setMassScale,
        setInitialPositionIndicator,
        getMassPosition,
    };
})();
