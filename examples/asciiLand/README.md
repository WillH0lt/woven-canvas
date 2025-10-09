# Generate font data

.\msdf-atlas-gen.exe -font '.\Courier Prime Sans.ttf' -dimensions 512 512 -uniformgrid -imageout atlas.png -json fnt.json

.\msdf-atlas-gen.exe -font '.\Courier Prime Sans.ttf' -allglyphs -uniformgrid -uniformcell 42 71 -imageout atlas2.png -json fnt2.json

.\msdf-atlas-gen.exe -font '.\CourierPrimeSans.ttf' -charset chars.txt -uniformgrid -uniformcell 42 71 -imageout atlas2.png -json fnt2.json
