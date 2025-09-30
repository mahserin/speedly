import fs from 'fs'
// const { path } = require('../../app');
export default (configField : string) : {[key : string] : unknown} => {
    const stackPath = new Error().stack?.split('\n')[3].trim().match(/\(.+\)/)?.[0].replace(/([\(\)]|\:\d+\:\d+)/g, '');
    for(let i = 1 ; i < 4 ; i++) {
        const filePath = stackPath?.replace(/\\/g, '/').split('/').slice(0, -i).join('/') + '/speedly.config.js';
        if(fs.existsSync(filePath)) {
            const config = require(filePath);
            if (config && config[configField]) {
                return config[configField];
            }
            return {}
            }
        }
        return {};
    }