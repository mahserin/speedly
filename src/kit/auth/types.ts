import { Request , Response , NextFunction } from 'express'

type Handler = (req : Request , res : Response , next : (errorMessage? :string) => unknown) => unknown
type Executer = (authField : string)=>(req: Request, res: Response, next: NextFunction) => unknown
type Auth = {
    user : () => Handler,
    admin : (config?:{ permission: string }) => Handler,
    any : ()=>Handler
}
type ConfigType = {
    customValidator?: (req: Request, key: string) => Promise<boolean | null>
    jwtSecretEnv?: string,
    admin?: { role: string, model: string }
}
export { Handler , Executer , Auth , ConfigType }