# COMANDO 2: Logo y Configuración de Empresa

## OBJETIVO

Implementar módulo de configuración de empresa que permita:
1. Subir logo de la empresa a Firebase Storage
2. Guardar datos de empresa en Firestore
3. Mostrar en la UI de configuración
4. Usar logo y datos en PDFs de cotización

---

## DATOS A ALMACENAR

### Firestore: `usuarios/{userId}/settings/company`

```javascript
{
  company_name: "DIDACTICOS JUGANDO Y EDUCANDO SAS",
  nit: "901144615-6",
  address: "Avenida 19 # 114A - 22, Bogota",
  phone: "3153357921",
  email: "jugandoyeducando@hotmail.com",
  logo_url: "https://firebasestorage.googleapis.com/v0/b/app-cpq.appspot.com/o/logos%2F{userId}%2Flogo.png?alt=media&token=...",
  updatedAt: Timestamp
}
```

### Firebase Storage: `/logos/{userId}/logo.{ext}`

Estructura:
```
/logos/
  ├── SkV1gXKNqTR3IDFm8wwuX8kGciZ2/
  │   └── logo.png
  └── {otro-userId}/
      └── logo.jpg
```

---

## COMPONENTES A CREAR/MODIFICAR

### 1. CompanySettingsModule.jsx (NUEVO)

**Ubicación:** `src/componentes/configuracion/CompanySettingsModule.jsx`

**Funcionalidad:**
- Formulario con campos:
  - Nombre de empresa
  - NIT
  - Dirección
  - Teléfono
  - Email
- Upload de logo con preview
- Guardar cambios en Firestore
- Mostrar logo actual si existe

**UI esperada:**
```
┌────────────────────────────────────────┐
│  Información de la Empresa             │
├────────────────────────────────────────┤
│                                        │
│  Logo de la Empresa                    │
│  ┌──────────────┐                      │
│  │  [PREVIEW]   │  [Cambiar Logo]      │
│  │  150x150     │                      │
│  └──────────────┘                      │
│                                        │
│  Nombre de la Empresa                  │
│  [__________________________]          │
│                                        │
│  NIT                                   │
│  [__________________________]          │
│                                        │
│  Dirección                             │
│  [__________________________]          │
│                                        │
│  Teléfono                              │
│  [__________________________]          │
│                                        │
│  Email                                 │
│  [__________________________]          │
│                                        │
│  [Guardar Cambios]                     │
│                                        │
└────────────────────────────────────────┘
```

**Props:**
```javascript
CompanySettingsModule({ db, user })
```

**Estados necesarios:**
```javascript
const [companyData, setCompanyData] = useState({
  company_name: '',
  nit: '',
  address: '',
  phone: '',
  email: '',
  logo_url: ''
});
const [loading, setLoading] = useState(false);
const [saving, setSaving] = useState(false);
const [uploading, setUploading] = useState(false);
const [logoFile, setLogoFile] = useState(null);
const [logoPreview, setLogoPreview] = useState(null);
```

**Funciones clave:**

1. **Cargar datos existentes:**
```javascript
useEffect(() => {
  const loadCompanyData = async () => {
    const docRef = doc(db, 'usuarios', user.uid, 'settings', 'company');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setCompanyData(docSnap.data());
      setLogoPreview(docSnap.data().logo_url);
    }
  };
  loadCompanyData();
}, [user?.uid]);
```

2. **Manejar selección de archivo:**
```javascript
const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  // Validar tipo
  if (!file.type.startsWith('image/')) {
    alert('Solo se permiten imágenes');
    return;
  }
  
  // Validar tamaño (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert('La imagen debe pesar menos de 2MB');
    return;
  }
  
  setLogoFile(file);
  
  // Crear preview
  const reader = new FileReader();
  reader.onloadend = () => {
    setLogoPreview(reader.result);
  };
  reader.readAsDataURL(file);
};
```

3. **Subir logo a Firebase Storage:**
```javascript
const uploadLogo = async () => {
  if (!logoFile) return companyData.logo_url;
  
  setUploading(true);
  try {
    const storage = getStorage();
    const fileExt = logoFile.name.split('.').pop();
    const fileName = `logo.${fileExt}`;
    const storageRef = ref(storage, `logos/${user.uid}/${fileName}`);
    
    // Subir archivo
    await uploadBytes(storageRef, logoFile);
    
    // Obtener URL pública
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error subiendo logo:', error);
    alert('Error al subir el logo');
    return companyData.logo_url;
  } finally {
    setUploading(false);
  }
};
```

