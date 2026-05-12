// ============================================
// CONFIGURACIÓN POR PLATAFORMA
// ============================================

const PLATFORM_TARGETS = {
pc: {
name: ‘PC (Desktop)’,
maxDrawCalls: 2000,
recommendedTarget: 1500,
batchingEfficiency: 0.75
},
mobile: {
name: ‘Mobile (Android/iOS)’,
maxDrawCalls: 1000,
recommendedTarget: 600,
batchingEfficiency: 0.85
},
console: {
name: ‘Consola (PS5/Xbox Series X)’,
maxDrawCalls: 3000,
recommendedTarget: 2000,
batchingEfficiency: 0.70
},
vr: {
name: ‘VR (Meta Quest)’,
maxDrawCalls: 500,
recommendedTarget: 300,
batchingEfficiency: 0.90
}
};

// ============================================
// CONFIGURACIÓN DE TÉCNICAS DE BATCHING
// ============================================

const BATCHING_TECHNIQUES = {
staticBatching: {
name: ‘Static Batching’,
reduction: 0.40, // Reduce 40% de DC
requirements: ‘Meshes estáticos/inmóviles’,
complexity: ‘Baja’,
memoryImpact: ‘Medio (aumenta memoria)’
},
dynamicBatching: {
name: ‘Dynamic Batching’,
reduction: 0.25, // Reduce 25% de DC
requirements: ‘Meshes < 900 vértices’,
complexity: ‘Media’,
memoryImpact: ‘Bajo’
},
gpuInstancing: {
name: ‘GPU Instancing’,
reduction: 0.30, // Reduce 30% de DC
requirements: ‘Meshes repetidas con mismo material’,
complexity: ‘Media’,
memoryImpact: ‘Muy bajo’
},
atlasing: {
name: ‘Texture Atlasing’,
reduction: 0.15, // Reduce 15% de DC
requirements: ‘Consolidar texturas’,
complexity: ‘Alta (requiere rework)’,
memoryImpact: ‘Bajo/Medio’
}
};

// ============================================
// FUNCIONES DE CÁLCULO BASE
// ============================================

/**

- Calcula DC overhead por materiales
- @param {number} meshCount - Número de meshes
- @param {number} materialCount - Número de materiales únicos
- @returns {number} DC adicionales por cambios de material
  */
  function calculateMaterialOverhead(meshCount, materialCount) {
  // Ratio meshes por material
  const meshPerMaterial = Math.max(1, meshCount / materialCount);
  // Cada cambio de material es 1 DC adicional
  return materialCount;
  }

/**

- Calcula DC por renderers (opacos + transparentes)
- @param {number} opaqueRenderers - Renderers opacos
- @param {number} transparentRenderers - Renderers transparentes
- @param {number} efficiency - Eficiencia de batching (0-1)
- @returns {number} DC base
  */
  function calculateRendererDC(opaqueRenderers, transparentRenderers, efficiency) {
  // Los transparentes siempre son más caros (sorted)
  const opaqueDC = Math.ceil(opaqueRenderers * efficiency);
  const transparentDC = Math.ceil(transparentRenderers * efficiency * 1.5); // 50% más overhead
  return opaqueDC + transparentDC;
  }

/**

- Calcula DC adicionales por luces dinámicas
- @param {number} dynamicLights - Número de luces dinámicas
- @param {number} meshCount - Número de meshes
- @param {string} renderingPath - ‘forward’ o ‘deferred’
- @returns {number} DC adicionales por luces
  */
  function calculateLightDC(dynamicLights, meshCount, renderingPath) {
  if (renderingPath === ‘deferred’) {
  // Deferred: 1-2 DC por luz adicional (no depende de meshes)
  return Math.min(dynamicLights * 2, 20);
  } else {
  // Forward: N DC por cada luz (1 por light+mesh combination)
  // Pero limitado porque muchos meshes pueden recibir la misma luz
  return Math.ceil(dynamicLights * Math.sqrt(meshCount) * 0.1);
  }
  }

/**

- Calcula DC por sombras dinámicas
- @param {number} shadowCastingLights - Luces que castean sombras
- @returns {number} DC adicionales
  */
  function calculateShadowDC(shadowCastingLights) {
  // 2-3 DC por luz (shadow map + rendering)
  return shadowCastingLights * 3;
  }

/**

- Calcula impacto total de técnicas de batching ya aplicadas
- @param {array} activeTechniques - Técnicas activas
- @returns {number} Multiplicador de DC (0-1, donde 1 = sin optimización)
  */
  function calculateBatchingImpact(activeTechniques) {
  let totalReduction = 0;
  
  activeTechniques.forEach(technique => {
  if (BATCHING_TECHNIQUES[technique]) {
  totalReduction += BATCHING_TECHNIQUES[technique].reduction;
  }
  });
  
  // Max 80% de reducción (nunca puedes eliminar completamente)
  totalReduction = Math.min(0.80, totalReduction);
  
  return 1 - totalReduction;
  }

