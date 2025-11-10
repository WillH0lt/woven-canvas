import fs from "fs";

function main() {
  const fntData = fs.readFileSync("./fnt.json");
  const fnt = JSON.parse(fntData.toString());

  const { cellWidth, cellHeight, columns, rows } = fnt.atlas.grid;
  const { height } = fnt.atlas;

  const charMap: { [key: number]: number } = {};
  for (let i = 0; i < fnt.glyphs.length; i++) {
    const char = fnt.glyphs[i];
    if (!char.atlasBounds) continue;

    const { left, top, bottom, right } = char.atlasBounds;

    const x = left + (right - left) / 2;
    const y = height - (bottom + (top - bottom) / 2);

    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);

    const index = row * columns + col;

    charMap[char.unicode] = index;
  }

  const space = " ".charCodeAt(0);
  charMap[space] = rows * columns - 1;

  fs.writeFileSync("unicodeMap.json", JSON.stringify(charMap, null, 2));
}

main();
