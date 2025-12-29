# Guía de Configuración - Soporte IA Avanzado CFE INSIGHT

## 🚀 Configuración Inicial

### 1. Obtener API Key de OpenAI
1. Ve a [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Inicia sesión en tu cuenta de OpenAI
3. Crea una nueva API key
4. Copia la key generada (formato: `sk-...`)

### 2. Configurar la API Key
1. Abre el archivo `App/js/config.js`
2. Busca la línea:
   ```javascript
   openai: {
       apiKey: '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', // Reemplaza con tu API key real
   ```
3. Reemplaza `'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'` con tu API key real
4. Guarda el archivo

### 3. Verificar Configuración
1. Abre `http://localhost:8000/soporte_ia.html` en tu navegador
2. Intenta hacer una consulta en la pestaña "Consulta IA"
3. Si funciona, verás una respuesta de la IA

## 📋 Funcionalidades Disponibles

### ✅ Soporte IA (`soporte_ia.html`)
- **Consulta IA**: Chatbot inteligente para preguntas sobre auditorías
- **Generar Reporte**: Crea reportes automáticos basados en datos del sistema
- **Sugerencias Auditoría**: Análisis inteligente de patrones y recomendaciones

### ✅ Chat Inteligente (`chat.html`)
- Respuestas automáticas para consultas comunes
- Escalada inteligente a soporte humano cuando es necesario
- Historial contextual de conversaciones

### ✅ Análisis de Logs (`registros.html`)
- Botón "Analizar con IA" para detectar anomalías
- Análisis de patrones de comportamiento
- Recomendaciones automáticas de auditoría

## 🔧 Configuración Avanzada

### Cambiar Proveedor de IA (Opcional)
En `config.js`, puedes cambiar el proveedor por defecto:
```javascript
defaultProvider: 'openai', // Cambiar a 'gemini' o 'claude' cuando estén disponibles
```

### Ajustar Parámetros de IA
```javascript
maxTokens: 1000,    // Máximo tokens por respuesta
temperature: 0.7,   // Creatividad (0-1)
timeout: 30000,     // Timeout en ms
```

## ⚠️ Notas de Seguridad

- **IMPORTANTE**: Las API keys están en el cliente-side por simplicidad
- **RECOMENDACIÓN**: Para producción, migrar a un backend seguro
- **Riesgo**: Las keys son visibles en el navegador

## 🧪 Probar Funcionalidades

### Sin API Key (Modo Demo)
- Las interfaces se cargan correctamente
- Aparecen mensajes de error controlados cuando no hay key
- Todas las funciones de UI funcionan

### Con API Key Real
1. Configura la key como se indica arriba
2. Prueba cada funcionalidad:
   - Consulta IA básica
   - Generación de reportes
   - Análisis de logs
   - Chat inteligente

## 📊 Monitoreo de Uso

### Ver Estadísticas de IA
```javascript
// En la consola del navegador:
getAIUsageStats()
```

Esto muestra:
- Total de interacciones
- Uso por proveedor
- Actividad reciente

## 🐛 Solución de Problemas

### Error: "Configuración de IA no válida"
- Verifica que la API key esté correctamente configurada
- Asegúrate de que no tenga espacios extra

### Error: "Error de API: 401"
- La API key es inválida o expiró
- Genera una nueva key en OpenAI

### Error: "Error de API: 429"
- Límite de uso excedido
- Espera unos minutos o verifica tu plan de OpenAI

### Funcionalidades no responden
- Verifica que el servidor local esté ejecutándose (`python -m http.server 8000`)
- Revisa la consola del navegador (F12) para errores

## 📝 Logs y Debugging

### Ver Logs de IA
```javascript
// En la consola del navegador:
console.log(getSecureItem('aiInteractions'))
```

### Limpiar Datos de Prueba
```javascript
// Limpiar historial de consultas IA
localStorage.removeItem('soporteHistorial')

// Limpiar interacciones de IA
setSecureItem('aiInteractions', [])
```

## 🎯 Próximos Pasos

1. **Configurar API Key** siguiendo esta guía
2. **Probar todas las funcionalidades**
3. **Considerar migración a backend** para mayor seguridad
4. **Implementar Gemini/Claude** cuando sea necesario

---

**Nota**: Esta implementación está optimizada para OpenAI GPT-3.5-turbo por su balance entre costo y rendimiento. Para análisis más complejos, considera actualizar a GPT-4 en la configuración.
