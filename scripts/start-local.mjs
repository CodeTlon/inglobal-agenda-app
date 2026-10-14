#!/usr/bin/env node
// `npm run start:local`: Expo contra el sitio LOCAL de ../inglobal-site (Postgres + MinIO propios).
// Inyecta las variables al proceso (tienen prioridad sobre .env.local), así que NO toca tu
// .env.local ni puede escribir contra homologación o producción.
//
// Requisitos (en ../inglobal-site): `npm run db:up`, `npm run db:local:setup` y `npm run dev:local`.
// Celular físico: usa la IP de tu PC en la red (celular y PC en el mismo Wi-Fi).
// Emulador Android: `npm run start:local -- --emulator` (usa 10.0.2.2).
import { spawn } from 'node:child_process'
import { networkInterfaces } from 'node:os'

const emulator = process.argv.includes('--emulator')
const lan = Object.values(networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address
const host = emulator ? '10.0.2.2' : lan ?? 'localhost'
const siteUrl = `http://${host}:${process.env.SITE_PORT ?? '3200'}`

console.log(`[start:local] API del sitio ${siteUrl}`)
console.log('[start:local] Cuentas de prueba: ver inglobal-site/.ai/context/ENVIRONMENTS.md')

const args = process.argv.slice(2).filter((a) => a !== '--emulator')
const child = spawn('npx', ['expo', 'start', ...args], {
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_API_BASE_URL: siteUrl },
})
child.on('exit', (code) => process.exit(code ?? 0))