/**

- Obtiene valores del formulario
- @returns {object|null} Configuración o null si hay error
  */
  function getFormValues() {
  const platform = document.getElementById(‘platform’).value;
  const currentDC = parseInt(document.getElementById(‘currentDrawCalls’).value);
  const targetDC = parseInt(document.getElementById(‘targetDrawCalls’).value);
  const meshCount = parseInt(document.getElementById(‘meshCount’).value);
  const materialCount = parseInt(document.getElementById(‘materialCount’).value);
  const opaqueRenderers = parseInt(document.getElementById(‘opaqueRenderers’).value);
  const transparentRenderers = parseInt(document.getElementById(‘transparentRenderers’).value);
  const dynamicLights = parseInt(document.getElementById(‘dynamicLights’).value) || 0;
  const shadowCastingLights = parseInt(document.getElementById(‘shadowCastingLights’).value) || 0;
  const renderingPath = document.getElementById(‘renderingPath’).value;
  
  // Obtener técnicas activas
  const activeTechniques = [];
  [‘staticBatching’, ‘dynamicBatching’, ‘gpuInstancing’, ‘atlasing’, ‘spatialCulling’, ‘lod’].forEach(tech => {
  if (document.getElementById(tech).checked) {
  activeTechniques.push(tech);
  }
  });
  
  // Validaciones
  if (!currentDC || currentDC < 1 || !targetDC || targetDC < 1) {
  alert(‘❌ Draw calls inválidos.’);
  return null;
  }
  
  if (!meshCount || meshCount < 1 || !materialCount || materialCount < 1) {
  alert(‘❌ Meshes/Materiales inválidos.’);
  return null;
  }
  
  return {
  platform,
  currentDC,
  targetDC,
  meshCount,
  materialCount,
  opaqueRenderers,
  transparentRenderers,
  dynamicLights,
  shadowCastingLights,
  renderingPath,
  activeTechniques
  };
  }

/**

- Analiza y calcula potencial de optimización
  */
  function analyzeDC() {
  const config = getFormValues();
  if (!config) return;
  
  const { platform, currentDC, targetDC, meshCount, materialCount, opaqueRenderers, transparentRenderers, dynamicLights, shadowCastingLights, renderingPath, activeTechniques } = config;
  
  const platformConfig = PLATFORM_TARGETS[platform];
  
  // Cálculos
  const batchingImpact = calculateBatchingImpact(activeTechniques);
  const materialOverhead = calculateMaterialOverhead(meshCount, materialCount);
  const rendererDC = calculateRendererDC(opaqueRenderers, transparentRenderers, platformConfig.batchingEfficiency * batchingImpact);
  const lightDC = calculateLightDC(dynamicLights, meshCount, renderingPath);
  const shadowDC = calculateShadowDC(shadowCastingLights);
  
  const estimatedBaseDC = rendererDC + materialOverhead + lightDC + shadowDC;
  const dcReduction = ((currentDC - targetDC) / currentDC) * 100;
  const fpsImprovement = Math.min(50, dcReduction * 0.4); // Cada 10% DC = ~4% FPS
  
  // Potencial por técnica no implementada
  const staticBatchPotential = !activeTechniques.includes(‘staticBatching’) ? Math.ceil(currentDC * BATCHING_TECHNIQUES.staticBatching.reduction) : 0;
  const dynamicBatchPotential = !activeTechniques.includes(‘dynamicBatching’) ? Math.ceil(currentDC * BATCHING_TECHNIQUES.dynamicBatching.reduction) : 0;
  const instancingPotential = !activeTechniques.includes(‘gpuInstancing’) ? Math.ceil(currentDC * BATCHING_TECHNIQUES.gpuInstancing.reduction) : 0;
  const atlasRatePotential = !activeTechniques.includes(‘atlasing’) ? Math.ceil(currentDC * BATCHING_TECHNIQUES.atlasing.reduction) : 0;
  
  // Actualizar UI
  document.getElementById(‘currentDC’).textContent = currentDC;
  document.getElementById(‘targetDC’).textContent = targetDC;
  document.getElementById(‘dcReduction’).textContent = dcReduction.toFixed(1) + ‘%’;
  document.getElementById(‘fpsImprovement’).textContent = ‘+’ + fpsImprovement.toFixed(1) + ‘%’;
  
  // Potencial
  document.getElementById(‘staticBatchPotential’).textContent = staticBatchPotential;
  document.getElementById(‘dynamicBatchPotential’).textContent = dynamicBatchPotential;
  document.getElementById(‘instancingPotential’).textContent = instancingPotential;
  document.getElementById(‘atlasRatePotential’).textContent = atlasRatePotential;
  
  // Detalles
  document.getElementById(‘meshDetail’).textContent = meshCount;
  document.getElementById(‘matDetail’).textContent = materialCount;
  document.getElementById(‘opaqueDetail’).textContent = opaqueRenderers;
  document.getElementById(‘transparentDetail’).textContent = transparentRenderers;
  document.getElementById(‘lightsDetail’).textContent = dynamicLights + ’ luces’;
  document.getElementById(‘shadowDetail’).textContent = shadowCastingLights + ’ (sombras)’;
  const batchingRatio = (meshCount / currentDC).toFixed(2);
  document.getElementById(‘batchingRatio’).textContent = batchingRatio + ’ meshes/DC’;
  
  // Análisis de cuellos de botella
  generateBottleneckAnalysis(config, currentDC, targetDC, activeTechniques);
  
  // Estrategia de optimización
  generateOptimizationStrategy(config, activeTechniques, staticBatchPotential, dynamicBatchPotential, instancingPotential);
  
  // Mostrar resultados
  document.getElementById(‘resultsSection’).style.display = ‘block’;
  document.getElementById(‘resultsSection’).scrollIntoView({ behavior: ‘smooth’, block: ‘start’ });
  }

