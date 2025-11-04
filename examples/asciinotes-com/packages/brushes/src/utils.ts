export function hexToRgba(hex: string): [number, number, number, number] {
  let bigint = parseInt(hex.slice(1), 16);

  if (hex.length === 7) {
    bigint = (bigint << 8) | 0xff;
  }

  return [(bigint >> 24) & 255, (bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}
