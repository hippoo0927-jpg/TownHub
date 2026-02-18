
import { ColorInfo, PixelData, TOWN_PALETTE_DATA, TOWN_PALETTE_HEX } from "../types";

/**
 * 정밀한 색상 거리 계산 (Redmean 알고리즘 기반)
 * 파란색(Blue)의 가중치를 보정하여 초록색(Green)으로의 왜곡을 방지합니다.
 */
const calculateColorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const rBar = (r1 + r2) / 2;

  // Redmean 가중치 계산
  const weightR = 2 + rBar / 256;
  const weightG = 4.0;
  const weightB = 2 + (255 - rBar) / 256;

  // 기본 거리 점수
  let distance = weightR * dr * dr + weightG * dg * dg + weightB * db * db;

  // [보정 로직] 파란색 지배 성분 보호
  // 입력 픽셀이 파란색 계열(B > G && B > R)인데 타겟 팔레트가 초록색 계열인 경우 패널티 부여
  const isSourceBlue = b1 > g1 * 1.1 && b1 > r1 * 1.1;
  const isTargetGreen = g2 > b2 * 1.1 && g2 > r2;

  if (isSourceBlue && isTargetGreen) {
    // 파란색이 초록색으로 흡수되지 않도록 거리를 대폭 늘림 (강제 분리)
    distance *= 2.5;
  }

  // 파란색 성분이 매우 강한 경우 파란색 가중치 추가 강화
  if (b1 > 150 && b1 > g1 + 40) {
    distance = weightR * dr * dr + weightG * dg * dg + (weightB * 1.5) * db * db;
  }

  return distance;
};

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
        
        // 화이트/블랙 노이즈 보정
        if (r > 248 && g > 248 && b > 248) { r = 254; g = 255; b = 255; }
        else if (r < 10 && g < 10 && b < 10) { r = 5; g = 22; b = 22; }

        const closestId = getClosestColorId(r, g, b);
        pixelColorIds.push(closestId);
        colorCounts[closestId] = (colorCounts[closestId] || 0) + 1;
      }

      // 많이 사용된 색상 추출
      const topIds = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorLimit)
        .map(([id]) => id);

      // 팔레트 정렬 (그룹 및 순서)
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

      // 최종 픽셀 매핑
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
    const d = calculateColorDistance(r, g, b, pr, pg, pb);
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
    const d = calculateColorDistance(sr, sg, sb, pr, pg, pb);
    if (d < min) { min = d; resHex = p.hex; }
  });
  return resHex;
}
