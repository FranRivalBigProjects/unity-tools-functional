// ============================================
// CONFIGURACIÓN POR PLATAFORMA
// ============================================

const PLATFORM_CONFIG = {
android: {
name: ‘Android (APK/AAB)’,
baseEngineSize: 50,
recommendedSize: 150,
maxGooglePlay: 200,
compression: {
texture: 0.80,
mesh: 0.75,
audio: 0.60,
code: 0.70
},
note: ‘AAB permite Google optimizar por arquitectura’
},
ios: {
name: ‘iOS (IPA)’,
baseEngineSize: 80,
recommendedSize: 200,
maxAppStore: 4000,
compression: {
texture: 0.85,
mesh: 0.75,
audio: 0.50,
code: 0.70
},
note: ‘App Thinning permite optimizar por dispositivo’
},
pc: {
name: ‘PC (Windows EXE)’,
baseEngineSize: 150,
recommendedSize: 500,
maxGooglePlay: null,
compression: {
texture: 0.70,
mesh: 0.80,
audio: 0.40,
code: 0.75
},
note: ‘Distribuir vía Steam u itch.io’
},
mac: {
name: ‘macOS’,
baseEngineSize: 160,
recommendedSize: 500,
maxGooglePlay: null,
compression: {
texture: 0.70,
mesh: 0.80,
audio: 0.40,
code: 0.75
},
note: ‘Requiere code signing y notarización’
},
webgl: {
name: ‘WebGL’,
baseEngineSize: 40,
recommendedSize: 100,
maxGooglePlay: null,
compression: {
texture: 0.85,
mesh: 0.80,
audio: 0.50,
code: 0.60
},
note: ‘Gzipped/Brotli en servidor’
}
};

// ============================================
// CONFIGURACIÓN DE COMPRESIÓN
// ============================================

const COMPRESSION_TECHNIQUES = {
textureCompression: {
name: ‘Compresión de Texturas’,
factor: 0.25, // Reduce a 25% del tamaño original
categories: [‘texture’],
impact: ‘Alto’
},
meshCompression: {
name: ‘Mesh Compression’,
factor: 0.25,
categories: [‘meshes’],
impact: ‘Medio’
},
audioCompression: {
name: ‘Audio Compression’,
factor: 0.40,
categories: [‘audio’],
impact: ‘Alto’
},
lz4: {
name: ‘LZ4 Compression’,
factor: 0.65,
categories: [‘all’],
impact: ‘Medio’,
note: ‘+CPU en startup’
},
stripping: {
name: ‘Engine Stripping’,
factor: 0.70,
categories: [‘engine’],
impact: ‘Alto’
}
};

// ============================================
// FUNCIONES DE CÁLCULO
// ============================================

/**

- Calcula tamaño con compresión
- @param {number} originalSize - Tamaño original
- @param {array} compressionTechs - Técnicas de compresión activas
- @param {string} category - Categoría (texture, audio, meshes, code, engine)
- @returns {number} Tamaño comprimido
  */
  function calculateCompressedSize(originalSize, compressionTechs, category) {
  let factor = 1.0;
  
  compressionTechs.forEach(tech => {
  if (COMPRESSION_TECHNIQUES[tech]) {
  const techConfig = COMPRESSION_TECHNIQUES[tech];
  
  
       // Aplicar solo si aplica a esta categoría
       if (techConfig.categories.includes('all') || techConfig.categories.includes(category)) {
           factor *= techConfig.factor;
       }
   }
  
  
  });
  
  return originalSize * factor;
  }

/**

- Obtiene valores del formulario
- @returns {object|null} Configuración o null si hay error
  */
  function getFormValues() {
  const platform = document.getElementById(‘platform’).value;
  const textureSize = parseFloat(document.getElementById(‘textureSize’).value) || 0;
  const audioSize = parseFloat(document.getElementById(‘audioSize’).value) || 0;
  const meshesSize = parseFloat(document.getElementById(‘meshesSize’).value) || 0;
  const scenesSize = parseFloat(document.getElementById(‘scenesSize’).value) || 0;
  const codeSize = parseFloat(document.getElementById(‘codeSize’).value) || 0;
  const engineSize = parseFloat(document.getElementById(‘engineSize’).value) || 0;
  const bundleSize = parseFloat(document.getElementById(‘bundleSize’).value) || 0;
  
  // Obtener técnicas de compresión activas
  const activeTechs = [];
  [‘textureCompression’, ‘meshCompression’, ‘audioCompression’, ‘lz4’, ‘assetBundles’, ‘stripping’].forEach(tech => {
  if (document.getElementById(tech).checked) {
  activeTechs.push(tech);
  }
  });
  
  return {
  platform,
  textureSize,
  audioSize,
  meshesSize,
  scenesSize,
  codeSize,
  engineSize,
  bundleSize,
  activeTechs
  };
  }

