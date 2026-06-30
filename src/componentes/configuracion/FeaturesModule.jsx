import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/useAuth';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Loader2, Mail } from 'lucide-react';

export default function FeaturesModule({ db }) {
  const { user } = useAuth();

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user?.uid) return;
      try {
        const ref = doc(db, 'usuarios', user.uid, 'settings', 'features');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setEmailEnabled(snap.data().emailEnabled ?? true);
        }
      } catch (err) {
        console.error('Error cargando funcionalidades:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [db, user?.uid]);

  const handleToggle = async (checked) => {
    setEmailEnabled(checked);
    setSaving(true);
    try {
      const ref = doc(db, 'usuarios', user.uid, 'settings', 'features');
      await setDoc(ref, { emailEnabled: checked }, { merge: true });
    } catch (err) {
      console.error('Error guardando funcionalidades:', err);
      setEmailEnabled(!checked);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades del Cotizador</CardTitle>
          <CardDescription>
            Activa o desactiva funciones dentro del módulo de cotizaciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <Label htmlFor="email-toggle" className="text-base font-medium cursor-pointer">
                  Enviar por Email
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Muestra el botón para enviar la cotización al cliente por correo electrónico.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch
                id="email-toggle"
                checked={emailEnabled}
                onCheckedChange={handleToggle}
                disabled={saving}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
