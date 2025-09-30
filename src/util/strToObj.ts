export default (value:string  , falseValue = -1, splitValue = ' ') => {
    return value.split(splitValue).reduce((prev , curr)=> {
        if(curr[0] == '-') return {...prev , [curr.slice(1)] : falseValue}
        return {...prev , [curr] : 1}
    },{})
}