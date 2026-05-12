// ============================================
// CONFIGURACIÓN DE PLATAFORMAS
// ============================================

const PLATFORM_CONFIGS = {
pc: {
name: ‘PC (Desktop)’,
baselineGpuPower: 100,
maxDrawCalls: 2000,
recommendedRes: ‘1920x1080’,
defaultWidth: 1920,
defaultHeight: 1080
},
mobile: {
name: ‘Mobile (Android/iOS)’,
baselineGpuPower: 30,
maxDrawCalls: 1000,
recommendedRes: ‘1080x1920’,
defaultWidth: 1080,
defaultHeight: 1920
},
console: {
name: ‘Consola (PS5/Xbox Series X)’,
baselineGpuPower: 200,
maxDrawCalls: 3000,
recommendedRes: ‘3840x2160’,
defaultWidth: 3840,
defaultHeight: 2160
},
vr: {
name: ‘VR (Meta Quest / SteamVR)’,
baselineGpuPower: 25,
maxDrawCalls: 800,
recommendedRes: ‘1024x1024 (per eye)’,
defaultWidth: 1024,
defaultHeight: 1024
},
web: {
name: ‘Web (Browser)’,
baselineGpuPower: 20,
maxDrawCalls: 500,
recommendedRes: ‘1280x720’,
defaultWidth: 1280,
defaultHeight: 720
}
};

// ============================================
// CONFIGURACIÓN DE EFECTOS
// ============================================

const EFFECTS_CONFIG = {
postProcessing: {
name: ‘Post-processing’,
fpsImpact: -15,
description: ‘Bloom, tone mapping, color grading’
},
dynamicLights: {
name: ‘Luces dinámicas’,
fpsImpact: -20,
description: ‘Real-time dynamic lights con shadows’
},
shadows: {
name: ‘Sombras en tiempo real’,
fpsImpact: -15,
description: ‘Shadow maps, cascadas’
},
reflections: {
name: ‘Reflexiones (SSR/Planar)’,
fpsImpact: -18,
description: ‘Screen-space reflections’
},
particles: {
name: ‘Sistema de partículas’,
fpsImpact: -12,
description: ‘Simulación y rendering de partículas’
},
volumetrics: {
name: ‘Efectos volumétricos’,
fpsImpact: -25,
description: ‘Volumetric fog, god rays’
}
};

// ============================================
// CONFIGURACIÓN DE SHADERS
// ============================================

const SHADER_CONFIG = {
low: {
name: ‘Bajo’,
pixelCost: 0.5,
description: ‘Shaders simples (difuso)’
},
medium: {
name: ‘Medio’,
pixelCost: 1.0,
description: ‘PBR estándar’
},
high: {
name: ‘Alto’,
pixelCost: 1.5,
description: ‘Múltiples texturas + normal maps’
},
‘very-high’: {
name: ‘Muy Alto’,
pixelCost: 2.5,
description: ‘Parallax mapping + detalles’
}
};

// ============================================
// FUNCIONES DE CÁLCULO BASE
// ============================================

/**

- Calcula el número de píxeles a procesar
- @param {number} width - Ancho de pantalla
- @param {number} height - Alto de pantalla
- @returns {number} Total de píxeles
  */
  function calculatePixels(width, height) {
  return width * height;
  }

/**

- Calcula el costo de rendering de píxeles (fragment shader)
- @param {number} pixels - Total de píxeles
- @param {string} shaderComplexity - Nivel de complejidad
- @returns {number} Costo relativo
  */
  function calculatePixelCost(pixels, shaderComplexity) {
  const shaderCost = SHADER_CONFIG[shaderComplexity].pixelCost;
  // Normaliza a 1M de píxeles
  return (pixels / 1000000) * shaderCost;
  }

/**

- Calcula el costo de triángulos (geometry/vertex shader)
- @param {number} triangles - Número de triángulos
- @returns {number} Costo relativo
  */
  function calculateTriangleCost(triangles) {
  // Divide por 10 millones como baseline
  return triangles / 10000000;
  }

/**

- Calcula el costo de draw calls (overhead de CPU)
- @param {number} drawCalls - Número de draw calls
- @param {number} platformPower - Potencia base de la plataforma
- @returns {number} Costo relativo
  */
  function calculateDrawCallCost(drawCalls, platformPower) {
  // Cada draw call por encima de 100 cuesta más
  const baseCost = Math.min(drawCalls / 100, 3);
  return baseCost / (platformPower / 50);
  }

