import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const REPORT_DIRECTORY = 'catalog-cleanup-reports';
const CONFIRMATION = 'DELETE_MANUAL_DUPLICATES';
const PAGE_SIZE = 1_000;
const BATCH_SIZE = 450;

function usage(message) {
  if (message) console.error(`\nError: ${message}\n`);
  console.log(`Uso:
  node --env-file=.env.local scripts/reconcile-manual-products.mjs --email usuario@empresa.com
  node --env-file=.env.local scripts/reconcile-manual-products.mjs --uid FIREBASE_UID
  node --env-file=.env.local scripts/reconcile-manual-products.mjs --delete --report catalog-cleanup-reports/<reporte>.json --confirm ${CONFIRMATION}

El primer y segundo comando son sólo de lectura: generan un reporte local
mínimo. El tercero es el único que borra documentos de Firebase.`);
  process.exitCode = 1;
}

function readArguments(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) continue;
    const [key, inlineValue] = argument.slice(2).split('=', 2);
    if (key === 'delete') {
      args.delete = true;
      continue;
    }
    args[key] = inlineValue ?? argv[index + 1];
    if (inlineValue === undefined) index += 1;
  }
  return args;
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} en .env.local.`);
  return value;
}

function normalizeSku(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function getFirebase() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: requiredEnvironment('FIREBASE_PROJECT_ID'),
        clientEmail: requiredEnvironment('FIREBASE_CLIENT_EMAIL'),
        privateKey: requiredEnvironment('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
    });
  }
  return { auth: getAuth(), db: getFirestore() };
}

function getSupabase() {
  return createClient(
    requiredEnvironment('SUPABASE_URL'),
    requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function resolveUserId({ email, uid }) {
  if (Boolean(email) === Boolean(uid)) {
    throw new Error('Indica exactamente uno de --email o --uid.');
  }
  if (uid) return uid;
  return (await getFirebase().auth.getUserByEmail(email)).uid;
}

async function loadActiveSupabaseProducts() {
  const supabase = getSupabase();
  const bySku = new Map();
  const duplicateSkus = new Set();
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('catalog_products')
      .select('id, sku, title')
      .is('deleted_at', null)
      .order('sku', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`No se pudo leer Supabase: ${error.message}`);
    for (const product of data || []) {
      const sku = normalizeSku(product.sku);
      if (!sku) continue;
      if (bySku.has(sku)) duplicateSkus.add(sku);
      else bySku.set(sku, product);
    }
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  for (const sku of duplicateSkus) bySku.delete(sku);
  return { bySku, duplicateSkus: [...duplicateSkus].sort() };
}

async function buildAudit({ email, uid }) {
  const resolvedUid = await resolveUserId({ email, uid });
  const { db } = getFirebase();
  const { bySku: supabaseBySku, duplicateSkus } = await loadActiveSupabaseProducts();
  const manualSnapshot = await db.collection('usuarios').doc(resolvedUid).collection('productos').get();
  const candidates = [];
  let withoutSku = 0;

  for (const manualDocument of manualSnapshot.docs) {
    const manual = manualDocument.data();
    const normalizedSku = normalizeSku(manual.sku);
    if (!normalizedSku) {
      withoutSku += 1;
      continue;
    }
    const catalogProduct = supabaseBySku.get(normalizedSku);
    if (!catalogProduct) continue;

    candidates.push({
      manual: {
        id: manualDocument.id,
        path: manualDocument.ref.path,
        sku: manual.sku,
        normalizedSku,
        title: manual.nombre || manual.title || null,
      },
      supabase: {
        id: catalogProduct.id,
        sku: catalogProduct.sku,
        title: catalogProduct.title,
      },
    });
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    mode: 'audit-only',
    uid: resolvedUid,
    email: email || null,
    manualCollectionPath: `usuarios/${resolvedUid}/productos`,
    matchRule: 'normalized exact SKU: trim + uppercase; active Supabase rows only (deleted_at IS NULL)',
    summary: {
      manualProducts: manualSnapshot.size,
      manualProductsWithoutSku: withoutSku,
      activeSupabaseSkus: supabaseBySku.size,
      ambiguousSupabaseSkusIgnored: duplicateSkus.length,
      candidatesForDeletion: candidates.length,
    },
    ambiguousSupabaseSkusIgnored: duplicateSkus,
    candidates,
  };
}

async function writeAudit(report) {
  await fs.mkdir(REPORT_DIRECTORY, { recursive: true });
  const timestamp = report.generatedAt.replace(/[:.]/g, '-');
  const reportPath = path.join(REPORT_DIRECTORY, `manual-duplicates-${report.uid}-${timestamp}.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return reportPath;
}

