#!/bin/bash
# CFE INSIGHT - Script de Validación del Sistema de Permisos
# 
# Este script valida que todos los archivos se han creado correctamente
# y que la estructura es la correcta.
#
# Uso: bash validar-permisos.sh

echo "🔍 Validando Sistema de Permisos CFE INSIGHT..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
FILES_OK=0
FILES_ERROR=0

# Función para verificar archivo
check_file() {
  local file=$1
  local description=$2
  
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅${NC} $description: EXISTE"
    ((FILES_OK++))
  else
    echo -e "${RED}❌${NC} $description: NO EXISTE"
    ((FILES_ERROR++))
  fi
}

# Función para verificar contenido
check_content() {
  local file=$1
  local search=$2
  local description=$3
  
  if grep -q "$search" "$file" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} $description"
    ((FILES_OK++))
  else
    echo -e "${RED}❌${NC} $description"
    ((FILES_ERROR++))
  fi
}

echo "📦 Verificando archivos de permisos..."
echo ""

# Archivos principales
check_file "js/permissions-helpers.js" "Sistema de Permisos Principal"
check_file "js/api-client.js" "Cliente API (extendido)"
check_file "js/usuarios.js" "Módulo de Usuarios"
check_file "js/auth-guard.js" "Auth Guard"

# Ejemplos de integración
check_file "js/compromisos-permisos.js" "Ejemplo: Compromisos"
check_file "js/entidades-permisos.js" "Ejemplo: Entidades"

echo ""
echo "📚 Verificando documentación..."
echo ""

check_file "SISTEMA-ROLES-PERMISOS.md" "Documentación Completa"
check_file "INICIO-RAPIDO.md" "Guía Rápida"
check_file "IMPLEMENTACION-COMPLETADA.md" "Resumen de Implementación"

echo ""
echo "🔎 Verificando contenido de archivos clave..."
echo ""

# Verificar que permissions-helpers.js tiene los métodos principales
check_content "js/permissions-helpers.js" "window.PermissionsHelper" "PermissionsHelper expuesto globalmente"
check_content "js/permissions-helpers.js" "hasRole" "Método hasRole()"
check_content "js/permissions-helpers.js" "hasPermission" "Método hasPermission()"
check_content "js/permissions-helpers.js" "canAccessModule" "Método canAccessModule()"
check_content "js/permissions-helpers.js" "disableIfNoPermission" "Método disableIfNoPermission()"

echo ""
echo "🔎 Verificando extensiones en api-client.js..."
echo ""

check_content "js/api-client.js" "canAccessEntities" "Método canAccessEntities() agregado"
check_content "js/api-client.js" "canAccessCommitments" "Método canAccessCommitments() agregado"
check_content "js/api-client.js" "canAccessModule" "Método canAccessModule() agregado"

echo ""
echo "📊 RESUMEN"
echo "========="
echo -e "${GREEN}✅ Correctos: $FILES_OK${NC}"
echo -e "${RED}❌ Errores: $FILES_ERROR${NC}"

if [ $FILES_ERROR -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 ¡Validación EXITOSA!${NC}"
  echo ""
  echo "Próximos pasos:"
  echo "1. Revisar INICIO-RAPIDO.md para comenzar"
  echo "2. Cargar scripts en orden correcto en HTML"
  echo "3. Usar PermissionsHelper en páginas"
  echo "4. Consultar SISTEMA-ROLES-PERMISOS.md para detalles"
  exit 0
else
  echo ""
  echo -e "${RED}⚠️ Validación FALLÓ${NC}"
  echo "Verifique que todos los archivos están en su lugar"
  exit 1
fi
