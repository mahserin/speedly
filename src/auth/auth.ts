import { Request, Response, NextFunction } from 'express'
import getConfig from '../util/getConfig'

// ==================== TYPES ====================

type Handler = (req: Request, res: Response, next: (errorMessage?: string) => unknown) => unknown

interface UseAuth {
  (req: Request, res: Response, next: NextFunction): Promise<void> | void
  user: (...handlers: Handler[]) => UseAuth
  admin: (...handlers: [{ permission?: string }, ...Handler[]] | Handler[]) => UseAuth
  any: (...handlers: Handler[]) => UseAuth
}

interface AuthConfig {
  admin?: { role: string; model: string }
  jwtSecretEnv?: string
  customValidator?: (req: Request, key: string) => Promise<boolean | null> | boolean | null
}

// ==================== DEFAULT CONFIG ====================

const defaultConfig: AuthConfig = {
  admin: { role: 'ADMIN', model: '../models/admin' },
  jwtSecretEnv: 'JWT_KEY',
  customValidator: async (req, key) => true,
  ...getConfig('auth'),
}

// ==================== FACTORY FUNCTION ====================

const auth = (config: AuthConfig = defaultConfig): UseAuth => {
  const handlerState: Record<string, { handlers: Handler[] }> = {}

  // ===== core middleware =====
  const useAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const nextFunc = (handlers: Handler[], index = 0) => (errorMessage = '') => {
        if (errorMessage) return next(errorMessage)
        if (!handlers[index + 1]) return next()
        handlers[index + 1](req, res, nextFunc(handlers, index + 1))
      }

      const keys = Object.keys(handlerState)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const state = handlerState[key]
        if (!state?.handlers?.length) continue

        const result = await config?.customValidator?.(req, key)

        if (result === true) {
          // authorized → execute chain
          return void (await state.handlers[0](req, res, nextFunc(state.handlers)))
        }
        if (result === null) {
          // explicitly unauthorized
          return void next({ status: 401, json: { message: 'unauthorized' } })
        }

        // if none matched till last one → no access
        if (i === keys.length - 1) {
          return void next({ status: 405, json: { message: "you don't have access to this section" } })
        }
      }

      // fallback: no handler matched
      next({ status: 404, json: { message: 'no valid auth handler found' } })
    } catch (error: unknown) {
      console.error('auth error:', error)
      next({
        status: 403,
        json: {
          message: error instanceof Error ? error.message : 'error on authentication, please login again',
        },
      })
    }
  }

  // ===== helpers =====
  const register = (key: string, handlers: Handler[]) => {
    handlerState[key] = { handlers }
    return useAuth
  }

  useAuth.user = (...handlers: Handler[]) => {
    if (!handlers.length) throw new Error('user() requires at least one handler')
    return register('user', handlers)
  }

  useAuth.any = (...handlers: Handler[]) => {
    if (!handlers.length) throw new Error('any() requires at least one handler')
    return register('any', handlers)
  }

  useAuth.admin = (...handlers: [{ permission?: string }, ...Handler[]] | Handler[]) => {
    if (!handlers.length) throw new Error('admin() requires at least one handler')
    const hasConfig = typeof handlers[0] === 'object' && 'permission' in handlers[0]
    const configObj = hasConfig ? (handlers[0] as { permission?: string }) : undefined
    const handlerFns = hasConfig ? (handlers as any[]).slice(1) as Handler[] : (handlers as Handler[])
    const key = `admin${configObj?.permission ? `:${configObj.permission}` : ''}`
    return register(key, handlerFns)
  }

  return useAuth
}

export default auth
