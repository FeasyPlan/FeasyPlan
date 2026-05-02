const fs = require('fs');

let html = fs.readFileSync('./index.html', 'utf8');
html = html.replace('{{SUPABASE_KEY}}', process.env.SUPABASE_KEY || '');
fs.mkdirSync('./dist', { recursive: true });
fs.writeFileSync('./dist/index.html', html);
console.log('Build completo ✓');
