const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('glamhub-api-postman.json', 'utf8'));
  console.log('✅ JSON is valid');
  console.log('Total items:', data.item.length);
  data.item.forEach((item, i) => {
    console.log(`${i}: ${item.name}`);
  });
  
  const clientFolder = data.item.find(i => i.name === 'Client');
  if (clientFolder) {
    console.log('\n✅ Client folder found');
    console.log('Subfolders:', clientFolder.item.map(f => f.name).join(', '));
    clientFolder.item.forEach(folder => {
      const count = folder.item ? folder.item.length : 0;
      console.log(`  ${folder.name}: ${count} endpoints`);
    });
  } else {
    console.log('\n❌ Client folder NOT found');
  }
} catch (e) {
  console.log('❌ JSON Error:', e.message);
  const match = e.message.match(/position (\d+)/);
  if (match) {
    const pos = parseInt(match[1]);
    const content = fs.readFileSync('glamhub-api-postman.json', 'utf8');
    const lineNum = content.substring(0, pos).split('\n').length;
    console.log('Error at line:', lineNum);
    console.log('Context:', content.substring(Math.max(0, pos - 50), Math.min(content.length, pos + 50)));
  }
}
