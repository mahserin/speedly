import fs from 'fs'
import path from 'path';
const find = (field : string , ...args : string[])  => {
  const rel = path.join.apply(null, [].slice.call(args));
  if(!require?.main?.filename)return {}
  return findStartingWith(path.dirname(require.main.filename), rel,field);
}

const findStartingWith  = (start : string, rel : string , field : string) => {
  const file = path.join(start, rel);
  const formats = ['.ts','.js' , '.json']
  for(const [index , format] of formats.entries()){

      try {
    if(fs.statSync(file + format)) return require(file + format)[field] || {}      
    } catch (err) {
        if(index + 1 != formats.length) continue
        if (path.dirname(start) !== start) {
            return findStartingWith(path.dirname(start), rel,field);
        }
        return {}
    }
}
}
const configGetter =  (configField : string) : {[key : string] : unknown} => {
    const foundData = find(configField , 'speedly.config')
    if(foundData) return foundData
    return {}
}


export default configGetter