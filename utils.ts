export const getContrastColor = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
  return ((r * 299) + (g * 587) + (b * 114)) / 1000 >= 128 ? 'black' : 'white';
};

export const formatPaletteIndex = (index: number) => {
  const row = Math.floor((index - 1) / 8) + 1;
  const col = (index - 1) % 8 + 1;
  return `${row}-${col}`;
};