/**

- Calcula tamaño total del build
  */
  function calculateBuildSize() {
  const config = getFormValues();
  if (!config) return;
  
  const platformConfig = PLATFORM_CONFIG[config.platform];
  
  // Tamaño original (incluyendo engine ajustado si no está en los inputs)
  const originalSizes = {
  texture: config.textureSize,
  audio: config.audioSize,
  meshes: config.meshesSize,
  scenes: config.scenesSize,
  code: config.codeSize,
  engine: config.engineSize
  };
  
  // Aplicar compresión
  const compressedSizes = {
  texture: calculateCompressedSize(config.textureSize, config.activeTechs, ‘texture’),
  audio: calculateCompressedSize(config.audioSize, config.activeTechs, ‘audio’),
  meshes: calculateCompressedSize(config.meshesSize, config.activeTechs, ‘meshes’),
  scenes: config.scenesSize, // Scenes no se comprimen tanto
  code: calculateCompressedSize(config.codeSize, config.activeTechs, ‘code’),
  engine: calculateCompressedSize(config.engineSize, config.activeTechs, ‘engine’)
  };
  
  // Totales
  const originalTotal = Object.values(originalSizes).reduce((a, b) => a + b, 0);
  const compressedTotal = Object.values(compressedSizes).reduce((a, b) => a + b, 0);
  
  // Asset bundles - se descuentan del build base si están activos
  let buildSizeBase = compressedTotal;
  if (config.activeTechs.includes(‘assetBundles’) && config.bundleSize > 0) {
  buildSizeBase -= config.bundleSize;
  }
  buildSizeBase = Math.max(buildSizeBase, 10); // Mínimo 10MB
  
  const savings = ((originalTotal - compressedTotal) / originalTotal) * 100;
  const downloadTime = (compressedTotal / 10).toFixed(1); // 10 MB/s aproximado
  
  // Actualizar UI
  document.getElementById(‘buildSize’).textContent = originalTotal.toFixed(1) + ’ MB’;
  document.getElementById(‘optimizedSize’).textContent = compressedTotal.toFixed(1) + ’ MB’;
  document.getElementById(‘savings’).textContent = savings.toFixed(1) + ‘%’;
  document.getElementById(‘downloadTime’).textContent = downloadTime + ’ sec’;
  
  // Generar tabla de categorías
  generateCategoryTable(originalSizes, compressedSizes, originalTotal, config.activeTechs);
  
  // Escenarios de descarga
  generateDownloadScenarios(compressedTotal);
  
  // Requisitos de store
  generateStoreRequirements(compressedTotal, config.platform);
  
  // Asset bundles analysis
  if (config.activeTechs.includes(‘assetBundles’) && config.bundleSize > 0) {
  document.getElementById(‘bundlesAnalysisSection’).style.display = ‘block’;
  document.getElementById(‘bundleBaseSize’).textContent = buildSizeBase.toFixed(1);
  document.getElementById(‘bundleTotalSize’).textContent = config.bundleSize.toFixed(1);
  document.getElementById(‘bundleTotal’).textContent = (buildSizeBase + config.bundleSize).toFixed(1);
  } else {
  document.getElementById(‘bundlesAnalysisSection’).style.display = ‘none’;
  }
  
  // Recomendaciones
  generateRecommendations(config, originalTotal, compressedTotal, originalSizes, compressedSizes);
  
  // Mostrar resultados
  document.getElementById(‘resultsSection’).style.display = ‘block’;
  document.getElementById(‘resultsSection’).scrollIntoView({ behavior: ‘smooth’, block: ‘start’ });
  }

/**

- Genera tabla de categorías
  */
  function generateCategoryTable(original, compressed, originalTotal, activeTechs) {
  const categories = [
  { name: ‘Texturas’, key: ‘texture’ },
  { name: ‘Audio’, key: ‘audio’ },
  { name: ‘Meshes’, key: ‘meshes’ },
  { name: ‘Escenas’, key: ‘scenes’ },
  { name: ‘Código’, key: ‘code’ },
  { name: ‘Engine’, key: ‘engine’ }
  ];
  
  const tbody = document.getElementById(‘categoryTableBody’);
  tbody.innerHTML = ‘’;
  
  categories.forEach(cat => {
  const origSize = original[cat.key];
  const compSize = compressed[cat.key];
  const percent = ((compSize / originalTotal) * 100).toFixed(1);
  const potential = ((origSize - compSize) / origSize * 100).toFixed(1);
  
  
   const tr = document.createElement('tr');
   tr.innerHTML = `
       <td>${cat.name}</td>
       <td>${origSize.toFixed(1)} MB</td>
       <td>${compSize.toFixed(1)} MB</td>
       <td>${percent}%</td>
       <td>${potential}% (${(origSize - compSize).toFixed(1)} MB)</td>
   `;
   tbody.appendChild(tr);
  
  
  });
  
  // Fila de totales
  const totalOrig = Object.values(original).reduce((a, b) => a + b, 0);
  const totalComp = Object.values(compressed).reduce((a, b) => a + b, 0);
  const trTotal = document.createElement(‘tr’);
  trTotal.style.fontWeight = ‘600’;
  trTotal.style.borderTop = ‘2px solid #2563eb’;
  trTotal.innerHTML = `<td><strong>TOTAL</strong></td> <td><strong>${totalOrig.toFixed(1)} MB</strong></td> <td><strong>${totalComp.toFixed(1)} MB</strong></td> <td><strong>100%</strong></td> <td><strong>${((totalOrig - totalComp) / totalOrig * 100).toFixed(1)}% (${(totalOrig - totalComp).toFixed(1)} MB)</strong></td>`;
  tbody.appendChild(trTotal);
  }

