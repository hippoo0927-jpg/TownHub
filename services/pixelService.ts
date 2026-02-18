
import { ColorInfo, PixelData, TOWN_PALETTE_DATA, TOWN_PALETTE_HEX } from "../types";

/**
 * 정밀한 색상 거리 계산 (Redmean 알고리즘 기반 + 파란색 왜곡 방지 보정)
 * d = sqrt( (2 + r_bar/256)*dr^2 + 4*dg^2 + (2 + (255-r_bar)/256)*db^2 )
 */
const calculateColorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const rBar = (r1 + r2) / 2;

  // Redmean 가중치
  const weightR = 2 + rBar / 256;
  const weightG = 4.0;
  // 파란색 가중치 (기본 Redmean 수식보다 약간 강화하여 초록색과의 거리를 더 예민하게 체크)
  const weightB = (2 + (255 - rBar) / 256) * 1.1;

  let distance = weightR * dr * dr + weightG * dg * dg + weightB * db * db;

  // [핵심 보정] 파란색(Blue) 지배 성분 강제 보호 로직
  // 소스 픽셀이 명확하게 파란색 계열일 때 (B가 G와 R보다 임계값 이상 높을 때)
  const isSourceClearlyBlue = b1 > g1 + 15 && b1 > r1 + 15;
  // 타겟 팔레트 색상이 명확하게 초록색 계열일 때 (G가 B보다 임계값 이상 높을 때)
  const isTargetGreen = g2 > b2 + 35;

  if (isSourceClearlyBlue && isTargetGreen) {
    // 거리에 엄청난 패널티를 주어 파란색이 초록색 팔레트에 매핑되는 것을 강력하게 차단
    distance *= 8.0; 
  }

  // 파란색 성분이 지배적인 경우 파란색 가중치를 극대화
  if (b1 > 160 && b1 > g1 + 30) {
    distance = weightR * dr * dr + weightG * dg * dg + (weightB * 2.0) * db * db;
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

      // 이미지를 중앙 정렬 및 자르기 값에 맞춰 그림
      ctx.save();
      const drawW = img.width * crop.scale;
      const drawH = img.height * crop.scale;
      // App.tsx에서 계산된 crop x, y는 캔버스 좌표계 기준이므로 그대로 사용
      ctx.drawImage(img, crop.x, crop.y, drawW, drawH);
      ctx.restore();

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const pixelColorIds: string[] = [];
      const colorCounts: Record<string, number> = {};

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2];
        
        // 극단적인 색상값 보정 (순수 화이트/블랙)
        if (r > 250 && g > 250 && b > 250) { r = 254; g = 255; b = 255; }
        else if (r < 5 && g < 5 && b < 5) { r = 5; g = 22; b = 22; }

        const closestId = getClosestColorId(r, g, b);
        pixelColorIds.push(closestId);
        colorCounts[closestId] = (colorCounts[closestId] || 0) + 1;
      }

      // 사용 빈도가 높은 상위 색상 추출
      const topIds = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorLimit)
        .map(([id]) => id);

      // 팔레트 정렬 (좌표순)
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

      // 최종 픽셀 데이터를 활성 팔레트 내에서 재매핑
      const finalHexColors = pixelColorIds.map(id => {
        if (palette.some(p => p.index === id)) return TOWN_PALETTE_HEX[id];
        return findClosestInActivePalette(id, palette);
      });

      resolve({ colors: finalHexColors, width, height, palette });
    };
    img.onerror = () => reject("이미지 로드 실패");
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