/**

- Genera análisis de cuellos de botella
  */
  function generateBottleneckAnalysis(config, currentDC, targetDC, activeTechniques) {
  const { meshCount, materialCount, opaqueRenderers, transparentRenderers, dynamicLights, renderingPath } = config;
  const bottlenecks = [];
  
  // Cuello de botella 1: DC vs Material ratio
  const materialsRatio = materialCount / meshCount;
  if (materialsRatio > 0.3) {
  bottlenecks.push({
  severity: ‘high’,
  name: ‘Muchos Materiales Únicos’,
  description: `${materialCount} materiales para ${meshCount} meshes (ratio: ${materialsRatio.toFixed(2)}). Cada cambio de material genera 1 DC adicional.`,
  solution: ‘Consolidar materiales con texture atlasing o reutilizar shaders’
  });
  }
  
  // Cuello de botella 2: Renderers vs DC actual
  const totalRenderers = opaqueRenderers + transparentRenderers;
  const rendererRatio = totalRenderers / currentDC;
  if (rendererRatio < 0.5) {
  bottlenecks.push({
  severity: ‘high’,
  name: ‘Batching Ineficiente’,
  description: `Tienes ${totalRenderers} renderers pero ${currentDC} DC. Solo ${(rendererRatio * 100).toFixed(1)}% ratio. Hay mucho overhead.`,
  solution: ‘Aplica static batching, dynamic batching o GPU instancing según corresponda’
  });
  }
  
  // Cuello de botella 3: Luces dinámicas
  if (dynamicLights > 5 && renderingPath === ‘forward’) {
  bottlenecks.push({
  severity: ‘medium’,
  name: ‘Forward Rendering con Muchas Luces’,
  description: `${dynamicLights} luces dinámicas en Forward. Esto genera overhead por luz+mesh.`,
  solution: ‘Considera cambiar a Deferred Rendering o reducir número de luces dinámicas’
  });
  }
  
  // Cuello de botella 4: Sin técnicas de batching
  const unusedTechs = [‘staticBatching’, ‘dynamicBatching’, ‘gpuInstancing’, ‘atlasing’].filter(t => !activeTechniques.includes(t));
  if (unusedTechs.length >= 3) {
  bottlenecks.push({
  severity: ‘high’,
  name: ‘Sin Optimizaciones Implementadas’,
  description: `No estás usando ${unusedTechs.length} técnicas de batching clave. Hay gran potencial.`,
  solution: ‘Implementa Progressive: Static Batching → GPU Instancing → Atlasing’
  });
  }
  
  // Cuello de botella 5: Meta inalcanzable
  if ((currentDC - targetDC) / currentDC > 0.5) {
  bottlenecks.push({
  severity: ‘high’,
  name: ‘Meta de DC Ambiciosa’,
  description: `Tu meta (${targetDC}) requiere reducción de &gt;50% desde ${currentDC}. Muy agresivo.`,
  solution: ‘Sé realista: 20-30% mejora es excelente. 50%+ requiere rediseño arquitectónico’
  });
  }
  
  // Renderizar
  const bottleneckList = document.getElementById(‘bottleneckList’);
  bottleneckList.innerHTML = ‘’;
  
  if (bottlenecks.length === 0) {
  bottleneckList.innerHTML = ‘<p style="color: #10b981; font-weight: 600;">✅ No se detectaron cuellos de botella críticos. ¡Buen trabajo!</p>’;
  } else {
  bottlenecks.forEach(bn => {
  const div = document.createElement(‘div’);
  div.className = `bottleneck-item severity-${bn.severity}`;
  div.innerHTML = `<div class="bottleneck-header"> <span class="severity-badge">${bn.severity.toUpperCase()}</span> <h4>${bn.name}</h4> </div> <p class="bottleneck-description">${bn.description}</p> <p class="bottleneck-solution"><strong>💡 Solución:</strong> ${bn.solution}</p>`;
  bottleneckList.appendChild(div);
  });
  }
  }

