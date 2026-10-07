const fs = require("fs");
const path = require("path");

const outDir = process.env.VURA_OUT || "C:/Users/waabrent/Downloads/vura_signal/out";
const metadataDir = path.join(outDir, "metadata");
const files = fs.readdirSync(metadataDir).filter((f) => f.endsWith(".json")).sort();

// Drop CSV: token_id,name,description,file_name required; traits as attributes[TraitName]
let csv = "token_id,name,description,file_name,attributes[palette],attributes[rings],attributes[warp],attributes[tier],attributes[rarity]\n";
let ok = 0;

for (const file of files) {
  const fullPath = path.join(metadataDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const tokenId = parseInt(file.replace(".json", ""), 10);
    const name = (data.name || `VURA RINGS #${tokenId}`).replace(/"/g, '""');
    const desc = (data.description || "").replace(/"/g, '""');
    const attrs = {};
    for (const a of data.attributes || []) attrs[a.trait_type] = String(a.value).replace(/"/g, '""');
    // file_name must match the uploaded file exactly: no folder prefix
    const image = `${String(tokenId).padStart(5, "0")}.png`;
    csv += `${tokenId},"${name}","${desc}","${image}","${attrs.palette || ""}",${attrs.rings || ""},"${attrs.warp || ""}","${attrs.tier || ""}",${attrs.rarity || ""}\n`;    ok++;
  } catch (e) {
    console.log("skip:", file, e.message);
  }
}

const outPath = path.join(outDir, "metadata.csv");
fs.writeFileSync(outPath, csv);
console.log(`Done: ${ok}/${files.length} rows -> ${outPath}`);
