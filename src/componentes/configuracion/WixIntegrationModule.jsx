import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { syncWixToFirestore } from '../../services/wixService';
import { useAuth } from '../../context/useAuth';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export default function WixIntegrationModule({ db }) {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [siteId, setSiteId] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);
  const [credentialsSaved, setCredentialsSaved] = useState(false);

  // Cargar credenciales guardadas y última sincronización
  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) return;

      try {
        // Cargar credenciales guardadas
        const credsDoc = await getDoc(doc(db, `usuarios/${user.uid}/settings/wix_credentials`));
        if (credsDoc.exists()) {
          const data = credsDoc.data();
          setApiKey(data.apiKey || '');
          setSiteId(data.siteId || '');
          setCredentialsSaved(true);
        }

        // Cargar última sincronización
        const syncDoc = await getDoc(doc(db, `usuarios/${user.uid}/settings/wix_sync`));
        if (syncDoc.exists()) {
          const data = syncDoc.data();
          if (data.lastSync) {
            setLastSync({
              date: data.lastSync.toDate(),
              count: data.productsCount || 0
            });
          }
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
      }
    };

    loadData();
  }, [db, user]);

  const handleSaveCredentials = async () => {
    if (!apiKey || !siteId) {
      setError('Por favor ingresa API Key y Site ID');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await setDoc(doc(db, `usuarios/${user.uid}/settings/wix_credentials`), {
        apiKey,
        siteId,
        updatedAt: new Date()
      });

      setCredentialsSaved(true);
      setSyncResult({
        success: true,
        message: '✅ Credenciales guardadas exitosamente'
      });

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSyncResult(null), 3000);
    } catch (err) {
      console.error('Error al guardar credenciales:', err);
      setError(`❌ Error al guardar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!apiKey || !siteId) {
      setError('Por favor ingresa y guarda las credenciales primero');
      return;
    }

    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const result = await syncWixToFirestore(db, user.uid, apiKey, siteId);

      setSyncResult({
        success: true,
        message: `✅ ${result.count} productos sincronizados exitosamente`,
        count: result.count
      });

      setLastSync({
        date: new Date(),
        count: result.count
      });
    } catch (err) {
      console.error('Error al sincronizar:', err);
      setError(`❌ Error al sincronizar: ${err.message}`);
      setSyncResult({
        success: false,
        message: err.message
      });
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Nunca';
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Integración con Wix
        </CardTitle>
        <CardDescription>
          Sincroniza productos desde tu tienda Wix manualmente.
          Presiona "Sincronizar Ahora" cuando quieras actualizar el catálogo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Credenciales de Wix */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="wix-api-key">Wix API Key</Label>
            <Input
              id="wix-api-key"
              type="text"
              placeholder="IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={syncing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wix-site-id">Wix Site ID</Label>
            <Input
              id="wix-site-id"
              type="text"
              placeholder="a290c1b4-e593-4126-ae4e-675bd07c1a42"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              disabled={syncing}
            />
          </div>
        </div>

        {/* Botón de sincronización */}
        <Button
          onClick={handleSync}
          disabled={syncing || !apiKey || !siteId}
          className="w-full"
        >
          {syncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Ahora
            </>
          )}
        </Button>

        {/* Resultado de sincronización */}
        {syncResult && (
          <div className={`flex items-start gap-2 p-3 rounded-md ${syncResult.success
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
            {syncResult.success ? (
              <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            )}
            <div className="text-sm">
              {syncResult.message}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 text-red-800 border border-red-200">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        {/* Información de última sincronización */}
        {lastSync && (
          <div className="pt-3 border-t">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Última sincronización:</strong> {formatDate(lastSync.date)}
              </p>
              <p>
                <strong>Productos sincronizados:</strong> {lastSync.count}
              </p>
            </div>
          </div>
        )}

        {/* Instrucciones */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Los productos se sincronizarán solo cuando presiones el botón.
            Se recomienda sincronizar 1-2 veces al día o cuando hagas cambios en Wix.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
