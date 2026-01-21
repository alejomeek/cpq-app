import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../context/useAuth';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Loader2, Upload, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CompanySettingsModule({ db }) {
  const { user } = useAuth();

  const [companyData, setCompanyData] = useState({
    company_name: '',
    nit: '',
    address: '',
    phone: '',
    email: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [result, setResult] = useState(null);

  // Cargar datos existentes
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!user?.uid) return;

      try {
        const docRef = doc(db, 'usuarios', user.uid, 'settings', 'company');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCompanyData({
            company_name: data.company_name || '',
            nit: data.nit || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || ''
          });
          setLogoPreview(data.logo_url || null);
        }
      } catch (error) {
        console.error('Error cargando datos de empresa:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCompanyData();
  }, [db, user]);

  // Manejar cambios en inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar selección de archivo de logo
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setResult({
        success: false,
        message: 'Solo se permiten imágenes (PNG, JPG, JPEG, WEBP)'
      });
      return;
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setResult({
        success: false,
        message: 'La imagen debe pesar menos de 2MB'
      });
      return;
    }

    setLogoFile(file);
    setResult(null);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Subir logo a Firebase Storage
  const uploadLogo = async (currentLogoUrl) => {
    if (!logoFile) return currentLogoUrl;

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
      throw new Error('Error al subir el logo');
    } finally {
      setUploading(false);
    }
  };

  // Validar formulario
  const validateForm = () => {
    if (!companyData.company_name || companyData.company_name.trim().length < 3) {
      setResult({
        success: false,
        message: 'El nombre de la empresa es requerido (mínimo 3 caracteres)'
      });
      return false;
    }

    if (!companyData.nit || companyData.nit.trim().length === 0) {
      setResult({
        success: false,
        message: 'El NIT es requerido'
      });
      return false;
    }

    if (!companyData.email || !companyData.email.includes('@')) {
      setResult({
        success: false,
        message: 'El email es requerido y debe ser válido'
      });
      return false;
    }

    return true;
  };

  // Guardar todo
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setResult(null);

    try {
      // Obtener logo URL actual
      const docRef = doc(db, 'usuarios', user.uid, 'settings', 'company');
      const docSnap = await getDoc(docRef);
      const currentLogoUrl = docSnap.exists() ? docSnap.data().logo_url : null;

      // Subir logo si hay uno nuevo
      const logoUrl = await uploadLogo(currentLogoUrl);

      // Guardar en Firestore
      await setDoc(docRef, {
        company_name: companyData.company_name.trim(),
        nit: companyData.nit.trim(),
        address: companyData.address.trim(),
        phone: companyData.phone.trim(),
        email: companyData.email.trim(),
        logo_url: logoUrl || '',
        updatedAt: new Date()
      });

      setResult({
        success: true,
        message: '✅ Datos guardados exitosamente'
      });

      // Limpiar logo file después de guardar
      setLogoFile(null);
    } catch (error) {
      console.error('Error guardando:', error);
      setResult({
        success: false,
        message: `❌ Error al guardar: ${error.message}`
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Información de la Empresa
        </CardTitle>
        <CardDescription>
          Configura los datos de tu empresa que aparecerán en las cotizaciones.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Section */}
        <div className="space-y-3">
          <Label>Logo de la Empresa</Label>
          <div className="flex items-center gap-4">
            {/* Preview */}
            <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="h-12 w-12 text-gray-400" />
              )}
            </div>

            {/* Upload Button */}
            <div className="flex-1">
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={saving || uploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('logo-upload').click()}
                disabled={saving || uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {logoPreview ? 'Cambiar Logo' : 'Subir Logo'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                PNG, JPG o WEBP. Máximo 2MB. Recomendado: 500x500px
              </p>
            </div>
          </div>
        </div>

        {/* Company Info Fields */}
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">
              Nombre de la Empresa <span className="text-red-500">*</span>
            </Label>
            <Input
              id="company_name"
              name="company_name"
              type="text"
              value={companyData.company_name}
              onChange={handleChange}
              placeholder="DIDACTICOS JUGANDO Y EDUCANDO SAS"
              disabled={saving || uploading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nit">
              NIT <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nit"
              name="nit"
              type="text"
              value={companyData.nit}
              onChange={handleChange}
              placeholder="901144615-6"
              disabled={saving || uploading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              name="address"
              type="text"
              value={companyData.address}
              onChange={handleChange}
              placeholder="Avenida 19 # 114A - 22, Bogota"
              disabled={saving || uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={companyData.phone}
              onChange={handleChange}
              placeholder="3153357921"
              disabled={saving || uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={companyData.email}
              onChange={handleChange}
              placeholder="jugandoyeducando@hotmail.com"
              disabled={saving || uploading}
              required
            />
          </div>
        </div>

        {/* Result Message */}
        {result && (
          <div className={`flex items-start gap-2 p-3 rounded-md ${
            result.success
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {result.success ? (
              <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            )}
            <div className="text-sm">{result.message}</div>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving || uploading}
          className="w-full"
          size="lg"
        >
          {saving || uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploading ? 'Subiendo logo...' : 'Guardando...'}
            </>
          ) : (
            'Guardar Cambios'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
