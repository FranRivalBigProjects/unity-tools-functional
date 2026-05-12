// Configuración de formatos de textura (tamaño en bits por píxel)
const TEXTURE_FORMATS = {
rgba32: {
name: ‘RGBA 32-bit’,
bitsPerPixel: 32,
maxQuality: 100,
platformsBest: [‘Web’, ‘PC’, ‘Consoles’],
description: ‘Máxima calidad, no comprimido’
},
rgb24: {
name: ‘RGB 24-bit’,
bitsPerPixel: 24,
maxQuality: 95,
platformsBest: [‘PC’],
description: ‘Sin canal alpha, buena calidad’
},
astc6x6: {
name: ‘ASTC 6x6’,
bitsPerPixel: 1.33,
maxQuality: 92,
platformsBest: [‘Mobile’, ‘Android 6+’, ‘iOS 15+’],
description: ‘Mejor relación calidad-tamaño para móviles’
},
astc8x8: {
name: ‘ASTC 8x8’,
bitsPerPixel: 0.5,
maxQuality: 85,
platformsBest: [‘Mobile’, ‘Android’, ‘iOS’],
description: ‘Máxima compresión, pequeño en tamaño’
},
etc2: {
name: ‘ETC2’,
bitsPerPixel: 4,
maxQuality: 88,
platformsBest: [‘Android’, ‘Mobile’],
description: ‘Estándar OpenGL ES 3.0’
},
dxt1: {
name: ‘DXT1’,
bitsPerPixel: 4,
maxQuality: 90,
platformsBest: [‘PC’, ‘DirectX’],
description: ‘Compresión DirectX, buena para PC’
}
};

// Configuración de Mipmaps
const MIPMAP_MULTIPLIER = 1.33; // Aumenta ~33% el tamaño

// Cálculo de memoria por vértice (aproximado)
const BYTES_PER_VERTEX = 32; // Posición (12) + Normal (12) + UV (8)

/**

- Calcula el tamaño de una textura en MB
- @param {number} width - Ancho de la textura
- @param {number} height - Alto de la textura
- @param {number} bitsPerPixel - Bits por píxel del formato
- @param {boolean} hasMipmaps - Si incluye mipmaps
- @returns {number} Tamaño en MB
  */
  function calculateTextureSize(width, height, bitsPerPixel, hasMipmaps = true) {
  const pixels = width * height;
  const bytes = (pixels * bitsPerPixel) / 8;
  let sizeInMB = bytes / (1024 * 1024);
  
  // Si tiene mipmaps, multiplica por el factor
  if (hasMipmaps) {
  sizeInMB *= MIPMAP_MULTIPLIER;
  }
  
  return sizeInMB;
  }

/**

- Calcula el tamaño total de memoria de vértices
- @param {number} vertices - Número de vértices en miles
- @returns {number} Tamaño en MB
  */
  function calculateMeshMemory(vertices) {
  // Convierte de miles a vértices individuales
  const totalVertices = vertices * 1000;
  const bytes = totalVertices * BYTES_PER_VERTEX;
  return bytes / (1024 * 1024);
  }

/**

- Valida y obtiene los valores del formulario
- @returns {object|null} Objeto con los valores o null si hay error
  */
  function getFormValues() {
  const width = parseInt(document.getElementById(‘textureWidth’).value);
  const height = parseInt(document.getElementById(‘textureHeight’).value);
  const format = document.getElementById(‘textureFormat’).value;
  const count = parseInt(document.getElementById(‘textureCount’).value);
  const hasMipmaps = document.getElementById(‘mipmaps’).checked;
  const vertices = parseInt(document.getElementById(‘meshVertices’).value) || 0;
  
  // Validaciones
  if (!width || !height || width < 32 || height < 32 || width > 8192 || height > 8192) {
  alert(‘❌ Dimensiones de textura inválidas. Rango: 32 - 8192px’);
  return null;
  }
  
  if (!count || count < 1 || count > 1000) {
  alert(‘❌ Número de texturas inválido. Rango: 1 - 1000’);
  return null;
  }
  
  if (!TEXTURE_FORMATS[format]) {
  alert(‘❌ Formato de textura no válido’);
  return null;
  }
  
  return {
  width,
  height,
  format,
  count,
  hasMipmaps,
  vertices
  };
  }

