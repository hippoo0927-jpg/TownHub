
export type AppStep = 'MODE_SELECT' | 'SETUP' | 'UPLOAD' | 'FRAME' | 'TEXT' | 'EDITOR';
export type StudioMode = 'PATTERN' | 'BOOK_COVER';

// AspectRatio defines the supported dimensions for generation
export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

// ImageSize defines the resolution tier for generation
export type ImageSize = '1K' | '2K' | '4K';

// PixelDensity defines the target grid resolution for the pixelation process
export type PixelDensity = number;

// StudioModel defines the available Gemini models as an enum for type safety
export enum StudioModel {
  FLASH = 'gemini-3-flash-preview',
  PRO = 'gemini-3-pro-preview',
}

export interface TextLayer {
  id: string;
  text: string;
  x: number; // percentage
  y: number; // percentage
  size: number;
  color: string;
}

export interface ColorInfo {
  hex: string;
  name: string;
  count: number;
  index: string;
}

export interface PixelData {
  colors: string[];
  width: number;
  height: number;
  palette: ColorInfo[];
}

// GeneratedImage represents the output of the generation and conversion process
export interface GeneratedImage {
  id: string;
  url: string;
  pixelUrl?: string;
  prompt: string;
  config: {
    aspectRatio: AspectRatio;
    model: StudioModel;
    imageSize: ImageSize;
    pixelDensity: PixelDensity;
  };
  palette?: ColorInfo[];
}

export const TOWN_PALETTE_DATA: Record<string, [number, number, number]> = {
    "1-1": [5, 22, 22], "1-2": [65, 69, 69], "1-3": [128, 130, 130], "1-4": [191, 192, 192], "1-5": [254, 255, 255],
    "5-1": [208, 53, 77], "5-2": [238, 110, 114], "5-3": [166, 38, 61], "5-4": [245, 172, 166], "5-5": [201, 132, 131],
    "5-6": [163, 93, 94], "5-7": [105, 49, 59], "5-8": [230, 213, 212], "5-9": [192, 172, 171], "5-10": [117, 94, 94],
    "6-1": [232, 94, 43], "6-2": [249, 131, 88], "6-3": [171, 66, 38], "6-4": [254, 186, 159], "6-5": [218, 147, 124],
    "6-6": [175, 107, 88], "6-7": [117, 59, 49], "6-8": [232, 213, 208], "6-9": [193, 172, 166], "6-10": [117, 94, 89],
    "7-1": [243, 158, 22], "7-2": [254, 174, 59], "7-3": [177, 110, 22], "7-4": [254, 206, 145], "7-5": [218, 167, 108],
    "7-6": [179, 129, 75], "7-7": [121, 81, 38], "7-8": [245, 227, 206], "7-9": [206, 188, 169], "7-10": [128, 110, 94],
    "8-1": [237, 201, 22], "8-2": [249, 216, 56], "8-3": [179, 148, 22], "8-4": [250, 230, 144], "8-5": [210, 190, 110],
    "8-6": [171, 149, 75], "8-7": [117, 99, 38], "8-8": [238, 230, 198], "8-9": [198, 191, 162], "8-10": [120, 114, 89],
    "9-1": [168, 188, 22], "9-2": [183, 200, 49], "9-3": [117, 134, 22], "9-4": [215, 223, 147], "9-5": [173, 183, 108],
    "9-6": [133, 144, 75], "9-7": [84, 94, 43], "9-8": [229, 233, 198], "9-9": [189, 194, 163], "9-10": [110, 116, 93],
    "10-1": [5, 162, 93], "10-2": [65, 185, 123], "10-3": [5, 116, 70], "10-4": [156, 217, 173], "10-5": [118, 178, 139],
    "10-6": [80, 137, 104], "10-7": [36, 86, 64], "10-8": [196, 224, 203], "10-9": [157, 183, 166], "10-10": [84, 104, 93],
};

export const TOWN_PALETTE_HEX = Object.fromEntries(
    Object.entries(TOWN_PALETTE_DATA).map(([id, [r, g, b]]) => [
        id, 
        `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`
    ])
);
