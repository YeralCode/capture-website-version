#!/usr/bin/env node
import chalk from 'chalk';
import { InstagramScraperService } from './src/services/instagramScraperService.js';

async function main() {
  const username = process.argv[2] || 'rifaregionaldelcaribe_oficial';
  console.log(chalk.blue(`\n🚀 Probando InstagramScraperService para @${username}\n`));

  const svc = new InstagramScraperService({ directorioSalida: 'scraped_data', maxPosts: 5 });
  await svc.inicializar();

  try {
    const resultado = await svc.extraerPerfil(username);
    console.log(chalk.green('\n✅ Resultado:' ));
    console.log(JSON.stringify(resultado, null, 2));
  } catch (e) {
    console.error(chalk.red('\n❌ Error en extracción:'), e.message);
  }
}

main();







