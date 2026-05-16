import { appendFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

export async function appendGithubOutput(
  name: string,
  value: unknown,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const outputFile = env.GITHUB_OUTPUT
  if (!outputFile) return
  const normalized = String(value ?? '')
  if (/\r|\n/.test(normalized)) {
    const marker = `__ALEPH_OUTPUT_${randomUUID()}__`
    await appendFile(outputFile, `${name}<<${marker}\n${normalized}\n${marker}\n`)
    return
  }
  await appendFile(outputFile, `${name}=${normalized}\n`)
}

export async function appendGithubSummary(
  lines: string[],
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const summaryFile = env.GITHUB_STEP_SUMMARY
  if (!summaryFile) return
  await appendFile(summaryFile, `${lines.join('\n')}\n`)
}

export function actionLog(
  level: 'notice' | 'warning' | 'error' | string,
  message: string,
  options: {
    githubActions?: boolean
    stderr?: NodeJS.WriteStream
  } = {}
): void {
  const normalizedLevel = ['notice', 'warning', 'error'].includes(level) ? level : 'notice'
  const escaped = String(message).replace(/\r?\n/g, '%0A')
  const stderr = options.stderr ?? process.stderr
  const githubActions = options.githubActions ?? (process.env.GITHUB_ACTIONS === 'true')

  if (githubActions) {
    stderr.write(`::${normalizedLevel}::${escaped}\n`)
  }
  stderr.write(`${message}\n`)
}
