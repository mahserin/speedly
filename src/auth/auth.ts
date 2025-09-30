import getConfig from '../util/getConfig'
import { Request , Response , NextFunction } from 'express'
const gConfig = { admin: { role: 'ADMIN', model : '../models/admin' } ,jwtSecretEnv : 'JWT_KEY', customValidator : (req :Request , key : string) => {return true} , ...getConfig('auth') }
type Handler = (req : Request , res : Response , next : (errorMessage? :string) => unknown) => unknown
const auth = (config = gConfig ) => {
    // const adminModel = require('../models/admin')
    let handlerState : {[key : string] : {handlers : Handler[]}} = {}
    const useAuth = async (req : Request, res : Response, next : NextFunction) => {
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
        
            // اینجا اگر i === keys.length - 1 باشد یعنی آخرین آیتم هستی
            
        

        // }else if (!req.cookies.AT_SECRET) {
        //     if (!handlerState.user || !handlerState.user?.handlers?.length) return res.status(403).json({ message: 'you dont have access for this section' })
        //     handlerState.user.handlers[0](req ,res , nextFunc(handlerState.user.handlers))
        // }else {
        //     if(!handlerState.admin || !handlerState.admin?.handlers?.length) {
        //         if (!handlerState.user || !handlerState.user?.handlers?.length) return res.status(404).json({ message: 'route not found  :(' })
        //             handlerState.user.handlers[0](req ,res , nextFunc(handlerState.user.handlers))
                
        //     } else {
        //         const tokenPayload = jwt.verify(req.cookies.AT_SECRET , process.env[gConfig.jwtSecretEnv])
        //         const adminDoc = await adminModel.findById(tokenPayload.id)
        //         if(!adminDoc)return res.status(403).json({ message: 'you don\'t have access for this section' })
        //         if(adminDoc.role !='OWNER' && adminDoc.role != config?.admin?.role ) return res.status(403).json({ message: 'you dont have access for this section' })
        //         req.admin = adminDoc
        //         handlerState.admin.handlers[0](req , res , nextFunc(handlerState.admin.handlers))
        //     }
        // }
    } catch (error: unknown) {
        console.log( 'auth' , 42 , error);
           next({status:403,json:{message: (error instanceof Error ? error.message : 'error on authentication please login again')}})
    }
    }

    useAuth.admin = (...handlers: [ { permission: string }, ...Handler[] ] | Handler[]) => {
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
    useAuth.user = (...handlers : Handler[]) => {
        if (!Array.isArray(handlers)) throw new Error('handlers must be an array')
        handlerState.user = { handlers }
        return useAuth
    }
    useAuth.any = (...handlers : Handler[]) => {
        if (!Array.isArray(handlers)) throw new Error('handlers must be an array')
        handlerState.any = { handlers }
        return useAuth
    }
    return useAuth
}

module.exports = auth