
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
        // 배경 및 노이즈 보정
        if (r > 245 && g > 245 && b > 245) { r = 254; g = 255; b = 255; }
        else if (r < 15 && g < 15 && b < 15) { r = 5; g = 22; b = 22; }

        const closestId = getClosestColorId(r, g, b);
        pixelColorIds.push(closestId);
        colorCounts[closestId] = (colorCounts[closestId] || 0) + 1;
      }

      // 1. 많이 사용된 색상 중 제한량만큼 추출
      const topIds = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorLimit)
        .map(([id]) => id);

      // 2. 추출된 색상을 타운 고유 번호 순서(그룹화)로 정렬
      const sortedIds = topIds.sort((a, b) => {
        const [gA, sA] = a.split('-').map(Number);
        const [gB, sB] = b.split('-').map(Number);
        return gA !== gB ? gA - gB : sA - sB;
      });

      const palette: ColorInfo[] = sortedIds.map((id) => ({
        hex: TOWN_PALETTE_HEX[id],
        name: id,
        count: colorCounts[id],
        index: id
      }));

      // 3. 최종 픽셀 매핑
      const finalHexColors = pixelColorIds.map(id => {
        if (palette.some(p => p.index === id)) return TOWN_PALETTE_HEX[id];
        return findClosestInActivePalette(id, palette);
      });

      resolve({ colors: finalHexColors, width, height, palette });
    };
    img.onerror = reject;
  });
};

function getClosestColorId(r: number, g: number, b: number): string {
  let min = Infinity;
  let resId = "1-5";
  Object.entries(TOWN_PALETTE_DATA).forEach(([id, [pr, pg, pb]]) => {
    const dr = r - pr, dg = g - pg, db = b - pb;
    const d = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
    if (d < min) { min = d; resId = id; }
  });
  return resId;
}

function findClosestInActivePalette(sourceId: string, palette: ColorInfo[]): string {
  const [sr, sg, sb] = TOWN_PALETTE_DATA[sourceId];
  let min = Infinity;
  let resHex = palette[0]?.hex || "#FFFFFF";
  palette.forEach(p => {
    const [pr, pg, pb] = TOWN_PALETTE_DATA[p.index];
    const dr = sr - pr, dg = sg - pg, db = sb - pb;
    const d = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
    if (d < min) { min = d; resHex = p.hex; }
  });
  return resHex;
}
