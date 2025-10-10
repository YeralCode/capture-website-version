import { IntegratedScrapingService } from './src/services/integratedScrapingService.js';
import chalk from 'chalk';
import fs from 'fs/promises';

async function testUrlsCompleto() {
  console.log(chalk.blue('\n🧪 TEST COMPLETO DE DETECCIÓN DE BLOQUEOS\n'));

  // Leer URLs del archivo
  const urlsContent = await fs.readFile('url_test_post.txt', 'utf-8');
  const urls = urlsContent.trim().split('\n').filter(url => url.trim());

  // Resultados esperados
  const esperados = {
    'https://instagram.com/pokergold.co': 'BLOQUEADO',
    'https://m.facebook.com/BINGO-Tucano-102796294764843': 'BLOQUEADO',
    'https://www.facebook.com/Bingoparatodos': 'NO BLOQUEADO',
    'https://www.instagram.com/onexbet_org': 'NO BLOQUEADO',
    'https://www.facebook.com/bingosocialsas': 'NO BLOQUEADO',
    'https://www.facebook.com/sonpopularipiales/videos/423654431994416': 'NO BLOQUEADO',
    'https://www.tiktok.com/@1xbet_team': 'NO BLOQUEADO',
    'https://www.facebook.com/bet365us': 'NO BLOQUEADO',
    'https://www.facebook.com/elmundodejuancho': 'NO BLOQUEADO',
    'https://web.facebook.com/profile.php?id=61563445625314&_rdc=1&_rdr': 'NO BLOQUEADO',
    'https://www.instagram.com/sorteorealcolombia/': 'NO BLOQUEADO',
    'https://www.facebook.com/profile.php?id=61559199419997': 'NO BLOQUEADO',
    'https://www.instagram.com/ashly.0507/': 'NO BLOQUEADO'
  };

  const integratedService = new IntegratedScrapingService({
    screenshots: {
      concurrencia: 2,
      usarNavegadorReal: true
    }
  });

  try {
    await integratedService.inicializar();

    const resultados = [];
    let correctos = 0;
    let incorrectos = 0;

    for (const url of urls) {
      const resultado = await integratedService.procesarUrlParaScreenshot(url);
      
      const estado = resultado.evaluacionContenido.tieneContenido ? 'NO BLOQUEADO' : 'BLOQUEADO';
      const esperado = esperados[url] || 'DESCONOCIDO';
      const esCorrecto = estado === esperado;
      
      if (esCorrecto) correctos++;
      else incorrectos++;

      resultados.push({
        url,
        tipo: resultado.tipo,
        estado,
        esperado,
        correcto: esCorrecto,
        razon: resultado.evaluacionContenido.razon,
        detalles: resultado.evaluacionContenido.detalles
      });

      console.log(esCorrecto ? chalk.green('✓') : chalk.red('✗'), url.substring(0, 60) + (url.length > 60 ? '...' : ''));
    }

    // Mostrar tabla de resultados
    console.log(chalk.yellow('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.yellow('TABLA DE RESULTADOS:'));
    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    resultados.forEach((r, i) => {
      const urlCorta = r.url.length > 60 ? r.url.substring(0, 60) + '...' : r.url;
      console.log(chalk.cyan(`${i + 1}. ${urlCorta}`));
      console.log(`   Tipo: ${r.tipo.toUpperCase()}`);
      console.log(`   Estado: ${r.estado === 'BLOQUEADO' ? chalk.red(r.estado) : chalk.green(r.estado)}`);
      console.log(`   Esperado: ${r.esperado === 'BLOQUEADO' ? chalk.red(r.esperado) : chalk.green(r.esperado)}`);
      console.log(`   ${r.correcto ? chalk.green('✅ CORRECTO') : chalk.red('❌ INCORRECTO')}`);
      console.log(`   Razón: ${r.razon}`);
      console.log();
    });

    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.yellow('RESUMEN:'));
    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    
    const total = correctos + incorrectos;
    const porcentaje = ((correctos / total) * 100).toFixed(1);
    
    console.log(chalk.green(`✅ Correctos: ${correctos}/${total} (${porcentaje}%)`));
    console.log(chalk.red(`❌ Incorrectos: ${incorrectos}/${total}`));
    console.log();

  } catch (error) {
    console.error(chalk.red(`\n✖ ❌ Error: ${error.message}`));
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
  } finally {
    await integratedService.cerrar();
    console.log(chalk.green('✅ TEST COMPLETADO\n'));
  }
}

testUrlsCompleto();


