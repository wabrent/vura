const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const TOTAL_SUPPLY = 333;
const WIDTH = 1000;
const HEIGHT = 1000;

// Точная пиксельная матрица красивого черепа (20 колонок на 18 строк)
const SKULL_MATRIX = [
  [0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,1,1,0,0,0,1,1,1,1,0,0,0,1,1,1,1,1,0], // глазницы
  [0,1,1,1,0,0,0,1,1,1,1,0,0,0,1,1,1,1,1,0],
  [0,1,1,1,0,0,0,1,1,1,1,0,0,0,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,0,0], // нос
  [0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0], // скулы
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,1,0,1,0,1,0,1,0,1,1,0,0,0,0,0], // верхние зубы
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,1,0,1,0,1,0,1,0,1,1,0,0,0,0,0], // нижние зубы
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0]  // подбородок
];

// Папки для выгрузки в формате OpenSea Studio
const imagesDir = path.join(__dirname, '../drop-assets/images');
const metadataDir = path.join(__dirname, '../drop-assets/metadata');
fs.mkdirSync(imagesDir, { recursive: true });
fs.mkdirSync(metadataDir, { recursive: true });

// Генерация 333 уникальных цветов по кругу HSL
function getUniqueColor(index, total) {
  const hue = (index * (360 / total)) % 360;
  const saturation = 90;
  const lightness = 60;

  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + hue / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

console.log('⚡ Генерация 333 NFT для Vura Genesis Pass...');

for (let i = 1; i <= TOTAL_SUPPLY; i++) {
  const idStr = String(i).padStart(3, '0');
  const color = getUniqueColor(i - 1, TOTAL_SUPPLY);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Фон #0a0a0a
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 1. Надпись VURA сверху
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.fillText('V U R A', WIDTH / 2, 140);

  // 2. Отрисовка пиксельного черепа в уникальном цвете
  const COLS = SKULL_MATRIX[0].length;
  const ROWS = SKULL_MATRIX.length;
  const PIXEL_SIZE = 26;
  const startX = (WIDTH - COLS * PIXEL_SIZE) / 2;
  const startY = 250;

  ctx.fillStyle = color;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (SKULL_MATRIX[r][c] === 1) {
        ctx.fillRect(
          startX + c * PIXEL_SIZE,
          startY + r * PIXEL_SIZE,
          PIXEL_SIZE - 2,
          PIXEL_SIZE - 2
        );
      }
    }
  }

  // 3. Номер NFT снизу
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px "Courier New", monospace';
  ctx.fillText(`#${idStr}`, WIDTH / 2, 850);

  // Сохраняем PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(imagesDir, `${i}.png`), buffer);

  // Метаданные OpenSea (ERC-721 Standard)
  const metadata = {
    name: `Vura Genesis Pass #${idStr}`,
    description: `Official 1-bit genesis pass for VURA intelligence terminal. Verified on vura.ink.`,
    image: `${i}.png`,
    attributes: [
      { trait_type: 'Pass ID', value: idStr },
      { trait_type: 'Hex Color', value: color }
    ]
  };

  fs.writeFileSync(path.join(metadataDir, `${i}.json`), JSON.stringify(metadata, null, 2));
}

console.log('✅ Готово! 333 PNG сохранены в drop-assets/images/, а JSON в drop-assets/metadata/');
