import fs from 'fs'
// const { path } = require('../../app');
import { cosmiconfigSync } from 'cosmiconfig';
export default (configField: string): { [key: string]: unknown } => {
    const explorer = cosmiconfigSync("speedly"); // اسم پروژه‌ت
    const result = explorer.search(process.cwd());

    if (result && result.config && result.config[configField]) {
        return result.config[configField];
    }
    else return {}
}