/**

- Genera escenarios de descarga
  */
  function generateDownloadScenarios(sizeInMB) {
  const scenarios = [
  { id: ‘scenario5g’, speed: 500, name: ‘5G’ },
  { id: ‘scenarioWifi’, speed: 100, name: ‘WiFi’ },
  { id: ‘scenario4g’, speed: 20, name: ‘4G’ },
  { id: ‘scenario3g’, speed: 5, name: ‘3G’ }
  ];
  
  scenarios.forEach(scenario => {
  const seconds = (sizeInMB * 8) / (scenario.speed * 1000); // bits / (Mbps * 1000)
  const timeStr = formatTime(seconds);
  document.getElementById(scenario.id).textContent = timeStr;
  });
  }

/**

- Formatea tiempo
  */
  function formatTime(seconds) {
  if (seconds < 60) {
  return Math.ceil(seconds) + ’ seg’;
  } else if (seconds < 3600) {
  const mins = (seconds / 60).toFixed(1);
  return mins + ’ min’;
  } else {
  const hours = (seconds / 3600).toFixed(1);
  return hours + ’ h’;
  }
  }

/**

- Genera tabla de requisitos de store
  */
  function generateStoreRequirements(sizeInMB, platform) {
  const requirements = [
  { store: ‘Google Play (APK)’, limit: 100, note: ‘Límite de APK. Usa AAB para más.’ },
  { store: ‘Google Play (AAB)’, limit: 200, note: ‘Recommended. Google optimiza.’ },
  { store: ‘App Store (iOS)’, limit: 4000, note: ‘Over-The-Air download limit’ },
  { store: ‘Steam (PC)’, limit: null, note: ‘Sin límite de tamaño. Pero afecta descarga.’ },
  { store: ‘itch.io’, limit: null, note: ‘Sin límite. Almacenamiento ilimitado.’ }
  ];
  
  const tbody = document.getElementById(‘storeTableBody’);
  tbody.innerHTML = ‘’;
  
  requirements.forEach(req => {
  const tr = document.createElement(‘tr’);
  
  
   let status = '✅ OK';
   let statusClass = 'ok';
   
   if (req.limit && sizeInMB > req.limit) {
       status = '❌ Excede';
       statusClass = 'warning';
   } else if (req.limit && sizeInMB > req.limit * 0.8) {
       status = '⚠️ Cercano';
       statusClass = 'caution';
   }
  
   tr.innerHTML = `
       <td>${req.store}</td>
       <td>${req.limit ? req.limit + ' MB' : 'Sin límite'}</td>
       <td class="status-${statusClass}">${status}</td>
       <td>${req.note}</td>
   `;
   tbody.appendChild(tr);
  
  
  });
  }