/**

- Genera recomendaciones basadas en los resultados
- @param {object} data - Datos calculados
- @returns {array} Array de recomendaciones
  */
  function generateRecommendations(data) {
  const recommendations = [];
  const { width, height, format, currentSize, optimizedSize, savings, vertices } = data;
  
  // Recomendación 1: Tamaño de textura
  if (width > 2048 || height > 2048) {
  if (savings < 50) {
  recommendations.push({
  type: ‘warning’,
  text: `📍 <strong>Reduce la resolución:</strong> Considera bajar de ${width}x${height} a 1024x1024 o 1536x1536. La mayoría de juegos móviles no necesitan más.`
  });
  }
  }
  
  // Recomendación 2: Formato de compresión
  if (format === ‘rgba32’ && optimizedSize > 50) {
  recommendations.push({
  type: ‘warning’,
  text: ‘⚠️ <strong>Cambia a compresión:</strong> Estás usando RGBA sin comprimir. Cambia a ASTC o ETC2 para reducir drásticamente el tamaño.’
  });
  }
  
  // Recomendación 3: Mipmaps
  if (data.hasMipmaps && currentSize > 100) {
  recommendations.push({
  type: ‘info’,
  text: ‘💡 <strong>Mipmaps:</strong> Están activos (+33% tamaño). Desactívalo en UI y texturas close-up para ahorrar memoria.’
  });
  }
  
  // Recomendación 4: Atlasing
  if (data.count > 20) {
  recommendations.push({
  type: ‘success’,
  text: `✅ <strong>Considera atlasing:</strong> Tienes ${data.count} texturas. Combina las pequeñas en atlas para reducir draw calls y mejorar batching.`
  });
  }
  
  // Recomendación 5: Meshes
  if (vertices > 100) {
  recommendations.push({
  type: ‘info’,
  text: `📊 <strong>Optimiza meshes:</strong> Tienes ${vertices}k vértices aprox. Usa LOD groups para reducir polígonos en objetos lejanos.`
  });
  }
  
  // Recomendación 6: Asset Bundles
  if (optimizedSize > 10) {
  recommendations.push({
  type: ‘success’,
  text: ‘📦 <strong>Usa Asset Bundles:</strong> Con este tamaño, divide en bundles para descargar bajo demanda y reducir memoria en runtime.’
  });
  }
  
  // Recomendación 7: Impacto en FPS
  if (savings >= 50) {
  recommendations.push({
  type: ‘success’,
  text: `🚀 <strong>Impacto en rendimiento:</strong> Ahorrar ${Math.round(savings)}% puede mejorar FPS especialmente en móviles con menos RAM.`
  });
  }
  
  return recommendations;
  }

/**

- Formatea un número a formato MB con decimales
- @param {number} mb - Tamaño en MB
- @returns {string} Texto formateado
  */
  function formatMB(mb) {
  if (mb < 1) {
  return (mb * 1024).toFixed(2) + ’ KB’;
  }
  return mb.toFixed(2) + ’ MB’;
  }

/**

- Función principal de cálculo
  */
  function calculateOptimization() {
  const values = getFormValues();
  if (!values) return;
  
  const { width, height, format, count, hasMipmaps, vertices } = values;
  const formatInfo = TEXTURE_FORMATS[format];
  
  // Cálculos base
  const textureSizeOriginal = calculateTextureSize(width, height, 32, hasMipmaps);
  const textureSizeOptimized = calculateTextureSize(width, height, formatInfo.bitsPerPixel, hasMipmaps);
  
  const currentSize = textureSizeOriginal * count;
  const optimizedSize = textureSizeOptimized * count;
  const meshMemory = calculateMeshMemory(vertices);
  
  const totalCurrentSize = currentSize + meshMemory;
  const totalOptimizedSize = optimizedSize + meshMemory;
  
  const memorySaved = totalCurrentSize - totalOptimizedSize;
  const savings = totalCurrentSize > 0 ? (memorySaved / totalCurrentSize) * 100 : 0;
  
  // Objeto con datos para recomendaciones
  const resultData = {
  width,
  height,
  format,
  count,
  hasMipmaps,
  vertices,
  currentSize: totalCurrentSize,
  optimizedSize: totalOptimizedSize,
  memorySaved,
  savings,
  textureSizeOriginal,
  textureSizeOptimized
  };
  
  // Actualizar UI con resultados
  document.getElementById(‘currentSize’).textContent = formatMB(totalCurrentSize);
  document.getElementById(‘optimizedSize’).textContent = formatMB(totalOptimizedSize);
  document.getElementById(‘savings’).textContent = savings.toFixed(1) + ‘%’;
  document.getElementById(‘memorySaved’).textContent = formatMB(memorySaved);
  
  // Desglose detallado
  document.getElementById(‘resDetail’).textContent = `${width}x${height}px`;
  document.getElementById(‘formatOrig’).textContent = ‘RGBA 32-bit (32 bpp)’;
  document.getElementById(‘formatComp’).textContent = `${formatInfo.name} (${formatInfo.bitsPerPixel} bpp)`;
  document.getElementById(‘sizePerTex’).textContent = formatMB(textureSizeOriginal);
  document.getElementById(‘sizePerTexOpt’).textContent = formatMB(textureSizeOptimized);
  document.getElementById(‘mipmapFactor’).textContent = hasMipmaps ? `x${MIPMAP_MULTIPLIER.toFixed(2)} (+33%)` : ‘x1 (desactivado)’;
  document.getElementById(‘meshData’).textContent = vertices > 0 ? formatMB(meshMemory) : ‘N/A’;
  
  // Generar y mostrar recomendaciones
  const recommendations = generateRecommendations(resultData);
  const recommendationsList = document.getElementById(‘recommendationsList’);
  recommendationsList.innerHTML = ‘’;
  
  recommendations.forEach(rec => {
  const li = document.createElement(‘li’);
  li.className = `rec-${rec.type}`;
  li.innerHTML = rec.text;
  recommendationsList.appendChild(li);
  });
  
  // Mostrar sección de resultados
  document.getElementById(‘resultsSection’).style.display = ‘block’;
  
  // Scroll suave a resultados
  document.getElementById(‘resultsSection’).scrollIntoView({ behavior: ‘smooth’, block: ‘start’ });
  }

// Event listeners para validación en tiempo real
document.addEventListener(‘DOMContentLoaded’, function() {
// Permitir Enter en inputs para calcular
const inputs = document.querySelectorAll(‘input[type=“number”], select’);
inputs.forEach(input => {
input.addEventListener(‘keypress’, function(e) {
if (e.key === ‘Enter’) {
calculateOptimization();
}
});
});
});