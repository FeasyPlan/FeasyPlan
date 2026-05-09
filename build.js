const fs = require('fs');
const path = require('path');

// Crear directorio dist
fs.mkdirSync('./dist', { recursive: true });

// Inyectar SUPABASE_KEY en index.html
let html = fs.readFileSync('./index.html', 'utf8');
html = html.replace('{{SUPABASE_KEY}}', process.env.SUPABASE_KEY || '');
fs.writeFileSync('./dist/index.html', html);

// Copiar páginas legales
fs.copyFileSync('./terminos.html', './dist/terminos.html');
fs.copyFileSync('./privacidad.html', './dist/privacidad.html');

console.log('Build completo ✓');