/**

- Calcula impacto acumulativo de efectos
- @param {array} activeEffects - Array de efectos activos
- @returns {number} Porcentaje de impacto (-0.X)
  */
  function calculateEffectsImpact(activeEffects) {
  let totalImpact = 0;
  activeEffects.forEach(effect => {
  if (EFFECTS_CONFIG[effect]) {
  totalImpact += EFFECTS_CONFIG[effect].fpsImpact;
  }
  });
  return totalImpact / 100; // Convierte a porcentaje
  }

/**

- Estima FPS basado en múltiples factores
- @param {object} config - Configuración completa
- @returns {number} FPS estimado
  */
  function estimateFPS(config) {
  const {
  platform,
  screenWidth,
  screenHeight,
  triangles,
  drawCalls,
  activeEffects,
  shaderComplexity,
  targetFps
  } = config;
  
  // Potencia base de la plataforma
  const platformPower = PLATFORM_CONFIGS[platform].baselineGpuPower;
  
  // Cálculos de costo
  const pixels = calculatePixels(screenWidth, screenHeight);
  const pixelCost = calculatePixelCost(pixels, shaderComplexity);
  const triangleCost = calculateTriangleCost(triangles);
  const drawCallCost = calculateDrawCallCost(drawCalls, platformPower);
  const effectsImpact = calculateEffectsImpact(activeEffects);
  
  // Total cost (suma ponderada)
  const totalCost = (pixelCost * 0.4) + (triangleCost * 0.25) + (drawCallCost * 0.2) + (effectsImpact * 100 * 0.15);
  
  // FPS base antes de efectos
  const baseFPS = Math.max(30, platformPower * 0.75 - totalCost * 10);
  
  // Aplicar impacto de efectos
  const estimatedFPS = baseFPS * (1 + effectsImpact);
  
  // Limitar a valores realistas
  return Math.max(1, Math.round(estimatedFPS));
  }

/**

- Determina el estado de rendimiento
- @param {number} fps - FPS estimado
- @param {number} targetFps - FPS meta
- @returns {object} Objeto con status y descripción
  */
  function getPerformanceStatus(fps, targetFps) {
  const ratio = fps / targetFps;
  
  if (ratio >= 1.5) {
  return {
  status: ‘EXCELENTE’,
  class: ‘excellent’,
  description: `${fps} FPS - Muy por encima del objetivo. Puedes agregar más efectos.`,
  color: ‘#10b981’
  };
  } else if (ratio >= 1) {
  return {
  status: ‘BUENO’,
  class: ‘good’,
  description: `${fps} FPS - Alcanzable. Rendimiento estable.`,
  color: ‘#3b82f6’
  };
  } else if (ratio >= 0.8) {
  return {
  status: ‘ACEPTABLE’,
  class: ‘fair’,
  description: `${fps} FPS - Cercano al objetivo. Algunos drops posibles.`,
  color: ‘#f59e0b’
  };
  } else {
  return {
  status: ‘DEFICIENTE’,
  class: ‘poor’,
  description: `${fps} FPS - Por debajo del objetivo. Requiere optimización.`,
  color: ‘#ef4444’
  };
  }
  }

/**

- Calcula tiempo de frame en milisegundos
- @param {number} fps - FPS estimado
- @returns {number} Tiempo en ms
  */
  function getFrameTime(fps) {
  return (1000 / fps).toFixed(2);
  }

/**

- Obtiene valores del formulario
- @returns {object|null} Configuración o null si hay error
  */
  function getFormValues() {
  const platform = document.getElementById(‘platform’).value;
  const screenWidth = parseInt(document.getElementById(‘screenWidth’).value);
  const screenHeight = parseInt(document.getElementById(‘screenHeight’).value);
  const triangles = parseInt(document.getElementById(‘triangleCount’).value);
  const drawCalls = parseInt(document.getElementById(‘drawCalls’).value);
  const shaderComplexity = document.getElementById(‘shaderComplexity’).value;
  const targetFps = parseInt(document.getElementById(‘targetFps’).value);
  
  // Obtener efectos activos
  const activeEffects = [];
  [‘postProcessing’, ‘dynamicLights’, ‘shadows’, ‘reflections’, ‘particles’, ‘volumetrics’].forEach(effect => {
  if (document.getElementById(effect).checked) {
  activeEffects.push(effect);
  }
  });
  
  // Validaciones
  if (!screenWidth || !screenHeight || screenWidth < 320 || screenHeight < 240) {
  alert(‘❌ Resolución inválida. Mínimo 320x240.’);
  return null;
  }
  
  if (!triangles || triangles < 10000 || !drawCalls || drawCalls < 1) {
  alert(‘❌ Valores de geometría inválidos.’);
  return null;
  }
  
  return {
  platform,
  screenWidth,
  screenHeight,
  triangles,
  drawCalls,
  activeEffects,
  shaderComplexity,
  targetFps
  };
  }