/**

- Genera recomendaciones
  */
  function generateRecommendations(config, originalTotal, compressedTotal, origSizes, compSizes) {
  const recommendations = [];
  const savings = ((originalTotal - compressedTotal) / originalTotal) * 100;
  
  // Recomendación 1: Texturas
  if (origSizes.texture > originalTotal * 0.4 && !config.activeTechs.includes(‘textureCompression’)) {
  recommendations.push({
  type: ‘warning’,
  text: `🎨 <strong>Texturas muy grandes:</strong> ${origSizes.texture.toFixed(0)}MB (${(origSizes.texture / originalTotal * 100).toFixed(0)}%). Activa compresión ASTC/ETC2. Potencial: -${(origSizes.texture * 0.75).toFixed(0)}MB`
  });
  }
  
  // Recomendación 2: Audio
  if (origSizes.audio > originalTotal * 0.2 && !config.activeTechs.includes(‘audioCompression’)) {
  recommendations.push({
  type: ‘warning’,
  text: `🔊 <strong>Audio sin comprimir:</strong> ${origSizes.audio.toFixed(0)}MB. Usa Vorbis/OGG. Potencial: -${(origSizes.audio * 0.6).toFixed(0)}MB`
  });
  }
  
  // Recomendación 3: Engine
  if (origSizes.engine > 100 && !config.activeTechs.includes(‘stripping’)) {
  recommendations.push({
  type: ‘warning’,
  text: `⚙️ <strong>Engine sin optimizar:</strong> ${origSizes.engine.toFixed(0)}MB. Usa Engine Stripping. Potencial: -${(origSizes.engine * 0.3).toFixed(0)}MB`
  });
  }
  
  // Recomendación 4: Asset Bundles
  if (originalTotal > 100 && !config.activeTechs.includes(‘assetBundles’)) {
  recommendations.push({
  type: ‘info’,
  text: `📦 <strong>Considera Asset Bundles:</strong> Descarga contenido bajo demanda. Divide en: core gameplay (~50MB) + cosmética/niveles (bajo demanda)`
  });
  }
  
  // Recomendación 5: Objetivo alcanzable
  const recommendedSize = PLATFORM_CONFIG[config.platform].recommendedSize;
  if (compressedTotal > recommendedSize) {
  recommendations.push({
  type: ‘warning’,
  text: `🎯 <strong>Exceeds recommended size:</strong> ${compressedTotal.toFixed(0)}MB vs objetivo ${recommendedSize}MB. Necesitas -${(compressedTotal - recommendedSize).toFixed(0)}MB más.`
  });
  } else if (compressedTotal <= recommendedSize * 0.7) {
  recommendations.push({
  type: ‘success’,
  text: `🚀 <strong>Tamaño excelente:</strong> ${compressedTotal.toFixed(0)}MB es muy bueno. Optimización completada.`
  });
  }
  
  // Recomendación 6: LZ4
  if (savings < 40 && !config.activeTechs.includes(‘lz4’)) {
  recommendations.push({
  type: ‘info’,
  text: `💾 <strong>LZ4 Compression:</strong> Si necesitas más reducción, activa LZ4 (~35% adicional). Trade-off: +CPU en startup.`
  });
  }
  
  // Recomendación 7: Mesh Compression
  if (origSizes.meshes > 50 && !config.activeTechs.includes(‘meshCompression’)) {
  recommendations.push({
  type: ‘info’,
  text: `📐 <strong>Mesh Compression:</strong> Meshes: ${origSizes.meshes.toFixed(0)}MB. Activa si no está. Potencial: -${(origSizes.meshes * 0.25).toFixed(0)}MB`
  });
  }
  
  // Renderizar
  const list = document.getElementById(‘recommendationsList’);
  list.innerHTML = ‘’;
  
  if (recommendations.length === 0) {
  list.innerHTML = ‘<li class="rec-success">✅ No hay recomendaciones. Build bien optimizado.</li>’;
  } else {
  recommendations.forEach(rec => {
  const li = document.createElement(‘li’);
  li.className = `rec-${rec.type}`;
  li.innerHTML = rec.text;
  list.appendChild(li);
  });
  }
  }

/**

- Actualiza valores por defecto según plataforma
  */
  function updatePlatformDefaults() {
  const platform = document.getElementById(‘platform’).value;
  
  // Mostrar/ocultar select de arquitectura Android
  const deviceSelect = document.getElementById(‘targetDevice’).parentElement;
  if (platform === ‘android’) {
  document.getElementById(‘targetDevice’).style.display = ‘block’;
  document.getElementById(‘deviceInfo’).style.display = ‘none’;
  } else {
  document.getElementById(‘targetDevice’).style.display = ‘none’;
  document.getElementById(‘deviceInfo’).style.display = ‘block’;
  }
  
  // Mostrar/ocultar Asset Bundle size si aplica
  const bundleGroup = document.getElementById(‘bundleSizeGroup’);
  bundleGroup.style.display = ‘block’; // Disponible para todas las plataformas
  }

/**

- Event listener para Asset Bundles checkbox
  */
  document.addEventListener(‘DOMContentLoaded’, function() {
  const assetBundlesCheckbox = document.getElementById(‘assetBundles’);
  if (assetBundlesCheckbox) {
  assetBundlesCheckbox.addEventListener(‘change’, function() {
  const bundleGroup = document.getElementById(‘bundleSizeGroup’);
  if (this.checked) {
  bundleGroup.style.display = ‘block’;
  } else {
  bundleGroup.style.display = ‘none’;
  }
  });
  }
  
  // Enter key para calcular
  const inputs = document.querySelectorAll(‘input[type=“number”], select’);
  inputs.forEach(input => {
  input.addEventListener(‘keypress’, function(e) {
  if (e.key === ‘Enter’) calculateBuildSize();
  });
  });
  });