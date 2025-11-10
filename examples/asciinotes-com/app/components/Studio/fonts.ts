import figlet from "figlet";
import banner from "figlet/fonts/Banner";
import crawford from "figlet/fonts/Crawford";
import cyberlarge from "figlet/fonts/Cyberlarge";
import dotMatrix from "figlet/fonts/Dot Matrix";
import graceful from "figlet/fonts/Graceful";
import graffiti from "figlet/fonts/Graffiti";
import jsStickLetters from "figlet/fonts/Js Stick Letters";
import mini from "figlet/fonts/Mini";
import rectangles from "figlet/fonts/Rectangles";
import roman from "figlet/fonts/Roman";
import standard from "figlet/fonts/Standard";

export const figletFonts = [
  {
    name: "StickLetters",
    displayName: "Stick Letters",
    lines: 4,
    font: jsStickLetters,
  },
  {
    name: "Graceful",
    displayName: "Graceful",
    lines: 4,
    font: graceful,
  },
  {
    name: "Cyberlarge",
    displayName: "Cyberlarge",
    lines: 4,
    font: cyberlarge,
  },
  {
    name: "Mini",
    displayName: "Mini",
    lines: 4,
    font: mini,
  },
  {
    name: "Standard",
    displayName: "Standard",
    lines: 6,
    font: standard,
  },
  {
    name: "Graffiti",
    displayName: "Graffiti",
    lines: 6,
    font: graffiti,
  },
  {
    name: "Rectangles",
    displayName: "Rectangles",
    lines: 6,
    font: rectangles,
  },
  {
    name: "Banner",
    displayName: "Banner",
    lines: 8,
    font: banner,
  },
  {
    name: "Crawford",
    displayName: "Crawford",
    lines: 8,
    font: crawford,
  },
  {
    name: "DotMatrix",
    displayName: "Dot Matrix",
    lines: 10,
    font: dotMatrix,
  },
  {
    name: "Roman",
    displayName: "Roman",
    lines: 10,
    font: roman,
  },
];

for (const figletFont of figletFonts) {
  figlet.parseFont(figletFont.name, figletFont.font);
}