/**

- Genera recomendaciones de optimización
- @param {object} config - Configuración
- @param {number} estimatedFps - FPS estimado
- @returns {array} Array de recomendaciones
  */
  function generateRecommendations(config, estimatedFps) {
  const recommendations = [];
  const { platform, screenWidth, screenHeight, triangles, drawCalls, activeEffects, targetFps } = config;
  const maxDrawCalls = PLATFORM_CONFIGS[platform].maxDrawCalls;
  const ratio = estimatedFps / targetFps;
  
  // Recomendación 1: Draw calls
  if (drawCalls > maxDrawCalls * 0.8) {
  recommendations.push({
  type: ‘warning’,
  text: `⚠️ <strong>Draw Calls altos:</strong> Tienes ${drawCalls} DC (max recomendado: ${maxDrawCalls}). Usa batching, atlasing o instancing.`
  });
  }
  
  // Recomendación 2: Resolución
  if ((screenWidth * screenHeight) > 8000000 && platform === ‘mobile’) {
  recommendations.push({
  type: ‘warning’,
  text: `📱 <strong>Resolución muy alta para móvil:</strong> ${screenWidth}x${screenHeight} es demasiado. Reduce a 1080x1920 o menos.`
  });
  }
  
  // Recomendación 3: Triángulos
  if (triangles > 10000000) {
  recommendations.push({
  type: ‘warning’,
  text: `📐 <strong>Muchos triángulos:</strong> ${(triangles / 1000000).toFixed(0)}M triángulos. Implementa LOD groups y frustum culling.`
  });
  }
  
  // Recomendación 4: Efectos pesados
  if (activeEffects.length >= 4) {
  recommendations.push({
  type: ‘warning’,
  text: `✨ <strong>Muchos efectos activos:</strong> ${activeEffects.length} efectos pesados. Desactiva algunos para móvil o dispositivos bajos.`
  });
  }
  
  // Recomendación 5: Shaders
  if (config.shaderComplexity === ‘very-high’ && ratio < 1) {
  recommendations.push({
  type: ‘warning’,
  text: `🎨 <strong>Shaders muy complejos:</strong> Simplifica a "Alto" o usa half-resolution para cálculos complejos.`
  });
  }
  
  // Recomendación 6: Dinámicas de luz
  if (activeEffects.includes(‘dynamicLights’) && activeEffects.includes(‘shadows’) && drawCalls > 500) {
  recommendations.push({
  type: ‘info’,
  text: `💡 <strong>Luces dinámicas + Sombras:</strong> Esto es costoso. Considera usar sombras baked para objetos estáticos.`
  });
  }
  
  // Recomendación 7: Post-processing
  if (activeEffects.includes(‘postProcessing’) && ratio < 1) {
  recommendations.push({
  type: ‘success’,
  text: `🎬 <strong>Desactiva post-processing temporal:</strong> Prueba sin bloom/tone-mapping para ver el impacto real.`
  });
  }
  
  // Recomendación 8: Volumetrics
  if (activeEffects.includes(‘volumetrics’)) {
  recommendations.push({
  type: ‘info’,
  text: `☁️ <strong>Efectos volumétricos:</strong> Usa resolución reducida (quarter-res) para fog/god rays.`
  });
  }
  
  // Recomendación general
  if (ratio < 0.8) {
  recommendations.push({
  type: ‘warning’,
  text: `🔧 <strong>Rendimiento insuficiente:</strong> Necesitas optimizar. Prioriza: reducir draw calls, simplificar shaders, desactivar efectos.`
  });
  } else if (ratio >= 1.5) {
  recommendations.push({
  type: ‘success’,
  text: `🚀 <strong>Mucho headroom:</strong> Tienes espacio para agregar más contenido. Considera aumentar geometría, efectos o resolución.`
  });
  }
  
  return recommendations;
  }

/**

- Calcula impacto individual de cada efecto
- @param {array} activeEffects - Efectos activos
- @returns {array} Array con impacto de cada efecto
  */
  function getEffectsBreakdown(activeEffects) {
  const breakdown = [];
  
  [‘postProcessing’, ‘dynamicLights’, ‘shadows’, ‘reflections’, ‘particles’, ‘volumetrics’].forEach(effect => {
  const config = EFFECTS_CONFIG[effect];
  const isActive = activeEffects.includes(effect);
  breakdown.push({
  name: config.name,
  impact: config.fpsImpact,
  active: isActive,
  description: config.description
  });
  });
  
  return breakdown;
  }

