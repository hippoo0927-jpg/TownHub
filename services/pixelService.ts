
import { ColorInfo, PixelData, TOWN_PALETTE_DATA, TOWN_PALETTE_HEX } from "../types";

export const processArtStudioPixel = async (
  imageSrc: string,
  width: number,
  height: number,
  colorLimit: number,
  crop: { x: number, y: number, scale: number }
): Promise<PixelData> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return reject("Canvas Error");

      canvas.width = width;
      canvas.height = height;

      // 흰색 배경으로 초기화
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);

      const drawW = img.width * crop.scale;
      const drawH = img.height * crop.scale;
      ctx.drawImage(img, crop.x, crop.y, drawW, drawH);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const pixelColorIds: string[] = [];
      const colorCounts: Record<string, number> = {};

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2];

        // 노이즈 및 잔상 방지 (매우 밝거나 어두운 색 고정)
        if (r > 245 && g > 245 && b > 245) {
          r = 254; g = 255; b = 255;
        } else if (r < 15 && g < 15 && b < 15) {
          r = 5; g = 22; b = 22;
        }

        const closestId = getClosestColorId(r, g, b);
        pixelColorIds.push(closestId);
        colorCounts[closestId] = (colorCounts[closestId] || 0) + 1;
      }

      const sortedIds = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorLimit);

      const palette: ColorInfo[] = sortedIds.map(([id, count]) => {
        return {
          hex: TOWN_PALETTE_HEX[id],
          name: id,
          count,
          index: id
        };
      });

      const finalHexColors = pixelColorIds.map(id => {
        if (palette.some(p => p.index === id)) {
            return TOWN_PALETTE_HEX[id];
        }
        return findClosestInActivePalette(id, palette);
      });

      resolve({ colors: finalHexColors, width, height, palette });
    };
    img.onerror = reject;
  });
};

/**
 * 가중치 RGB 거리 계산 (Perceptual Color Distance)
 * 인간의 눈은 초록색에 민감하고 파란색에 덜 민감한 점을 고려하여 가중치를 둡니다.
 */
function getClosestColorId(r: number, g: number, b: number): string {
  let min = Infinity;
  let resId = "1-5"; // 기본값 흰색
  
  Object.entries(TOWN_PALETTE_DATA).forEach(([id, [pr, pg, pb]]) => {
    // Red 가중치: 2, Green 가중치: 4, Blue 가중치: 3 (간이 가중치 방식)
    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    const d = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
    
    if (d < min) { 
        min = d; 
        resId = id; 
    }
  });
  return resId;
}

function findClosestInActivePalette(sourceId: string, palette: ColorInfo[]): string {
  const [sr, sg, sb] = TOWN_PALETTE_DATA[sourceId];
  let min = Infinity;
  let resHex = palette[0].hex;

  palette.forEach(p => {
    const [pr, pg, pb] = TOWN_PALETTE_DATA[p.index];
    const dr = sr - pr;
    const dg = sg - pg;
    const db = sb - pb;
    const d = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
    if (d < min) { 
        min = d; 
        resHex = p.hex; 
    }
  });
  return resHex;
}
