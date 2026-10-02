#!/usr/bin/env node
// `npm run start:local`: Expo contra el Supabase y el sitio LOCALES de ../inglobal-site.
// Inyecta las variables al proceso (tienen prioridad sobre .env.local), así que NO toca tu
// .env.local ni puede escribir contra homologación o producción.
//
// Requisitos (en ../inglobal-site): `npm run db:local:up` y `npm run dev:local`.
// Celular físico: usa la IP de tu PC en la red (celular y PC en el mismo Wi-Fi).
// Emulador Android: `npm run start:local -- --emulator` (usa 10.0.2.2).
import { execSync, spawn } from 'node:child_process'
import { networkInterfaces } from 'node:os'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const siteDir = resolve(process.cwd(), '../inglobal-site')
if (!existsSync(siteDir)) throw new Error(`No encuentro ${siteDir}. Cloná inglobal-site al lado de esta app.`)

const env = {}
for (const line of execSync('npx supabase status -o env', { cwd: siteDir, encoding: 'utf8' }).split('\n')) {
  const m = line.match(/^([A-Z_]+)="?(.*?)"?$/)
  if (m) env[m[1]] = m[2]
}
if (!env.API_URL || !env.ANON_KEY) throw new Error('El stack local no está corriendo. En inglobal-site: `npm run db:local:up`.')
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(env.API_URL)) throw new Error(`Abortado: ${env.API_URL} no es local.`)

const emulator = process.argv.includes('--emulator')
const lan = Object.values(networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address
const host = emulator ? '10.0.2.2' : lan ?? 'localhost'
const siteUrl = `http://${host}:${process.env.SITE_PORT ?? '3200'}`
const supabaseUrl = env.API_URL.replace('127.0.0.1', host)

console.log(`[start:local] API del sitio ${siteUrl}  ·  Supabase ${supabaseUrl}`)
console.log('[start:local] Cuentas de prueba: ver inglobal-site/.ai/context/ENVIRONMENTS.md')

const args = process.argv.slice(2).filter((a) => a !== '--emulator')
const child = spawn('npx', ['expo', 'start', ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_PUBLIC_API_BASE_URL: siteUrl,
    EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: env.ANON_KEY,
  },
})
child.on('exit', (code) => process.exit(code ?? 0))
