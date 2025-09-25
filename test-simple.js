#!/usr/bin/env node

import { ScreenshotService } from './src/services/screenshotService.js';

async function testScreenshots() {
    console.log('🧪 Probando capturas de pantalla...');
    
    const screenshotService = new ScreenshotService();
    await screenshotService.inicializar();
    
    // Probar con URLs simples
    const urls = [
        'https://google.com',
        'https://github.com'
    ];
    
    for (let i = 0; i < urls.length; i++) {
        try {
            console.log(`📸 Capturando ${urls[i]}...`);
            const resultado = await screenshotService.capturarScreenshot(urls[i], i);
            console.log('✅ Resultado:', resultado);
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }
    
    await screenshotService.cerrar();
    console.log('🎉 Prueba completada');
}

testScreenshots().catch(console.error);
