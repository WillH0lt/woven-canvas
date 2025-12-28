export function luminance(color: string): number {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function hexToRgba(hex: string): [number, number, number, number] {
  let bigint = parseInt(hex.slice(1), 16);

  if (hex.length === 7) {
    bigint = (bigint << 8) | 0xff;
  }

  return [(bigint >> 24) & 255, (bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

export function shakeElement(elementId: string): void {
  const app = document.getElementById(elementId);
  if (app) {
    app.classList.add('shake');
    setTimeout(() => {
      app.classList.remove('shake');
    }, 500);
  }
}

export function pseudorandom(uuid: string): number {
  const cleanUuid = uuid.replace(/-/g, '');

  let hash = 0;
  for (let i = 0; i < cleanUuid.length; i++) {
    hash = (hash << 5) - hash + cleanUuid.charCodeAt(i);
    hash &= hash;
  }

  // 2 ** 31 - 2 = 2147483646
  return (Math.abs(hash) % 2147483646) + 1;
}

export function kebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
