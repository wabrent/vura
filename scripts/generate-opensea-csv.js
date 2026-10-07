const fs = require('fs');
const path = require('path');

const TOTAL = 333;
const csvPath = path.join(__dirname, '../drop-assets/metadata.csv');

// Строгие заголовки OpenSea Studio: token_id, name, description, file_name, attributes[...]
let csvContent = 'token_id,name,description,file_name,attributes[Pass ID],attributes[Hex Color]\n';

for (let i = 1; i <= TOTAL; i++) {
  const jsonPath = path.join(__dirname, `../drop-assets/metadata/${i}.json`);
  let color = '#FFFFFF';

  if (fs.existsSync(jsonPath)) {
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const colorTrait = raw.attributes?.find(a => a.trait_type === 'Hex Color');
    if (colorTrait) color = colorTrait.value;
  }

  const idStr = String(i).padStart(3, '0');
  const name = `Vura Genesis Pass #${idStr}`;
  const description = `Official 1-bit genesis pass for VURA intelligence terminal. Verified on vura.ink.`;
  const fileName = `${i}.png`;

  csvContent += `${i},"${name}","${description}",${fileName},"${idStr}","${color}"\n`;
}

fs.writeFileSync(csvPath, csvContent);
console.log('✅ metadata.csv успешно обновлен под стандарты OpenSea!');