/**

- Genera estrategia de optimización priorizada
  */
  function generateOptimizationStrategy(config, activeTechniques, staticPot, dynamicPot, instancingPot) {
  const { currentDC, targetDC } = config;
  const dcNeeded = currentDC - targetDC;
  
  const strategies = {
  p1: [],
  p2: [],
  p3: []
  };
  
  // Prioridad 1: Mayor impacto, menor esfuerzo
  if (!activeTechniques.includes(‘staticBatching’) && staticPot > dcNeeded * 0.3) {
  strategies.p1.push(`<strong>Static Batching:</strong> ${staticPot} DC potenciales. Meshes estáticos combinadas. Máximo impacto/esfuerzo.`);
  }
  
  if (!activeTechniques.includes(‘gpuInstancing’) && instancingPot > dcNeeded * 0.2) {
  strategies.p1.push(`<strong>GPU Instancing:</strong> ${instancingPot} DC potenciales. Para meshes repetidas (árboles, rocas, enemigos).`);
  }
  
  if (!activeTechniques.includes(‘spatialCulling’)) {
  strategies.p1.push(`<strong>Frustum Culling:</strong> Verifica que esté activado. No renderices lo que no ves. Potencialmente 20-40% DC.`);
  }
  
  // Prioridad 2: Impacto medio, esfuerzo medio
  if (!activeTechniques.includes(‘dynamicBatching’) && dynamicPot > 0) {
  strategies.p2.push(`<strong>Dynamic Batching:</strong> ${dynamicPot} DC potenciales. Meshes &lt; 900 vértices que se mueven.`);
  }
  
  if (!activeTechniques.includes(‘lod’)) {
  strategies.p2.push(`<strong>LOD Groups:</strong> Reduce polígonos a distancia. Especialmente en escenas grandes. 15-30% mejora.`);
  }
  
  if (config.transparentRenderers > config.opaqueRenderers * 0.3) {
  strategies.p2.push(`<strong>Optimiza Transparentes:</strong> ${config.transparentRenderers} renderers trans. Ordena por cercanía, agrupa por material.`);
  }
  
  // Prioridad 3: Mejora gradual, largo plazo
  if (!activeTechniques.includes(‘atlasing’)) {
  strategies.p3.push(`<strong>Texture Atlasing:</strong> Consolida texturas pequeñas. Trabajo importante pero requiere rework de UVs.`);
  }
  
  if (config.dynamicLights > 3 && config.renderingPath === ‘forward’) {
  strategies.p3.push(`<strong>Deferred Rendering:</strong> Para &gt; 10 luces. Arquitectura diferente pero mejor para escenas iluminadas.`);
  }
  
  strategies.p3.push(`<strong>Profiling Continuo:</strong> Frame Debugger de Unity. Identifica qué renderiza en cada frame.`);
  
  // Renderizar
  renderStrategyList(‘priority1’, strategies.p1);
  renderStrategyList(‘priority2’, strategies.p2);
  renderStrategyList(‘priority3’, strategies.p3);
  }

/**

- Renderiza lista de estrategia
  */
  function renderStrategyList(elementId, items) {
  const list = document.getElementById(elementId);
  list.innerHTML = ‘’;
  
  if (items.length === 0) {
  list.innerHTML = ‘<li style="color: #10b981;">✅ Todas las técnicas implementadas en esta prioridad</li>’;
  } else {
  items.forEach(item => {
  const li = document.createElement(‘li’);
  li.innerHTML = item;
  list.appendChild(li);
  });
  }
  }

/**

- Actualiza valores por defecto según plataforma
  */
  function updatePlatformDefaults() {
  const platform = document.getElementById(‘platform’).value;
  const config = PLATFORM_TARGETS[platform];
  
  document.getElementById(‘targetDrawCalls’).value = config.recommendedTarget;
  }

// Event listeners
document.addEventListener(‘DOMContentLoaded’, function() {
const inputs = document.querySelectorAll(‘input[type=“number”], select’);
inputs.forEach(input => {
input.addEventListener(‘keypress’, function(e) {
if (e.key === ‘Enter’) analyzeDC();
});
});
});