4. **Guardar todo:**
```javascript
const handleSave = async () => {
  setSaving(true);
  try {
    // Subir logo si hay uno nuevo
    const logoUrl = await uploadLogo();
    
    // Guardar en Firestore
    const docRef = doc(db, 'usuarios', user.uid, 'settings', 'company');
    await setDoc(docRef, {
      ...companyData,
      logo_url: logoUrl,
      updatedAt: new Date()
    });
    
    alert('✅ Datos guardados exitosamente');
  } catch (error) {
    console.error('Error guardando:', error);
    alert('Error al guardar los datos');
  } finally {
    setSaving(false);
  }
};
```

---

### 2. Integrar en SettingsPage.jsx

**Ubicación:** `src/componentes/configuracion/SettingsPage.jsx`

**Modificación:**
Agregar nueva tab "Empresa" con el módulo `CompanySettingsModule`.

**Estructura esperada:**
```jsx
<Tabs defaultValue="general">
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="company">Empresa</TabsTrigger>  {/* NUEVO */}
    <TabsTrigger value="wix">Integración Wix</TabsTrigger>
    {/* ... otras tabs ... */}
  </TabsList>

  <TabsContent value="company">
    <CompanySettingsModule db={db} user={user} />
  </TabsContent>
</Tabs>
```

---

## DEPENDENCIAS DE FIREBASE

Asegurarse de que estén instaladas y importadas:

```javascript
// Firebase Storage
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firestore
import { doc, getDoc, setDoc } from 'firebase/firestore';
```

**Verificar en `package.json`:**
- `firebase`: ya instalado ✅

---

## VALIDACIONES

1. **Logo:**
   - Solo imágenes (png, jpg, jpeg, webp)
   - Máximo 2MB
   - Mostrar preview antes de subir

2. **Campos de texto:**
   - Nombre de empresa: requerido, min 3 caracteres
   - NIT: requerido, formato válido
   - Email: requerido, formato de email válido
   - Teléfono: opcional, solo números
   - Dirección: opcional

---

## ESTILOS Y UX

1. **Preview de logo:**
   - Tamaño: 150x150px
   - Border redondeado
   - Placeholder si no hay logo: icono genérico

2. **Botón de upload:**
   - "Cambiar Logo" si ya existe
   - "Subir Logo" si no existe

3. **Loading states:**
   - Spinner en botón "Guardar" cuando está guardando
   - Spinner en preview cuando está subiendo logo
   - Deshabilitar formulario durante operaciones

4. **Feedback:**
   - Mensaje de éxito al guardar
   - Mensaje de error si falla
   - Indicador de progreso en upload

---

## SEGURIDAD (Firebase Storage Rules)

**Archivo:** `storage.rules`

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /logos/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Deploy:**
```bash
firebase deploy --only storage
```

---

## TESTING

1. **Crear archivo de storage rules** si no existe
2. **Deploy de storage rules**
3. **Testing en localhost:**
   - Cargar datos desde Firestore
   - Seleccionar imagen
   - Ver preview
   - Guardar cambios
   - Verificar en Firestore Console
   - Verificar archivo en Storage Console

4. **Testing en producción:**
   - Repetir proceso en app.cepequ.com
   - Verificar que logo se use en PDFs (después)

---

## ARCHIVOS A CREAR/MODIFICAR

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/componentes/configuracion/CompanySettingsModule.jsx` | CREAR | Módulo de configuración de empresa |
| `src/componentes/configuracion/SettingsPage.jsx` | MODIFICAR | Agregar tab "Empresa" |
| `storage.rules` | CREAR/MODIFICAR | Reglas de seguridad para Storage |

---

## RESULTADO ESPERADO

Después de implementar:

1. ✅ Usuario puede ir a Configuración → Empresa
2. ✅ Usuario puede subir logo de empresa
3. ✅ Usuario puede ingresar datos de empresa
4. ✅ Logo se guarda en Firebase Storage
5. ✅ Datos se guardan en Firestore
6. ✅ Logo y datos están disponibles para usar en PDFs

---

## DATOS DEFAULT (TEMPORAL)

Para testing inicial, puedes usar:

```javascript
const DEFAULT_COMPANY_DATA = {
  company_name: "DIDACTICOS JUGANDO Y EDUCANDO SAS",
  nit: "901144615-6",
  address: "Avenida 19 # 114A - 22, Bogota",
  phone: "3153357921",
  email: "jugandoyeducando@hotmail.com"
};
```

---

¿Puedes implementar COMANDO 2 completo?

1. Crear CompanySettingsModule.jsx
2. Integrar en SettingsPage.jsx
3. Crear/actualizar storage.rules
4. Deploy de storage rules
5. Testing completo
