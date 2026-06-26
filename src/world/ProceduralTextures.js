import * as THREE from 'three';

let textureLibrary = null;

export function getProceduralTextures() {
  if (textureLibrary) {
    return textureLibrary;
  }

  textureLibrary = {
    caveIce: createSurfaceSet({
      seed: 13,
      base: '#477b92',
      detail: '#9ed5df',
      shadow: '#173e58',
      repeat: [4, 10],
      roughness: 168,
      metalness: 8,
      veins: true
    }),
    ground: createSurfaceSet({
      seed: 29,
      base: '#5f98aa',
      detail: '#b9e4e9',
      shadow: '#244a63',
      repeat: [9, 18],
      roughness: 190,
      metalness: 4,
      veins: false
    }),
    rock: createSurfaceSet({
      seed: 41,
      base: '#243e52',
      detail: '#537185',
      shadow: '#102534',
      repeat: [5, 12],
      roughness: 224,
      metalness: 3,
      veins: false
    }),
    roverMetal: createSurfaceSet({
      seed: 53,
      base: '#a4bbc4',
      detail: '#d6ebee',
      shadow: '#536a77',
      repeat: [3, 3],
      roughness: 108,
      metalness: 190,
      scratches: true
    }),
    roverTrim: createSurfaceSet({
      seed: 61,
      base: '#283d4b',
      detail: '#587383',
      shadow: '#101c27',
      repeat: [4, 4],
      roughness: 145,
      metalness: 210,
      scratches: true
    }),
    crystal: createSurfaceSet({
      seed: 71,
      base: '#36b9d2',
      detail: '#b7fff7',
      shadow: '#145a87',
      repeat: [2, 3],
      roughness: 64,
      metalness: 20,
      veins: true,
      emissive: '#7cecff'
    }),
    sample: createSurfaceSet({
      seed: 83,
      base: '#4a8790',
      detail: '#a9f1de',
      shadow: '#1b4555',
      repeat: [2, 2],
      roughness: 82,
      metalness: 48,
      veins: true,
      emissive: '#62d3c1'
    })
  };

  return textureLibrary;
}

export function configureProceduralTextureAnisotropy(maxAnisotropy) {
  const anisotropy = Math.min(4, Math.max(1, maxAnisotropy || 1));
  const textures = getProceduralTextures();

  Object.values(textures).forEach((surface) => {
    Object.values(surface).forEach((texture) => {
      if (texture?.isTexture) {
        texture.anisotropy = anisotropy;
      }
    });
  });
}

function createSurfaceSet({
  seed,
  base,
  detail,
  shadow,
  repeat,
  roughness,
  metalness,
  veins = false,
  scratches = false,
  emissive = null
}) {
  return {
    map: createColorTexture({ seed, base, detail, shadow, repeat, veins, scratches }),
    normalMap: createNormalTexture(seed + 101, repeat),
    roughnessMap: createMaskTexture(seed + 211, repeat, roughness),
    metalnessMap: createMaskTexture(seed + 307, repeat, metalness),
    emissiveMap: emissive
      ? createColorTexture({
          seed: seed + 401,
          base: emissive,
          detail: '#ffffff',
          shadow: base,
          repeat,
          veins: true
        })
      : null
  };
}

function createColorTexture({ seed, base, detail, shadow, repeat, veins, scratches }) {
  return createCanvasTexture(repeat, THREE.SRGBColorSpace, (context, size) => {
    context.fillStyle = base;
    context.fillRect(0, 0, size, size);

    const random = createRandom(seed);
    for (let index = 0; index < 820; index += 1) {
      const radius = 0.4 + random() * 2.4;
      context.globalAlpha = 0.06 + random() * 0.16;
      context.fillStyle = random() > 0.5 ? detail : shadow;
      context.beginPath();
      context.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
      context.fill();
    }

    if (veins) {
      context.lineCap = 'round';
      for (let index = 0; index < 18; index += 1) {
        const startX = random() * size;
        const startY = random() * size;
        context.globalAlpha = 0.14 + random() * 0.18;
        context.strokeStyle = detail;
        context.lineWidth = 0.45 + random() * 1.1;
        context.beginPath();
        context.moveTo(startX, startY);
        context.quadraticCurveTo(
          startX + (random() - 0.5) * size * 0.7,
          startY + (random() - 0.5) * size * 0.26,
          startX + (random() - 0.5) * size,
          startY + (random() - 0.5) * size * 0.42
        );
        context.stroke();
      }
    }

    if (scratches) {
      context.strokeStyle = detail;
      for (let index = 0; index < 48; index += 1) {
        const y = random() * size;
        context.globalAlpha = 0.08 + random() * 0.12;
        context.lineWidth = 0.35 + random() * 0.55;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(size, y + (random() - 0.5) * 8);
        context.stroke();
      }
    }

    context.globalAlpha = 1;
  });
}

function createNormalTexture(seed, repeat) {
  return createCanvasTexture(repeat, THREE.NoColorSpace, (context, size) => {
    const image = context.createImageData(size, size);
    const random = createRandom(seed);

    for (let index = 0; index < image.data.length; index += 4) {
      const offsetX = Math.floor((random() - 0.5) * 34);
      const offsetY = Math.floor((random() - 0.5) * 34);
      image.data[index] = 128 + offsetX;
      image.data[index + 1] = 128 + offsetY;
      image.data[index + 2] = 255;
      image.data[index + 3] = 255;
    }

    context.putImageData(image, 0, 0);
  });
}

function createMaskTexture(seed, repeat, baseValue) {
  return createCanvasTexture(repeat, THREE.NoColorSpace, (context, size) => {
    const image = context.createImageData(size, size);
    const random = createRandom(seed);

    for (let index = 0; index < image.data.length; index += 4) {
      const value = THREE.MathUtils.clamp(
        baseValue + Math.floor((random() - 0.5) * 34),
        0,
        255
      );
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }

    context.putImageData(image, 0, 0);
  });
}

function createCanvasTexture(repeat, colorSpace, draw) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  draw(context, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createRandom(seed) {
  let value = seed >>> 0;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
