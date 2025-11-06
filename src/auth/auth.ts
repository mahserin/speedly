import getConfig from '../util/getConfig'
import { Request , Response , NextFunction } from 'express'
const gConfig = { admin: { role: 'ADMIN', model : '../models/admin' } ,jwtSecretEnv : 'JWT_KEY', customValidator : (req :Request , key : string) => {return true} , ...getConfig('auth') }
type Handler = (req : Request , res : Response , next : (errorMessage? :string) => unknown) => unknown
type AdminArgs = [{ permission: string }, ...Handler[]] | Handler[];

interface UseAuth {
    (req: Request, res: Response, next: NextFunction): any;
    user?: (...handlers: Handler[]) => UseAuth;
    admin?: (...handlers: AdminArgs) => UseAuth;
    any?: (...handlers: Handler[]) => UseAuth;
}

const holders: Partial<UseAuth> = {}
const auth = (config = gConfig ) => {
    // const adminModel = require('../models/admin')
    let handlerState : {[key : string] : {handlers : Handler[]}} = {}
    let useAuth : UseAuth = async (
        req : Request, res : Response, next : NextFunction
    ) => {
        try {
        const nextFunc = (handlers : Handler[], index = 0) => (errorMessage = '') => {
            if (errorMessage) return next(errorMessage)
            if (!handlers.length || !handlers[index + 1]) return next()
            handlers[index + 1](req , res , nextFunc(handlers , index + 1))
        }
        const keys = Object.keys(handlerState);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (!handlerState[key]?.handlers?.length) continue
            if(await gConfig?.customValidator?.(req , key)){
                 return await handlerState[key].handlers[0](req ,res , nextFunc(handlerState[key].handlers))
            }else if(await gConfig?.customValidator?.(req , key) == null){
                return next({status: 401, json: {message: 'unauthorized'}})
            
            }else if (i === keys.length - 1) {
                next({status : 405,json:{message : 'you don\'t have access to this section'}})
            }else continue
        }
        
    } catch (error: unknown) {
        console.log( 'auth' , 42 , error);
           next({status:403,json:{message: (error instanceof Error ? error.message : 'error on authentication please login again')}})
    }
    }
    holders.admin = (...handlers: [ { permission: string }, ...Handler[] ] | Handler[]) => {
        if (!Array.isArray(handlers)) throw new Error('handlers must be an array')
        const hasConfig = typeof handlers[0] === 'object' && 'permission' in handlers[0];
        const configObj = hasConfig ? handlers[0] as { permission: string } : undefined;
        const handlerFns = hasConfig ? (handlers as any[]).slice(1) as Handler[] : handlers as Handler[];
        handlerState[`admin${configObj?.permission ? `:${configObj.permission}` : ''}`] = {
            ...(configObj ? { config: configObj } : {}),
            handlers: handlerFns
        };
        return useAuth
    }
    holders.user = (...handlers : Handler[]) => {
        if (!Array.isArray(handlers)) throw new Error('handlers must be an array')
        handlerState.user = { handlers }
        return useAuth
    }
    holders.any = (...handlers : Handler[]) => {
        if (!Array.isArray(handlers)) throw new Error('handlers must be an array')
        handlerState.any = { handlers }
        return useAuth
    }
    useAuth = Object.assign(useAuth, holders)
    
    return useAuth
}
console.log('auth', 81, typeof auth);
export default auth
