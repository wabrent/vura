const fs = require("fs");
const path = require("path");

const outDir = process.env.VURA_OUT || "C:/Users/waabrent/Downloads/vura_signal/out";
const metadataDir = path.join(outDir, "metadata");
const files = fs.readdirSync(metadataDir).filter((f) => f.endsWith(".json"));
let n = 0;
for (const file of files) {
  const p = path.join(metadataDir, file);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  const bare = path.basename(data.image || "");
  if (bare !== data.image) {
    data.image = bare;
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    n++;
  }
}
console.log(`fixed image field in ${n}/${files.length} json files`);
