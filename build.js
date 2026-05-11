const fs = require('fs');

// Crear directorio dist
fs.mkdirSync('./dist', { recursive: true });

// Inyectar SUPABASE_KEY en index.html
let html = fs.readFileSync('./index.html', 'utf8');
html = html.replace('{{SUPABASE_KEY}}', process.env.SUPABASE_KEY || '');
fs.writeFileSync('./dist/index.html', html);

// Copiar páginas legales y de error
['terminos.html', 'privacidad.html', 'cookies.html', '404.html'].forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, './dist/' + file);
    console.log('Copiado:', file);
  }
});

console.log('Build completo ✓');