async function deleteFromReport(reportPath) {
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  if (report.mode !== 'audit-only' || !report.uid || !Array.isArray(report.candidates)) {
    throw new Error('El archivo no es un reporte de auditoría válido.');
  }

  const { db } = getFirebase();
  const { bySku: supabaseBySku } = await loadActiveSupabaseProducts();
  const candidates = report.candidates.filter((candidate) => (
    candidate?.manual?.id
    && candidate.manual.normalizedSku
    && supabaseBySku.has(candidate.manual.normalizedSku)
  ));
  const skippedBeforeRead = report.candidates.length - candidates.length;
  const deleted = [];
  const skippedChanged = [];

  for (let offset = 0; offset < candidates.length; offset += BATCH_SIZE) {
    const group = candidates.slice(offset, offset + BATCH_SIZE);
    const refs = group.map((candidate) => db.collection('usuarios').doc(report.uid).collection('productos').doc(candidate.manual.id));
    const snapshots = await db.getAll(...refs);
    const batch = db.batch();
    let deletesInBatch = 0;

    snapshots.forEach((snapshot, index) => {
      const candidate = group[index];
      if (!snapshot.exists || normalizeSku(snapshot.data().sku) !== candidate.manual.normalizedSku) {
        skippedChanged.push({ id: candidate.manual.id, sku: candidate.manual.sku });
        return;
      }
      batch.delete(snapshot.ref);
      deleted.push({ id: candidate.manual.id, sku: candidate.manual.sku, supabaseId: candidate.supabase.id });
      deletesInBatch += 1;
    });
    if (deletesInBatch) await batch.commit();
  }

  const receipt = {
    deletedAt: new Date().toISOString(),
    sourceReport: reportPath,
    uid: report.uid,
    attempted: report.candidates.length,
    deleted: deleted.length,
    skippedNoLongerInSupabase: skippedBeforeRead,
    skippedChangedOrMissingInFirebase: skippedChanged,
    deletedDocuments: deleted,
  };
  const receiptPath = reportPath.replace(/\.json$/, '-deletion-receipt.json');
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  return { receipt, receiptPath };
}

async function main() {
  const args = readArguments(process.argv.slice(2));
  if (args.delete) {
    if (!args.report || args.confirm !== CONFIRMATION) {
      usage(`Para borrar debes indicar --report <archivo> y --confirm ${CONFIRMATION}.`);
      return;
    }
    const { receipt, receiptPath } = await deleteFromReport(args.report);
    console.log(`Borrados: ${receipt.deleted}. Omitidos por cambios: ${receipt.skippedChangedOrMissingInFirebase.length}.`);
    console.log(`Recibo de borrado: ${receiptPath}`);
    return;
  }

  const report = await buildAudit(args);
  const reportPath = await writeAudit(report);
  console.log(`Manuales leídos: ${report.summary.manualProducts}`);
  console.log(`Coincidencias exactas candidatas a borrar: ${report.summary.candidatesForDeletion}`);
  console.log(`Sin SKU (se conservan): ${report.summary.manualProductsWithoutSku}`);
  console.log(`Reporte local de auditoría: ${reportPath}`);
  console.log('No se borró ningún producto. Revisa el reporte antes de ejecutar --delete.');
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
