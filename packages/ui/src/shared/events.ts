import type { DeploymentProgressEvent, DeploymentProgressListener } from '../../../shared-types/src/deployment.ts'

export interface DeploymentProgressEmitter {
  emit(event: DeploymentProgressEvent): void
  subscribe(listener: DeploymentProgressListener): () => void
  clear(): void
}

export function createDeploymentProgressEmitter(): DeploymentProgressEmitter {
  const listeners = new Set<DeploymentProgressListener>()

  return {
    emit(event) {
      listeners.forEach((listener) => listener(event))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    clear() {
      listeners.clear()
    }
  }
}