/**

- Genera reporte de efectos en HTML
- @param {array} breakdown - Desglose de efectos
- @returns {string} HTML del gráfico
  */
  function generateEffectsChart(breakdown) {
  let html = ‘<div class="effects-list">’;
  
  breakdown.forEach(effect => {
  const barWidth = Math.abs(effect.impact) * 3;
  const color = effect.active ? (effect.impact < 0 ? ‘#ef4444’ : ‘#10b981’) : ‘#d1d5db’;
  const opacity = effect.active ? 1 : 0.3;
  
  
   html += `
       <div class="effect-row">
           <span class="effect-name">${effect.name}</span>
           <div class="effect-bar-container">
               <div class="effect-bar" style="width: ${barWidth}px; background-color: ${color}; opacity: ${opacity};"></div>
               <span class="effect-impact">${effect.active ? effect.impact : '—'} FPS</span>
           </div>
       </div>
   `;
  
  
  });
  
  html += ‘</div>’;
  return html;
  }

/**

- Actualiza valores por defecto según plataforma
  */
  function updatePlatformDefaults() {
  const platform = document.getElementById(‘platform’).value;
  const config = PLATFORM_CONFIGS[platform];
  
  document.getElementById(‘screenWidth’).value = config.defaultWidth;
  document.getElementById(‘screenHeight’).value = config.defaultHeight;
  }

/**

- Función principal de cálculo
  */
  function calculateFPS() {
  const config = getFormValues();
  if (!config) return;
  
  // Cálculo principal
  const estimatedFps = estimateFPS(config);
  const frameTime = getFrameTime(estimatedFps);
  const performanceStatus = getPerformanceStatus(estimatedFps, config.targetFps);
  const gpuLoad = Math.min(100, Math.round((config.targetFps / estimatedFps) * 100));
  
  // Actualizar resultados principales
  document.getElementById(‘estimatedFps’).textContent = estimatedFps;
  document.getElementById(‘frameTime’).textContent = frameTime + ’ ms’;
  document.getElementById(‘gpuLoad’).textContent = gpuLoad + ‘%’;
  
  // Actualizar badge de estado
  const statusBadge = document.getElementById(‘performanceStatus’);
  statusBadge.textContent = performanceStatus.status;
  statusBadge.className = `result-value performance-badge ${performanceStatus.class}`;
  document.getElementById(‘performanceDesc’).textContent = performanceStatus.description;
  
  // Detalles
  document.getElementById(‘resDetail’).textContent = `${config.screenWidth}x${config.screenHeight}`;
  document.getElementById(‘trisDetail’).textContent = `${(config.triangles / 1000000).toFixed(1)}M`;
  document.getElementById(‘dcDetail’).textContent = `${config.drawCalls}`;
  document.getElementById(‘shaderDetail’).textContent = SHADER_CONFIG[config.shaderComplexity].name;
  document.getElementById(‘effectsDetail’).textContent = config.activeEffects.length > 0 ? config.activeEffects.length + ’ efectos’ : ‘Ninguno’;
  document.getElementById(‘targetVsReal’).textContent = estimatedFps >= config.targetFps ? ‘✅ Sí’ : ‘❌ No’;
  
  // Recomendaciones
  const recommendations = generateRecommendations(config, estimatedFps);
  const recommendationsList = document.getElementById(‘recommendationsList’);
  recommendationsList.innerHTML = ‘’;
  
  recommendations.forEach(rec => {
  const li = document.createElement(‘li’);
  li.className = `rec-${rec.type}`;
  li.innerHTML = rec.text;
  recommendationsList.appendChild(li);
  });
  
  // Gráfico de efectos
  const effectsBreakdown = getEffectsBreakdown(config.activeEffects);
  document.getElementById(‘effectsChart’).innerHTML = generateEffectsChart(effectsBreakdown);
  
  // Mostrar resultados
  document.getElementById(‘resultsSection’).style.display = ‘block’;
  document.getElementById(‘resultsSection’).scrollIntoView({ behavior: ‘smooth’, block: ‘start’ });
  }

// Event listeners
document.addEventListener(‘DOMContentLoaded’, function() {
const inputs = document.querySelectorAll(‘input[type=“number”], select’);
inputs.forEach(input => {
input.addEventListener(‘keypress’, function(e) {
if (e.key === ‘Enter’) calculateFPS();
});
});
});