import * as THREE from 'three';

// Procedural noise canvas for subtle casting roughness / brushed metal grain
export function createBrushedMetalNormalMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Fill neutral normal base (RGB: 128, 128, 255)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 256, 256);

  // Draw subtle fine horizontal machining streaks
  for (let y = 0; y < 256; y += 2) {
    const val = 128 + (Math.random() - 0.5) * 20;
    ctx.strokeStyle = `rgb(${val}, ${val}, 255)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

// Procedural cast-iron sand-cast grain texture
export function createCastIronRoughnessMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(256, 256);

  for (let i = 0; i < imgData.data.length; i += 4) {
    const noise = Math.floor(180 + Math.random() * 75);
    imgData.data[i] = noise;     // R
    imgData.data[i + 1] = noise; // G
    imgData.data[i + 2] = noise; // B
    imgData.data[i + 3] = 255;   // A
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}
