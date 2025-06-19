// utils/threeJsSetup.js
import * as THREE from 'three';

export const initThreeJS = ({
    canvas,
    sceneRef,
    rendererRef,
    cameraRef,
    animationRef,
    analyserRef,
    isPlaying,
    meshRef
}) => {
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    camera.position.set(0, 0, 15);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(800, 600);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Lighting Setup
    setupLighting(scene);

    // Mouse Controls
    const mouseControls = setupMouseControls(canvas, cameraRef);

    // Animation Loop
    const animate = () => {
        animationRef.current = requestAnimationFrame(animate);

        // Update camera position
        mouseControls.update();

        // Update mesh if playing
        if (isPlaying && meshRef?.current && analyserRef?.current) {
            updateMeshFromAudio(meshRef.current, analyserRef.current);
        }

        renderer.render(scene, camera);
    };

    animate();

    // Cleanup function
    return () => {
        canvas.removeEventListener('mousemove', mouseControls.handleMouseMove);
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };
};

const setupLighting = (scene) => {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // Directional Light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Point Light (accent)
    const pointLight = new THREE.PointLight(0x00ff88, 0.6, 20);
    pointLight.position.set(0, 0, 8);
    scene.add(pointLight);

    // Rim Light
    const rimLight = new THREE.DirectionalLight(0x8844ff, 0.3);
    rimLight.position.set(-10, -10, -5);
    scene.add(rimLight);
};

const setupMouseControls = (canvas, cameraRef) => {
    let mouseX = 0, mouseY = 0;
    let targetRotationX = 0, targetRotationY = 0;

    const handleMouseMove = (event) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = (event.clientX - rect.left - rect.width / 2) / 100;
        mouseY = (event.clientY - rect.top - rect.height / 2) / 100;
        targetRotationX = mouseY * 0.5;
        targetRotationY = mouseX * 0.5;
    };

    const update = () => {
        if (cameraRef.current) {
            const camera = cameraRef.current;
            camera.position.x += (Math.sin(targetRotationY) * 15 - camera.position.x) * 0.05;
            camera.position.y += (-targetRotationX * 10 - camera.position.y) * 0.05;
            camera.lookAt(0, 0, 0);
        }
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    return {
        handleMouseMove,
        update
    };
};

const updateMeshFromAudio = (mesh, analyser) => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Simple rotation based on audio energy
    const avgFrequency = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    mesh.rotation.y += (avgFrequency / 128) * 0.01;
    mesh.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
};