# Comando: Optimizar Velocidad de Descarga PDF (Logo Wix)

**Objetivo:** Reemplazar la llamada a la Cloud Function `getCompanyLogo` por una URL directa de Wix para acelerar la generación de PDFs.

**Fecha:** 23/01/2026

---

## 📋 Contexto
Actualmente, la generación de PDFs se demora varios segundos porque debe llamar a una Cloud Function para obtener el logo en Base64. Al usar una URL directa de Wix (que tiene CORS abierto), el proceso será instantáneo.

**URL del Logo:**
`https://static.wixstatic.com/media/7909ff_fb58218a20af4d04b6b325b43056b7b2~mv2.png/v1/fill/w_287,h_61,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo_versi%C3%83%C2%B3n_final_JYE.png`

---

## 🎯 Comando 1: Actualizar columns.jsx

**Archivo:** `src/componentes/cotizador/columns.jsx`

**Acción:** Reemplazar la lógica de fetch por la URL directa.

**Cambios:**
1. Buscar el bloque de código que usa `https://us-central1-app-cpq.cloudfunctions.net/getCompanyLogo`.
2. Reemplazar todo el bloque `try-catch` interno que obtiene el logo por una asignación directa.

**Código a implementar:**
```javascript
// Cargar logo directamente desde Wix para mayor velocidad
const logoUrl = "https://static.wixstatic.com/media/7909ff_fb58218a20af4d04b6b325b43056b7b2~mv2.png/v1/fill/w_287,h_61,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo_versi%C3%83%C2%B3n_final_JYE.png";
let companyLogoBase64 = logoUrl; 
```

*Nota: Aunque la variable se llame `companyLogoBase64`, puede contener una URL; el componente PDF la aceptará igual.*

---

## 🎯 Comando 2: Actualizar QuoteForm.jsx

**Archivo:** `src/componentes/cotizador/QuoteForm.jsx`

**Acción:** Reemplazar la llamada a la Cloud Function en la lógica de descarga/envío.

**Cambios:**
1. Buscar la función `handleDownloadPDF` (o similar donde se haga el fetch al logo).
2. Reemplazar el fetch por la URL directa de Wix.

**Código a implementar:**
```javascript
// Reemplazar el bloque fetch por:
const logoUrl = "https://static.wixstatic.com/media/7909ff_fb58218a20af4d04b6b325b43056b7b2~mv2.png/v1/fill/w_287,h_61,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo_versi%C3%83%C2%B3n_final_JYE.png";
const logoBase64 = logoUrl;
```

---

## ✅ Checklist de Verificación

- [ ] La descarga del PDF comienza casi instantáneamente.
- [ ] El logo aparece correctamente en el PDF.
- [ ] No hay errores de CORS en la consola del navegador.
- [ ] Se eliminó el código relacionado con el fetch a la Cloud Function en ambos archivos.

---

## 🚀 Instrucción para Claude Code

"Ejecuta el Comando 1 y el Comando 2 del archivo @COMANDO_URGENTE_LOGO_PDF.md para optimizar la velocidad de descarga de los PDFs usando la URL directa del logo de Wix."
